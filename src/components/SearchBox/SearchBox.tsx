import { memo, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";

import { usePopularSearches, useSuggestions } from "../../api/hooks";
import type { Suggestion } from "../../api/client";
import { useRecentSearches, type RecentSearch } from "../../hooks/useRecentSearches";
import { highlightParts } from "../../utils/highlight";
import { CloseIcon, SearchIcon } from "../Icons/Icons";
import styles from "./SearchBox.module.css";

interface Props {
  /** Unique id (also prefixes the ids of the list and its options). */
  id: string;
  value: string;
  onValueChange: (value: string) => void;
  /** The user pressed Enter / the button with free text (possibly empty). */
  onSubmit: (text: string) => void;
  /** The user picked a suggestion (a role, a technology, a company…). */
  onPick: (suggestion: Suggestion) => void;
  label: string;
  placeholder: string;
  variant?: "hero" | "compact";
  /** Text of a visible submit button (hero). */
  submitLabel?: string;
  /** Called when the pointer or focus reaches the submit button (to preload the next page). */
  onSubmitIntent?: () => void;
  /** Accessible name of the "clear" button; omit for no button. */
  clearLabel?: string;
}

type Row =
  | { key: string; group: string; kind: "suggestion"; suggestion: Suggestion }
  | { key: string; group: string; kind: "recent"; recent: RecentSearch };

interface Group {
  id: string;
  heading: string;
  rows: { row: Row; index: number }[];
}

/**
 * Search field with autocomplete (ARIA 1.2 combobox with a listbox popup).
 * Empty: recent searches and popular roles/technologies. Typing: roles,
 * technologies, job titles, companies and places from the API, each with its
 * number of offers. ↑ ↓ move, Enter picks (or searches the typed text), Esc closes.
 */
export const SearchBox = memo(function SearchBox({
  id,
  value,
  onValueChange,
  onSubmit,
  onPick,
  label,
  placeholder,
  variant = "compact",
  submitLabel,
  onSubmitIntent,
  clearLabel,
}: Props) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const { recent, add, clear: clearRecent } = useRecentSearches();

  const typed = value.trim();
  const suggestions = useSuggestions(value, open);
  const popular = usePopularSearches(8, open && typed === "");

  const groups = useMemo<Group[]>(() => {
    const out: Group[] = [];
    let index = 0;
    const push = (id: string, heading: string, rows: Row[]) => {
      if (rows.length) out.push({ id, heading, rows: rows.map((row) => ({ row, index: index++ })) });
    };

    if (typed === "") {
      push(
        "recent",
        t("search.recent"),
        recent.map((r) => ({ key: `recent:${r.kind}:${r.value}`, group: "recent", kind: "recent", recent: r })),
      );
      push(
        "popular",
        t("search.popular"),
        (popular.data ?? []).map((s) => ({ key: `popular:${s.type}:${s.value}`, group: "popular", kind: "suggestion", suggestion: s })),
      );
    } else {
      // Groups appear in the order of their best match, so the first row is
      // always the best answer (typing "react" → React before the Frontend role).
      const list = suggestions.data ?? [];
      const types = [...new Set(list.map((s) => s.type))];
      for (const type of types) {
        push(
          type,
          t(`search.groups.${type}`),
          list
            .filter((s) => s.type === type)
            .map((s) => ({ key: `${type}:${s.value}`, group: type, kind: "suggestion", suggestion: s })),
        );
      }
    }
    return out;
  }, [typed, recent, popular.data, suggestions.data, t]);

  const rows = useMemo(() => groups.flatMap((g) => g.rows.map((r) => r.row)), [groups]);
  const expanded = open && rows.length > 0;
  const listId = `${id}-list`;
  const optionId = (index: number) => `${id}-option-${index}`;

  const close = () => {
    setOpen(false);
    setActive(-1);
  };

  const choose = (row: Row) => {
    close();
    if (row.kind === "recent") {
      const { recent: r } = row;
      add(r);
      if (r.kind === "role") onPick({ type: "role", label: r.label, value: r.value, count: 0 });
      else {
        onValueChange(r.value);
        onSubmit(r.value);
      }
      return;
    }
    const s = row.suggestion;
    add({ kind: s.type === "role" ? "role" : "text", label: s.label, value: s.value });
    onPick(s);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    close();
    if (typed) add({ kind: "text", label: typed, value: typed });
    onSubmit(typed);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case "ArrowDown":
      case "ArrowUp": {
        e.preventDefault();
        if (!open) return setOpen(true);
        if (rows.length === 0) return;
        const step = e.key === "ArrowDown" ? 1 : -1;
        setActive((i) => (i === -1 ? (step === 1 ? 0 : rows.length - 1) : (i + step + rows.length) % rows.length));
        return;
      }
      case "Enter":
        if (expanded && active >= 0 && rows[active]) {
          e.preventDefault();
          choose(rows[active]);
        }
        return;
      case "Escape":
        if (open) {
          e.preventDefault();
          close();
        }
        return;
    }
  };

  return (
    <form className={`${styles.root} ${variant === "hero" ? styles.hero : styles.compact}`} role="search" onSubmit={submit}>
      <div className={styles.field}>
        <span className={styles.icon} aria-hidden="true"><SearchIcon size={variant === "hero" ? 18 : 14} strokeWidth={2.2} /></span>
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          className={styles.input}
          value={value}
          placeholder={placeholder}
          aria-label={label}
          aria-autocomplete="list"
          aria-expanded={expanded}
          aria-controls={listId}
          aria-activedescendant={expanded && active >= 0 ? optionId(active) : undefined}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          enterKeyHint="search"
          maxLength={200}
          onChange={(e) => {
            onValueChange(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onBlur={close}
          onKeyDown={onKeyDown}
        />
        {clearLabel && value && (
          <button
            type="button"
            className={styles.clear}
            aria-label={clearLabel}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              onValueChange("");
              onSubmit("");
              setActive(-1);
              // The input keeps focus, so reopen the popup (recent / popular).
              setOpen(true);
              inputRef.current?.focus();
            }}
          >
            <CloseIcon size={12} strokeWidth={2.5} />
          </button>
        )}
      </div>

      {submitLabel && (
        <button type="submit" className={styles.submit} onPointerEnter={onSubmitIntent} onFocus={onSubmitIntent}>
          {submitLabel}
        </button>
      )}

      <ul id={listId} className={styles.list} role="listbox" aria-label={t("search.listLabel")} hidden={!expanded}>
        {groups.map((group) => (
          <li key={group.id} role="presentation" className={styles.group}>
            <div className={styles.heading} role="presentation">
              <span>{group.heading}</span>
              {group.id === "recent" && (
                <button
                  type="button"
                  className={styles.clearRecent}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={clearRecent}
                >
                  {t("search.clearRecent")}
                </button>
              )}
            </div>
            <ul role="group" aria-label={group.heading} className={styles.options}>
              {group.rows.map(({ row, index }) => (
                <OptionRow
                  key={row.key}
                  id={optionId(index)}
                  row={row}
                  typed={typed}
                  active={index === active}
                  onChoose={choose}
                  onHover={() => setActive(index)}
                />
              ))}
            </ul>
          </li>
        ))}
      </ul>

      <div className={styles.srOnly} role="status" aria-live="polite">
        {expanded && typed ? t("search.available", { count: rows.length }) : ""}
      </div>
    </form>
  );
});

interface OptionProps {
  id: string;
  row: Row;
  typed: string;
  active: boolean;
  onChoose: (row: Row) => void;
  onHover: () => void;
}

const OptionRow = memo(function OptionRow({ id, row, typed, active, onChoose, onHover }: OptionProps) {
  const label = row.kind === "recent" ? row.recent.label : row.suggestion.label;
  const count = row.kind === "suggestion" ? row.suggestion.count : 0;
  const parts = highlightParts(label, typed);

  return (
    <li
      id={id}
      role="option"
      aria-selected={active}
      className={`${styles.option} ${active ? styles.optionActive : ""}`}
      // Keep the focus in the input while clicking an option.
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => onChoose(row)}
      onMouseMove={onHover}
    >
      <span className={styles.label}>
        {parts.before}
        {parts.match && <strong>{parts.match}</strong>}
        {parts.after}
      </span>
      {count > 0 && <span className={styles.count}>{count}</span>}
    </li>
  );
});
