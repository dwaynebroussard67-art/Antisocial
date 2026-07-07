import Link from "next/link";
import type { MemberTier } from "@/lib/auth/roles";

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
 */
const TIER_ORDER: MemberTier[] = ["street", "block", "crib", "pit"];

export function NavBar({ viewerTier }: { viewerTier: MemberTier }) {
  const viewerRank = TIER_ORDER.indexOf(viewerTier);

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
      </div>
    </nav>
  );
}
