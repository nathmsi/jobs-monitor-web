import { ROLES } from "../../../src/constants/roles";

const escape = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const word = (t: string) => new RegExp(`(^|[^a-z0-9])${escape(t)}($|[^a-z0-9])`, "i");

/** The text an offer is matched on. */
export interface Matchable {
  title: string;
  excerpt: string;
  description?: string | null;
}

/**
 * The rule of the API's discipline filter, for the fake backends of both test levels (the Vitest
 * client mock and the Playwright route mock): strong terms count in the title or the description,
 * ambiguous ones in the title only; whole words only, so "ios" never matches "scenarios".
 * `roles` is one key or several separated by commas: any of them matches.
 */
export function matchesAnyRole(job: Matchable, roles: string): boolean {
  return roles.split(",").some((key) => {
    const role = ROLES.find((r) => r.key === key);
    if (!role) return false;
    const text = `${job.title} ${job.excerpt} ${job.description ?? ""}`;
    return role.strong.some((t) => word(t).test(text)) || role.title.some((t) => word(t).test(job.title));
  });
}
