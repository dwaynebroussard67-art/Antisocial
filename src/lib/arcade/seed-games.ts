import { db } from "@/lib/db";
import { arcadeGames } from "@/lib/db/schema/arcade-core";

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
];

export async function seedArcadeGames() {
  await db.insert(arcadeGames).values(GAMES).onConflictDoNothing({ target: arcadeGames.key });
  console.log(`[seed:arcade] ensured ${GAMES.length} games registered`);
}
