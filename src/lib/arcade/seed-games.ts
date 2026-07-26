import { db } from "@/lib/db";
import { arcadeGames } from "@/lib/db/schema/arcade-core";
import { arcadeGameVariants } from "@/lib/db/schema/arcade-variants";
import { DEFAULT_VARIANTS } from "./variant-defaults";

// Arcade sub-piece 1 of 6 (see HANDOFF-17 §4.3 and HANDOFF-18).
// mystery/shooter/rpg rows get added in their own sub-pieces, not seeded
// now — an unregistered game_key would just 404 at the leaderboard/score
// routes, which is the correct "not built yet" behavior.
const GAMES = [
  { key: "trivia", name: "Daily Trivia", kind: "solo_score" as const, scoreDirection: "higher_better" as const },
  { key: "word_scramble", name: "Word Scramble", kind: "solo_score" as const, scoreDirection: "higher_better" as const },
  { key: "reaction_timer", name: "Reaction Timer", kind: "solo_score" as const, scoreDirection: "lower_better" as const },
  { key: "coin_flip_streak", name: "Coin Flip Streak", kind: "solo_score" as const, scoreDirection: "higher_better" as const },
  // NEW this session — Arcade sub-piece 2.
  { key: "war", name: "War", kind: "head_to_head" as const, scoreDirection: "higher_better" as const },
  // Pac-Man family (D's correction, this session). One game, three builds —
  // see VARIANTS below. Registered here so the leaderboard/score routes
  // resolve; the builds themselves are content and ship separately.
  { key: "pac_man", name: "Pac-Man", kind: "solo_score" as const, scoreDirection: "higher_better" as const },
];

/**
 * THE STREET GETS GAMES (D's correction, this session).
 *
 * The Street had no arcade at all — the arcade was a Block+ page, and the
 * Street page advertised games it couldn't actually open. That's the thing
 * being fixed: "just because you're on the street don't mean you don't get
 * to play the game."
 *
 * The variant list itself lives in variant-defaults.ts, shared with the
 * resolver. One list, two consumers: seeding it into the database is how you
 * take control of it from the admin side, and the resolver falls back to the
 * same list when the table is empty so the games work before anyone runs
 * this script. They can't drift apart because there's only one of them.
 */
const VARIANTS = DEFAULT_VARIANTS;

export async function seedArcadeGames() {
  await db.insert(arcadeGames).values(GAMES).onConflictDoNothing({ target: arcadeGames.key });

  // onConflictDoUpdate rather than DoNothing: titles, blurbs and age gates
  // are content that gets corrected, and a re-seed should carry corrections
  // through. `active` is deliberately NOT overwritten — once a variant has
  // been switched on or off from the admin side, a re-seed must not undo
  // that. Activation is a data change, not a deploy.
  for (const v of VARIANTS) {
    await db
      .insert(arcadeGameVariants)
      .values({
        gameKey: v.gameKey,
        tier: v.tier,
        variantKey: v.variantKey,
        title: v.title,
        blurb: v.blurb,
        active: v.active,
        minAge: v.minAge ?? null,
      })
      .onConflictDoUpdate({
        target: [arcadeGameVariants.gameKey, arcadeGameVariants.tier],
        set: {
          variantKey: v.variantKey,
          title: v.title,
          blurb: v.blurb,
          minAge: v.minAge ?? null,
          updatedAt: new Date(),
        },
      });
  }

  console.log(
    `[seed:arcade] ensured ${GAMES.length} games, ${VARIANTS.length} tier variants ` +
      `(${VARIANTS.filter((v) => v.tier === "street").length} on the Street)`
  );
}
