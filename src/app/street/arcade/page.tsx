import { HeroBoard } from "@/components/HeroBoard";
import { requireStreetAccess } from "@/lib/auth/roles";
import { NavBar } from "@/components/NavBar";
import { getViewer } from "@/lib/auth/session";
import { getPlayableVariants } from "@/lib/arcade/variants";
import { TriviaWidget } from "@/components/arcade/trivia-widget";
import { ArcadeLeaderboardWidget } from "@/components/arcade/leaderboard-widget";
import { WordScrambleGame } from "@/components/arcade/word-scramble-game";
import { ReactionTimerGame } from "@/components/arcade/reaction-timer-game";
import { CoinFlipGame } from "@/components/arcade/coin-flip-game";

export const dynamic = "force-dynamic";

/**
 * THE STREET ARCADE (D's correction, this session).
 *
 * The Street had no arcade at all — /block/arcade was the only one, gated at
 * Block. The Street page advertised "Chess, checkers, the basics" and then
 * had nowhere to send anyone. "Just because you're on the street don't mean
 * you don't get to play the game."
 *
 * What's here is the simplest build of each game. The page doesn't decide
 * that — the variants registry does (lib/arcade/variants.ts), and this page
 * renders whatever the registry says a Street viewer can play. So switching
 * a game on for the Street is a data change, not an edit to this file.
 *
 * No tease, deliberately: games the Street doesn't have are not shown as
 * locked tiles. Nothing here tells anyone what they're missing upstairs.
 */

// Registry key -> the already-built playable widget. A registry row with no
// entry here is registered but has no UI yet, and is skipped rather than
// rendered as a broken tile.
const WIDGETS: Record<string, React.ReactNode> = {
  trivia: <TriviaWidget />,
  word_scramble: <WordScrambleGame />,
  reaction_timer: <ReactionTimerGame />,
  coin_flip_streak: <CoinFlipGame />,
};

export default async function StreetArcadePage() {
  const { tier, isAdmin } = await requireStreetAccess();
  const viewer = await getViewer();

  // Resolved for THIS viewer: own-tier build, else the best build below.
  // A Block+ member landing here still sees their own builds, not the
  // Street's — the ladder decides, not the URL.
  const variants = await getPlayableVariants(tier, viewer?.id ?? null);
  const playable = variants.filter((v) => WIDGETS[v.gameKey]);

  return (
    <main>
      <NavBar viewerTier={tier} viewer={viewer} isAdmin={isAdmin} />

      <section style={{ padding: "2rem 2rem 0", maxWidth: "760px" }}>
        <HeroBoard
          kicker="Arcade"
          headline="Everybody plays."
          body="You don't have to be anybody to pick up a game here. No account, no email, no waiting to be let in. Scores land on the same boards as everyone else's — there is no beginners' table."
          steps={[
            {
              title: "Just start",
              body: "Pick a game below and play. Nothing to install, nothing to sign up for.",
            },
            {
              title: "Your score counts",
              body: "It goes on the real board next to everyone else's, from the first game you play.",
            },
            {
              title: "Challenge anyone at your level",
              body: "Or below it — never above. Nobody further in gets disturbed by an invite.",
            },
          ]}
          note="Playing never moves you up a tier, and it never moves you down. Games are games here."
        />
      </section>

      {playable.length === 0 ? (
        <section style={{ padding: "0 2rem 3rem", maxWidth: "720px" }}>
          <p style={{ color: "var(--text-secondary)" }}>
            Nothing's switched on right now. Check back.
          </p>
        </section>
      ) : (
        playable.map((v) => (
          <section key={v.gameKey} style={{ padding: "0 2rem 3rem", maxWidth: "720px" }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem", marginBottom: "0.35rem" }}>
              {v.title}
            </h2>
            {v.blurb && (
              <p style={{ color: "var(--text-secondary)", margin: "0 0 1rem", fontSize: "0.9rem" }}>
                {v.blurb}
              </p>
            )}
            {viewer ? (
              WIDGETS[v.gameKey]
            ) : (
              // Anonymous Street visitors are real members with a device row,
              // but the score routes need a signed-in viewer to attribute to.
              <p style={{ color: "var(--text-secondary)" }}>
                <a href="/sign-in" style={{ color: "var(--accent-gold)" }}>Sign in</a> to
                play and get on the board.
              </p>
            )}
          </section>
        ))
      )}

      <section style={{ padding: "0 2rem 3rem", maxWidth: "720px", display: "grid", gap: "1.5rem" }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem", margin: 0 }}>
          Leaderboards
        </h2>
        {playable.map((v) => (
          <div
            key={v.gameKey}
            style={{
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              padding: "1.25rem",
              background: "var(--surface-1)",
            }}
          >
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.05rem", margin: "0 0 0.75rem" }}>
              {v.title}
            </h3>
            <ArcadeLeaderboardWidget gameKey={v.gameKey} />
          </div>
        ))}
      </section>
    </main>
  );
}
