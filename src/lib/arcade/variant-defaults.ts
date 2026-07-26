import type { MemberTier } from "@/lib/auth/roles";

/**
 * THE CANONICAL VARIANT LIST — shared by the seeder and the resolver.
 *
 * This exists because of a fragility in the first cut of the variants work:
 * the Street arcade and every game route were made to read
 * `arcade_game_variants` and nothing else. That meant a deploy where the
 * migration hadn't been applied, or the seed hadn't been re-run, produced a
 * Street arcade reading "Nothing's switched on right now" and four game
 * routes returning 403 — and it would have done the same to the Block's
 * games, which worked fine before and now depended on a table that might
 * be empty.
 *
 * Turning a hardcoded list into a data-driven one is right. Making the
 * feature dead until someone remembers to run a script is not. So:
 *
 *   - If `arcade_game_variants` has rows, the DATABASE WINS, entirely.
 *     That preserves the point of the table — activation is a data change
 *     and an admin toggle, not a deploy.
 *   - If the table is empty or doesn't exist yet, these defaults are used.
 *     A fresh deploy works out of the box; the seed becomes an upgrade
 *     path rather than a prerequisite.
 *
 * The fallback is all-or-nothing on purpose. Merging per-game would mean a
 * variant deliberately switched OFF in the database could be resurrected by
 * a default, which is exactly the kind of surprise an admin toggle must
 * never produce.
 */

export type VariantDefinition = {
  gameKey: string;
  tier: MemberTier;
  variantKey: string;
  title: string;
  blurb: string;
  active: boolean;
  minAge?: number;
  /**
   * Mirrors arcade_games.kind. Carried here as well so the fallback path
   * never has to join arcade_games to be readable — War must not come back
   * mislabelled as a solo-score game just because the registry was empty.
   */
  kind: "solo_score" | "head_to_head" | "multiplayer";
};

export const DEFAULT_VARIANTS: VariantDefinition[] = [
  // ==========================================================================
  // ALREADY LIVE — the Block's existing games. active: true.
  //
  // These four are NOT new activation. They have been playable at Block and
  // above since before the variants registry existed, rendered from a
  // hardcoded list on /block/arcade. The registry now describes them so the
  // game routes have something to resolve, but describing what is already
  // running is not turning anything on. Shipping these OFF would take working
  // games away from the Block, which is a regression, not a safety measure.
  // ==========================================================================
  {
    gameKey: "trivia",
    kind: "solo_score",
    tier: "block",
    variantKey: "trivia_daily",
    title: "Daily Trivia",
    blurb: "One set of questions a day. Same questions for everybody.",
    active: true,
  },
  {
    gameKey: "word_scramble",
    kind: "solo_score",
    tier: "block",
    variantKey: "word_scramble_basic",
    title: "Word Scramble",
    blurb: "Unscramble it before the clock does.",
    active: true,
  },
  {
    gameKey: "reaction_timer",
    kind: "solo_score",
    tier: "block",
    variantKey: "reaction_timer_basic",
    title: "Reaction Timer",
    blurb: "Wait for green. Don't jump early.",
    active: true,
  },
  {
    gameKey: "coin_flip_streak",
    kind: "solo_score",
    tier: "block",
    variantKey: "coin_flip_basic",
    title: "Coin Flip Streak",
    blurb: "Call it. Keep calling it.",
    active: true,
  },
  {
    gameKey: "war",
    kind: "head_to_head",
    tier: "block",
    variantKey: "war_standard",
    title: "War",
    blurb: "Head to head. You can challenge your tier or below, never above.",
    active: true,
  },

  // ==========================================================================
  // NEW SURFACE — ships INACTIVE. Every row below is off.
  //
  // D's instruction, verbatim in intent: ship the registry, the variants,
  // min_age and the admin toggle with everything off. Turning the Street's
  // games on is a separate deliberate act, taken after server-side min_age
  // enforcement has been verified against a real database.
  //
  // The reasoning, kept here because it is the whole point: otherwise a
  // schema PR doubles as a "content is now live to minors" event. The Crib
  // Pac-Man build is cops, cash and a getaway, and it is not something that
  // should go live as a side effect of applying a migration.
  //
  // TO ACTIVATE (a data change, never a deploy):
  //   UPDATE arcade_game_variants SET active = true
  //    WHERE tier = 'street' AND game_key IN
  //      ('trivia','word_scramble','reaction_timer','coin_flip_streak');
  // ==========================================================================

  // --- The Street's builds of the four simple games. OFF. ------------------
  {
    gameKey: "trivia",
    kind: "solo_score",
    tier: "street",
    variantKey: "trivia_daily_street",
    title: "Daily Trivia",
    blurb: "One set of questions a day. Same questions for everybody.",
    active: false,
  },
  {
    gameKey: "word_scramble",
    kind: "solo_score",
    tier: "street",
    variantKey: "word_scramble_street",
    title: "Word Scramble",
    blurb: "Unscramble it before the clock does.",
    active: false,
  },
  {
    gameKey: "reaction_timer",
    kind: "solo_score",
    tier: "street",
    variantKey: "reaction_timer_street",
    title: "Reaction Timer",
    blurb: "Wait for green. Don't jump early.",
    active: false,
  },
  {
    gameKey: "coin_flip_streak",
    kind: "solo_score",
    tier: "street",
    variantKey: "coin_flip_street",
    title: "Coin Flip Streak",
    blurb: "Call it. Keep calling it.",
    active: false,
  },

  // --- Pac-Man: one game, three builds. All OFF, bundles not ported. -------
  {
    gameKey: "pac_man",
    kind: "solo_score",
    tier: "street",
    variantKey: "the_grind",
    title: "The Grind",
    blurb: "Classic 2D. The whole game, nothing extra.",
    active: false,
  },
  {
    gameKey: "pac_man",
    kind: "solo_score",
    tier: "block",
    variantKey: "grind_city",
    title: "Grind City",
    blurb: "The same grind, in three dimensions.",
    active: false,
  },
  {
    gameKey: "pac_man",
    kind: "solo_score",
    tier: "crib",
    variantKey: "trap_man",
    title: "Trap Man",
    blurb: "Police instead of chasers, cash instead of pellets, and a getaway that turns the chase around.",
    active: false,
    // Adults only. min_age is enforced server-side on every read in
    // variants.ts and fails closed. This row must not be switched on until
    // that enforcement has been verified against a real database.
    minAge: 18,
  },
];
