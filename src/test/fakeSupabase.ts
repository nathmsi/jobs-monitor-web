/**
 * Minimal in-memory stand-in for the parts of supabase-js the app uses
 * (`from(table).select/insert/upsert/delete` with `eq`/`match`/`order`/
 * `single`/`maybeSingle`). Rows live in plain arrays so tests can seed and
 * inspect them, and individual operations can be made to fail.
 */

type Row = Record<string, unknown>;
type Op = "select" | "insert" | "upsert" | "delete";
type Result = { data: unknown; error: { message: string } | null };

export interface RecordedCall {
  table: string;
  op: Op;
  payload?: unknown;
}

class Query implements PromiseLike<Result> {
  private op: Op = "select";
  private filters: Array<[string, unknown]> = [];
  private payload: Row | undefined;
  private conflict: string[] = [];
  private mode: "many" | "one" | "maybe" = "many";
  private ordering: { column: string; ascending: boolean } | null = null;

  private readonly db: FakeSupabase;
  private readonly table: string;

  constructor(db: FakeSupabase, table: string) {
    this.db = db;
    this.table = table;
  }

  select(): this {
    return this;
  }
  insert(row: Row): this {
    this.op = "insert";
    this.payload = row;
    return this;
  }
  upsert(row: Row, opts?: { onConflict?: string }): this {
    this.op = "upsert";
    this.payload = row;
    this.conflict = (opts?.onConflict ?? "").split(",").filter(Boolean);
    return this;
  }
  delete(): this {
    this.op = "delete";
    return this;
  }
  eq(column: string, value: unknown): this {
    this.filters.push([column, value]);
    return this;
  }
  match(values: Row): this {
    for (const [c, v] of Object.entries(values)) this.filters.push([c, v]);
    return this;
  }
  order(column: string, opts?: { ascending?: boolean }): this {
    this.ordering = { column, ascending: opts?.ascending ?? true };
    return this;
  }
  single(): this {
    this.mode = "one";
    return this;
  }
  maybeSingle(): this {
    this.mode = "maybe";
    return this;
  }

  then<A = Result, B = never>(
    onfulfilled?: ((value: Result) => A | PromiseLike<A>) | null,
    onrejected?: ((reason: unknown) => B | PromiseLike<B>) | null,
  ): PromiseLike<A | B> {
    return Promise.resolve(this.execute()).then(onfulfilled, onrejected);
  }

  private matches(row: Row): boolean {
    return this.filters.every(([c, v]) => row[c] === v);
  }

  private execute(): Result {
    this.db.calls.push({ table: this.table, op: this.op, payload: this.payload });
    const failure = this.db.failures.get(`${this.table}:${this.op}`);
    if (failure) return { data: null, error: { message: failure } };

    const rows = this.db.rows(this.table);
    switch (this.op) {
      case "select": {
        let found = rows.filter((r) => this.matches(r));
        if (this.ordering) {
          const { column, ascending } = this.ordering;
          found = [...found].sort((a, b) => String(a[column]).localeCompare(String(b[column])) * (ascending ? 1 : -1));
        }
        return this.shape(found);
      }
      case "insert": {
        const row: Row = {
          id: `id-${this.db.nextId++}`,
          created_at: new Date(2026, 0, this.db.nextId).toISOString(),
          ...this.payload,
        };
        rows.push(row);
        return this.shape([row]);
      }
      case "upsert": {
        const payload = this.payload ?? {};
        const existing = rows.find((r) => this.conflict.every((c) => r[c] === payload[c]));
        if (existing) Object.assign(existing, payload);
        else rows.push({ ...payload });
        return { data: null, error: null };
      }
      case "delete": {
        const keep = rows.filter((r) => !this.matches(r));
        this.db.tables.set(this.table, keep);
        return { data: null, error: null };
      }
    }
  }

  private shape(found: Row[]): Result {
    if (this.mode === "many") return { data: found, error: null };
    if (this.mode === "maybe") return { data: found[0] ?? null, error: null };
    return found[0]
      ? { data: found[0], error: null }
      : { data: null, error: { message: "no rows" } };
  }
}

export class FakeSupabase {
  /** Enough of `supabase.auth` for AuthProvider to mount (always signed out). */
  auth = {
    getSession: async () => ({ data: { session: null } }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signInWithOAuth: async () => ({ error: null }),
    signOut: async () => ({ error: null }),
  };
  tables = new Map<string, Row[]>();
  failures = new Map<string, string>();
  calls: RecordedCall[] = [];
  nextId = 1;

  rows(table: string): Row[] {
    let r = this.tables.get(table);
    if (!r) {
      r = [];
      this.tables.set(table, r);
    }
    return r;
  }

  /** Seed a table (replaces its rows). */
  seed(table: string, rows: Row[]): void {
    this.tables.set(table, rows.map((r) => ({ ...r })));
  }

  /** Make `op` on `table` fail with `message`. */
  fail(table: string, op: Op, message = "boom"): void {
    this.failures.set(`${table}:${op}`, message);
  }

  reset(): void {
    this.tables.clear();
    this.failures.clear();
    this.calls = [];
    this.nextId = 1;
  }

  from(table: string): Query {
    return new Query(this, table);
  }
}

export const fakeSupabase = new FakeSupabase();
