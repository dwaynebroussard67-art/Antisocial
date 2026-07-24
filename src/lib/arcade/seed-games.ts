import { db } from "@/lib/db";
import { arcadeGames } from "@/lib/db/schema/arcade-core";
import { arcadeGameVariants } from "@/lib/db/schema/arcade-variants";
import type { MemberTier } from "@/lib/auth/roles";

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

type VariantSeed = {
  gameKey: string;
  tier: MemberTier;
  variantKey: string;
  title: string;
  blurb: string;
  active: boolean;
  minAge?: number;
};

/**
 * THE STREET GETS GAMES (D's correction, this session).
 *
 * The Street had no arcade at all — the arcade was a Block+ page, and the
 * Street page advertised games it couldn't actually open. That's the thing
 * being fixed: "just because you're on the street don't mean you don't get
 * to play the game."
 *
 * What the Street gets is the SIMPLEST build of each game — the four
 * solo-score games as they already exist, and the plain 2D Pac-Man. What it
 * doesn't get is the head-to-head and 3D builds, which stay Block and up.
 *
 * `active` is the live switch. Everything the Street can play is turned ON
 * here because turning the Street's games on IS this correction. The
 * Pac-Man builds ship inactive — their bundles don't exist yet, and a live
 * tile pointing at a missing bundle is worse than no tile.
 */
const VARIANTS: VariantSeed[] = [
  // --- The four simple solo games: Street builds, live now. -----------------
  {
    gameKey: "trivia",
    tier: "street",
    variantKey: "trivia_daily",
    title: "Daily Trivia",
    blurb: "One set of questions a day. Same questions for everybody.",
    active: true,
  },
  {
    gameKey: "word_scramble",
    tier: "street",
    variantKey: "word_scramble_basic",
    title: "Word Scramble",
    blurb: "Unscramble it before the clock does.",
    active: true,
  },
  {
    gameKey: "reaction_timer",
    tier: "street",
    variantKey: "reaction_timer_basic",
    title: "Reaction Timer",
    blurb: "Wait for green. Don't jump early.",
    active: true,
  },
  {
    gameKey: "coin_flip_streak",
    tier: "street",
    variantKey: "coin_flip_basic",
    title: "Coin Flip Streak",
    blurb: "Call it. Keep calling it.",
    active: true,
  },

  // --- War: head-to-head, stays a Block game. ------------------------------
  {
    gameKey: "war",
    tier: "block",
    variantKey: "war_standard",
    title: "War",
    blurb: "Head to head. You can challenge your tier or below, never above.",
    active: true,
  },

  // --- Pac-Man: one game, three builds. Inactive until bundles land. -------
  {
    gameKey: "pac_man",
    tier: "street",
    variantKey: "the_grind",
    title: "The Grind",
    blurb: "Classic 2D. The whole game, nothing extra.",
    active: false,
  },
  {
    gameKey: "pac_man",
    tier: "block",
    variantKey: "grind_city",
    title: "Grind City",
    blurb: "The same grind, in three dimensions.",
    active: false,
  },
  {
    gameKey: "pac_man",
    tier: "crib",
    variantKey: "trap_man",
    title: "Trap Man",
    blurb: "Police instead of chasers, cash instead of pellets, and a getaway that turns the chase around.",
    active: false,
    // Adults only. Enforced server-side on every read in lib/arcade/variants.ts,
    // not in the page that draws the tile.
    minAge: 18,
  },
];

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
