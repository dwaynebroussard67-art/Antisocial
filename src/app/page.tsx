import { ensureAnonymousMember } from "@/lib/auth/anonymous-identity";
import { getMemberTier } from "@/lib/auth/roles";
import { getViewer } from "@/lib/auth/session";
import { NuraPresence } from "@/components/NuraPresence";
import Image from "next/image";
import Link from "next/link";

/**
 * This is the "Antisocial" gate. Two ways in, per your spec:
 *  - a direct/shared link lands here
 *  - the button on Misfit Ministries also lands here
 *
 * IDENTITY ORDER (HANDOFF-32): real auth session first, anonymous cookie
 * second. The gate used to resolve by cookie alone — signed-in members
 * got the right page only because their cookie happened to point at
 * their own upgraded row, and signed-OUT members with a stale cookie got
 * a "Continue to the Block" button the Block itself would refuse. Now:
 *  - session present  -> that member, that tier, Continue.
 *  - no session, cookie points at an auth-linked (upgraded) row -> ghost:
 *    treated as Street, with a welcome-back sign-in as the lead action.
 *  - no session, clean anonymous row -> Street, as always.
 */
export default async function AntisocialGate() {
  const viewer = await getViewer();
  let tier: string;
  let ghost = false; // signed-out, but this device once held an account

  if (viewer) {
    tier = await getMemberTier(viewer.id);
  } else {
    const anon = await ensureAnonymousMember();
    ghost = anon.authLinked;
    tier = ghost ? "street" : await getMemberTier(anon.id);
  }

  return (
    <main style={{ minHeight: "100vh", position: "relative" }}>
      <div style={{ position: "relative", height: "70vh", overflow: "hidden" }}>
        <Image
          src="/images/brand/cross-embrace-wide.jpg"
          alt=""
          fill
          priority
          style={{ objectFit: "cover", objectPosition: "center 20%" }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(180deg, rgba(10,9,8,0.2) 0%, rgba(10,9,8,0.95) 90%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "3rem",
            left: "2rem",
            right: "2rem",
            maxWidth: "640px",
          }}
        >
          <p className="label" style={{ marginBottom: "0.75rem" }}>MISFIT MINISTRIES PRESENTS</p>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(2rem, 5vw, 3.25rem)",
              lineHeight: 1.1,
              margin: 0,
            }}
          >
            Antisocial.
          </h1>
          <p style={{ color: "var(--text-secondary)", marginTop: "1rem", fontSize: "1.05rem" }}>
            Most misfits are antisocial. That's not an insult here — it's how
            you got in the door.
          </p>
          <hr className="hairline" style={{ marginTop: "1.5rem" }} />
        </div>
      </div>

      <div style={{ padding: "2.5rem 2rem", display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "480px" }}>
        {tier === "street" ? (
          <>
            <p style={{ color: "var(--text-secondary)" }}>
              {ghost
                ? "You're signed out. Your account — and everything you built — is right behind the door."
                : "You're in as Street — no email, no questions asked. Look around. You can go deeper whenever you're ready, not before."}
            </p>
            {ghost ? (
              <>
                <Link
                  href="/sign-in"
                  style={{
                    background: "var(--accent-gold)",
                    color: "#14100F",
                    padding: "0.9rem 1.4rem",
                    borderRadius: "var(--radius-md)",
                    textAlign: "center",
                    textDecoration: "none",
                    fontWeight: 600,
                  }}
                >
                  Sign back in
                </Link>
                <Link
                  href="/street"
                  style={{
                    border: "1px solid var(--accent-silver)",
                    color: "var(--accent-silver)",
                    padding: "0.9rem 1.4rem",
                    borderRadius: "var(--radius-md)",
                    textAlign: "center",
                    textDecoration: "none",
                  }}
                >
                  Just walk the Street
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/street"
                  style={{
                    background: "var(--accent-gold)",
                    color: "#14100F",
                    padding: "0.9rem 1.4rem",
                    borderRadius: "var(--radius-md)",
                    textAlign: "center",
                    textDecoration: "none",
                    fontWeight: 600,
                  }}
                >
                  Enter Street
                </Link>
                <Link
                  href="/sign-in"
                  style={{
                    border: "1px solid var(--accent-silver)",
                    color: "var(--accent-silver)",
                    padding: "0.9rem 1.4rem",
                    borderRadius: "var(--radius-md)",
                    textAlign: "center",
                    textDecoration: "none",
                  }}
                >
                  Sign in — get closer to the Block
                </Link>
              </>
            )}
          </>
        ) : (
          <Link
            href={`/${tier}`}
            style={{
              background: "var(--accent-gold)",
              color: "#14100F",
              padding: "0.9rem 1.4rem",
              borderRadius: "var(--radius-md)",
              textAlign: "center",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Continue to {tier === "crib" ? "the Crib" : tier === "pit" ? "the Pit" : "the Block"}
          </Link>
        )}
      </div>

      <NuraPresence />
    </main>
  );
}
