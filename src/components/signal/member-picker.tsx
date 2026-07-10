"use client";
import { useEffect, useState } from "react";
import styles from "./signal.module.css";

export type PickedMember = { id: string; displayName: string; tier: string };

/**
 * Debounced member search with chip-based multi-select. Used by both
 * NewRoomForm (multi-select, memberIds[]) and KnockForm (single-select,
 * takes the first chip as toMemberId). Search hits /api/members/search,
 * which requires a signed-in viewer and excludes the viewer from results.
 */
export function MemberPicker({
  selected,
  onChange,
  max,
  placeholder = "Search members by name…",
}: {
  selected: PickedMember[];
  onChange: (members: PickedMember[]) => void;
  max?: number;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PickedMember[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/members/search?q=${encodeURIComponent(q)}`);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled) setResults(data.members ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  function add(member: PickedMember) {
    if (selected.some((m) => m.id === member.id)) return;
    if (max && selected.length >= max) return;
    onChange([...selected, member]);
    setQuery("");
    setResults([]);
  }

  function remove(id: string) {
    onChange(selected.filter((m) => m.id !== id));
  }

  const selectable = results.filter((r) => !selected.some((s) => s.id === r.id));

  return (
    <div>
      {selected.length > 0 ? (
        <div className={styles.chipRow}>
          {selected.map((m) => (
            <span key={m.id} className={styles.chip}>
              {m.displayName}
              <button
                type="button"
                className={styles.chipRemove}
                onClick={() => remove(m.id)}
                aria-label={`Remove ${m.displayName}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}
      {!max || selected.length < max ? (
        <>
          <input
            className={styles.input}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
          />
          {query.trim().length >= 2 ? (
            <div className={styles.pickerResults}>
              {loading ? (
                <div className={styles.dim}>Searching…</div>
              ) : selectable.length === 0 ? (
                <div className={styles.dim}>No members found.</div>
              ) : (
                selectable.map((m) => (
                  <button
                    type="button"
                    key={m.id}
                    className={styles.pickerResult}
                    onClick={() => add(m)}
                  >
                    {m.displayName} <span className={styles.dim}>· {m.tier}</span>
                  </button>
                ))
              )}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
