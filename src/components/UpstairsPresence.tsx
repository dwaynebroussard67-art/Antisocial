import type { MemberTier } from "@/lib/auth/roles";
import { getUpstairsPresence } from "@/lib/tiers/peek-presence";

const TIER_LABEL: Record<MemberTier, string> = {
  street: "the Street",
  block: "the Block",
  crib: "the Crib",
  pit: "the Pit",
};

/**
 * The one-level-up peek, rendered.
 *
 * Server component on purpose — the upstairs roster is fetched and shaped
 * server-side (no member ids ever reach the browser, see peek-presence.ts),
 * so there is no client bundle holding a list of people it isn't allowed to
 * address.
 *
 * Nothing here is a link, a button, or a form. It reads as a window, not a
 * directory, because that's exactly what it is.
 */
export async function UpstairsPresence({ viewerTier }: { viewerTier: MemberTier }) {
  const peek = await getUpstairsPresence(viewerTier);
  if (!peek) return null; // Pit — nothing above it.

  const activeCount = peek.rows.filter((r) => r.active).length;

  return (
    <section
      style={{
        margin: "0 2rem 3rem",
        maxWidth: "720px",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        padding: "1.25rem",
        background: "var(--surface-1)",
      }}
    >
      <p className="label" style={{ color: `var(--tier-${peek.tier})`, margin: 0 }}>
        UPSTAIRS · {TIER_LABEL[peek.tier].toUpperCase()}
      </p>

      <h3
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "1.1rem",
          margin: "0.5rem 0 0",
        }}
      >
        {activeCount > 0
          ? `${activeCount} ${activeCount === 1 ? "person is" : "people are"} up there right now`
          : "Quiet up there right now"}
      </h3>

      <p style={{ color: "var(--text-secondary)", marginTop: "0.5rem", lineHeight: 1.5 }}>
        You can see they're here. That's all — you can't read {TIER_LABEL[peek.tier]} and
        you can't call up to it. Nobody gets disturbed from below.
      </p>

      {peek.rows.length === 0 ? (
        <p style={{ color: "var(--text-secondary)", marginTop: "1rem", fontStyle: "italic" }}>
          Nobody's up there yet.
        </p>
      ) : (
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: "1rem 0 0",
            display: "flex",
            flexWrap: "wrap",
            gap: "0.5rem",
          }}
        >
          {peek.rows.map((row, i) => (
            <li
              key={`${row.displayName}-${i}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.45rem",
                border: "1px solid var(--border)",
                borderRadius: "999px",
                padding: "0.3rem 0.7rem",
                fontSize: "0.85rem",
                color: row.active ? "var(--text-primary)" : "var(--text-secondary)",
                opacity: row.active ? 1 : 0.55,
                // No cursor change, no hover state: nothing here is actionable.
                userSelect: "none",
              }}
            >
              <span
                aria-hidden
                style={{
                  width: "7px",
                  height: "7px",
                  borderRadius: "50%",
                  background: row.active ? `var(--tier-${peek.tier})` : "var(--text-secondary)",
                  flexShrink: 0,
                }}
              />
              {row.displayName}
              <span className="sr-only">{row.active ? " (active)" : " (away)"}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
