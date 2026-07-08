/**
 * You said Nura is already built — I'm not rebuilding her. This component
 * is the seam: it gives her a consistent physical presence on every
 * Antisocial page without re-implementing any of her logic.
 *
 * TWO WIRING OPTIONS, pick whichever matches how she's actually served:
 *  1. If Nura is embeddable (iframe/widget script) from Ministries,
 *     drop that embed inside NuraFrame below.
 *  2. If she's only reachable as a page on Ministries, this renders as a
 *     persistent corner tab that link out to her there instead.
 * Right now it's wired as option 2 (safe default) — swap in the real
 * embed URL/script when you hand me one.
 */

const NURA_URL = "https://misfit-ministries.vercel.app/"; // TODO: replace with direct Nura deep link

export function NuraPresence() {
  return (
    <a
      href={NURA_URL}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        position: "fixed",
        bottom: "1.5rem",
        right: "1.5rem",
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        padding: "0.75rem 1.1rem",
        borderRadius: "var(--radius-lg)",
        background: "var(--surface-2)",
        border: "1px solid var(--accent-gold)",
        color: "var(--accent-gold)",
        textDecoration: "none",
        fontFamily: "var(--font-body)",
        fontSize: "0.85rem",
        letterSpacing: "0.05em",
        boxShadow: "0 0 24px rgba(212, 175, 55, 0.15)",
        zIndex: 50,
      }}
    >
      ✦ Talk to Nura
    </a>
  );
}
