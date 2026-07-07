type LedgerEntry = {
  id: string;
  incidentDate: string;
  answered: "unanswered" | "answered";
  outcome: "pending" | "life_saved" | "life_lost" | "unable_to_locate" | "false_alarm";
  approxArea?: string | null;
};

const OUTCOME_LABEL: Record<LedgerEntry["outcome"], string> = {
  pending: "Pending",
  life_saved: "Life saved",
  life_lost: "Life lost",
  unable_to_locate: "Unable to locate",
  false_alarm: "False alarm",
};

/**
 * This is a server-rendered summary + a simple list — deliberately plain.
 * You described this as a place for quiet reflection, not a flashy
 * analytics dashboard. The numbers should feel weighed, not gamified.
 */
export function AlertLedgerBoard({ entries }: { entries: LedgerEntry[] }) {
  const total = entries.length;
  const answered = entries.filter((e) => e.answered === "answered").length;
  const saved = entries.filter((e) => e.outcome === "life_saved").length;
  const lost = entries.filter((e) => e.outcome === "life_lost").length;

  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        background: "var(--surface-1)",
        padding: "1.75rem",
      }}
    >
      <p className="label" style={{ marginBottom: "1.25rem" }}>THE WATCH — every alert, kept</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
        <Stat label="Alerts" value={total} />
        <Stat label="Answered" value={answered} />
        <Stat label="Saved" value={saved} color="var(--success)" />
        <Stat label="Lost" value={lost} color="var(--danger-text)" />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {entries.length === 0 && (
          <p style={{ color: "var(--text-secondary)" }}>No alerts logged yet.</p>
        )}
        {entries.map((e) => (
          <div
            key={e.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "0.6rem 0",
              borderBottom: "1px solid var(--border)",
              fontSize: "0.9rem",
              color: "var(--text-secondary)",
            }}
          >
            <span>{new Date(e.incidentDate).toLocaleDateString()}{e.approxArea ? ` · ${e.approxArea}` : ""}</span>
            <span style={{ color: e.outcome === "life_saved" ? "var(--success)" : e.outcome === "life_lost" ? "var(--danger-text)" : "var(--text-secondary)" }}>
              {OUTCOME_LABEL[e.outcome]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div>
      <div style={{ fontFamily: "var(--font-display)", fontSize: "2rem", color: color ?? "var(--text-primary)" }}>
        {value}
      </div>
      <div className="label">{label}</div>
    </div>
  );
}
