import { redirect } from "next/navigation";
import { requireBlockAccess, AccessDeniedError } from "@/lib/auth/roles";
import { NavBar } from "@/components/NavBar";
import { getViewer } from "@/lib/auth/session";
import { TriviaWidget } from "@/components/arcade/trivia-widget";
import { ArcadeLeaderboardWidget } from "@/components/arcade/leaderboard-widget";
import { WarGame } from "@/components/arcade/war-game";

export const dynamic = "force-dynamic";

// Solo score-board games (see docs/HANDOFF-18.md §1/§3). War is
// head_to_head and rendered separately below via WarGame + its own
// leaderboard block. Chess, Mystery, Shooter, and the RPG aren't
// registered yet — adding their keys here before the games-registry row
// exists would just show "no scores yet" forever, which is confusing
// rather than honest. Add each key here in the same sub-piece session
// that seeds it in seed-games.ts.
const SOLO_SCORE_GAMES = [
  { key: "word_scramble", name: "Word Scramble" },
  { key: "reaction_timer", name: "Reaction Timer" },
  { key: "coin_flip_streak", name: "Coin Flip Streak" },
];

export default async function ArcadePage() {
  let tier;
  try {
    ({ tier } = await requireBlockAccess());
  } catch (err) {
    if (err instanceof AccessDeniedError) redirect("/");
    throw err;
  }

  const viewer = await getViewer();

  // Per docs/HANDOFF.md §2: "Pit: no games here at all." requireBlockAccess()
  // is a floor check and would otherwise let a Pit-tier viewer cascade in —
  // that's correct for doctrine/content pages but wrong here, so the Arcade
  // is the one page that opts out of the normal cascade instead of relying
  // on the generic tier-floor helper.
  if (tier === "pit") {
    redirect("/pit");
  }

  return (
    <main>
      <NavBar viewerTier={tier} viewer={viewer} />

      <section style={{ padding: "2rem", maxWidth: "720px" }}>
        <p className="label" style={{ color: "var(--tier-block)" }}>ARCADE</p>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2rem", marginTop: "0.5rem" }}>
          Play something. Climb a board.
        </h1>
        <p style={{ color: "var(--text-secondary)", marginTop: "1rem", lineHeight: 1.6 }}>
          You can challenge anyone at your tier or below — never above.
          Tier is never bought or won through play.
        </p>
      </section>

      <section style={{ padding: "0 2rem 3rem", maxWidth: "720px" }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem", marginBottom: "1rem" }}>
          Daily Trivia
        </h2>
        <TriviaWidget />
      </section>

      <section style={{ padding: "0 2rem 3rem", maxWidth: "720px" }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem", marginBottom: "1rem" }}>
          War
        </h2>
        {viewer ? (
          <WarGame viewerId={viewer.id} />
        ) : (
          <p style={{ color: "var(--text-secondary)" }}>
            <a href="/sign-in" style={{ color: "var(--accent-gold)" }}>Sign in</a> to
            queue up for head-to-head War.
          </p>
        )}
      </section>

      <section style={{ padding: "0 2rem 3rem", maxWidth: "720px", display: "grid", gap: "2rem" }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem", margin: 0 }}>
          Leaderboards
        </h2>
        <div style={{ display: "grid", gap: "1.5rem" }}>
          <LeaderboardBlock gameKey="trivia" name="Daily Trivia" />
          {SOLO_SCORE_GAMES.map((g) => (
            <LeaderboardBlock key={g.key} gameKey={g.key} name={g.name} />
          ))}
          <LeaderboardBlock gameKey="war" name="War" />
        </div>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
          Chess, Mystery, Shooter, and the RPG aren't built yet — their
          boards will show up here once each is ported (see
          docs/HANDOFF-18.md).
        </p>
      </section>
    </main>
  );
}

function LeaderboardBlock({ gameKey, name }: { gameKey: string; name: string }) {
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "1.25rem", background: "var(--surface-1)" }}>
      <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.05rem", margin: "0 0 0.75rem" }}>{name}</h3>
      <ArcadeLeaderboardWidget gameKey={gameKey} />
    </div>
  );
}
