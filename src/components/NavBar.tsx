import Link from "next/link";
import type { MemberTier } from "@/lib/auth/roles";
import type { Viewer } from "@/lib/auth/session";

const TIER_LABEL: Record<MemberTier, string> = {
  street: "Street",
  block: "Block",
  crib: "Crib",
  pit: "The Pit",
};

/**
 * Access is cascading, so the nav only shows links the viewer's tier can
 * actually reach — a Block member never sees a "Crib" link that would just
 * 403 on them. Order is fixed: Street, Block, Crib, Pit.
 *
 * `viewer` is optional so existing call sites don't break, but every page
 * should pass it now that auth is real (HANDOFF-22 §4.5) — it's what
 * drives the Sign in / Sign out link and the Arcade link at Block+.
 */
const TIER_ORDER: MemberTier[] = ["street", "block", "crib", "pit"];

export function NavBar({
  viewerTier,
  viewer,
}: {
  viewerTier: MemberTier;
  viewer?: Viewer | null;
}) {
  const viewerRank = TIER_ORDER.indexOf(viewerTier);
  const canArcade = viewerRank >= TIER_ORDER.indexOf("block") && viewerTier !== "pit";

  return (
    <nav
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "1.25rem 1.5rem",
        borderBottom: "1px solid var(--border)",
        background: "var(--bg)",
      }}
    >
      <Link
        href="/"
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          letterSpacing: "0.08em",
          color: "var(--text-primary)",
          textDecoration: "none",
        }}
      >
        ANTISOCIAL
      </Link>

      <div style={{ display: "flex", gap: "1.25rem", alignItems: "center" }}>
        {TIER_ORDER.map((tier, i) => {
          const reachable = i <= viewerRank;
          return (
            <Link
              key={tier}
              href={reachable ? `/${tier === "pit" ? "pit" : tier}` : "#"}
              aria-disabled={!reachable}
              className="label"
              style={{
                color: reachable ? "var(--text-primary)" : "var(--text-secondary)",
                opacity: reachable ? 1 : 0.35,
                pointerEvents: reachable ? "auto" : "none",
                textDecoration: "none",
                borderBottom: tier === viewerTier ? `2px solid var(--tier-${tier})` : "2px solid transparent",
                paddingBottom: "4px",
              }}
            >
              {TIER_LABEL[tier]}
            </Link>
          );
        })}

        {canArcade && (
          <Link
            href="/block/arcade"
            className="label"
            style={{ color: "var(--text-primary)", textDecoration: "none" }}
          >
            Arcade
          </Link>
        )}

        {/* Signal is for every signed-in member, all tiers — someone in the
            Pit especially must never lose their line out. */}
        {viewer && (
          <Link
            href="/signal"
            className="label"
            style={{ color: "var(--text-primary)", textDecoration: "none" }}
          >
            Signal
          </Link>
        )}

        {viewer ? (
          <form action="/api/auth/signout" method="post">
            <button
              type="submit"
              className="label"
              style={{
                background: "none",
                border: "none",
                color: "var(--text-secondary)",
                cursor: "pointer",
                padding: 0,
                font: "inherit",
                letterSpacing: "0.05em",
              }}
            >
              Sign out
            </button>
          </form>
        ) : (
          <Link
            href="/sign-in"
            className="label"
            style={{ color: "var(--text-secondary)", textDecoration: "none" }}
          >
            Sign in
          </Link>
        )}
      </div>
    </nav>
  );
}
