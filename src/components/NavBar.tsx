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
 *
 * `isAdmin` (HANDOFF-35) is separate from `viewerTier` on purpose.
 * `viewerTier` is only ever "the floor of the page currently rendering
 * this," so using it alone for reachability boxed admins in on every page
 * except /pit. `isAdmin` makes every link reachable regardless of which
 * page happens to be open, while `viewerTier` still drives which link is
 * highlighted as "current."
 */
const TIER_ORDER: MemberTier[] = ["street", "block", "crib", "pit"];

export function NavBar({
  viewerTier,
  viewer,
  isAdmin = false,
}: {
  viewerTier: MemberTier;
  viewer?: Viewer | null;
  isAdmin?: boolean;
}) {
  const viewerRank = TIER_ORDER.indexOf(viewerTier);

  // ARCADE IS NO LONGER BLOCK+ (D's correction, this session). The Street
  // plays too — the simplest builds — so the only tier without an arcade
  // link is the Pit, which has no games at all by doctrine (HANDOFF.md §2).
  // Street viewers go to /street/arcade, Block and Crib to /block/arcade;
  // each page resolves the right BUILD per viewer from the variants
  // registry, so the two URLs are entry points, not separate game sets.
  const canArcade = viewerTier !== "pit" || isAdmin;
  const arcadeHref = viewerTier === "street" ? "/street/arcade" : "/block/arcade";

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
          const reachable = isAdmin || i <= viewerRank;
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
            href={arcadeHref}
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

        {/* Who am I signed in as? Display name if set, else email prefix.
            Tapping it opens /account (HANDOFF-31). */}
        {viewer && (
          <Link
            href="/account"
            className="label"
            style={{ color: "var(--accent-gold)", textDecoration: "none", maxWidth: "9rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
          >
            {viewer.displayName ?? viewer.email?.split("@")[0] ?? "Account"}
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
