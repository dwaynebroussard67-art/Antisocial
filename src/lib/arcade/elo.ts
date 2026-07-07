// PORTED, unchanged from salvage. Standard Elo formula (same math chess
// federations use). K=32 is a conventional choice for volatile, low-game-count
// populations — a community arcade, not professional chess — so ratings move
// meaningfully after a handful of games instead of taking hundreds to settle.
const K_FACTOR = 32;

export function computeEloUpdate(
  ratingA: number,
  ratingB: number,
  outcomeForA: 1 | 0.5 | 0 // 1 = A won, 0.5 = draw, 0 = A lost
): { newRatingA: number; newRatingB: number } {
  const expectedA = 1 / (1 + 10 ** ((ratingB - ratingA) / 400));
  const expectedB = 1 - expectedA;
  const outcomeForB = 1 - outcomeForA;

  return {
    newRatingA: Math.round(ratingA + K_FACTOR * (outcomeForA - expectedA)),
    newRatingB: Math.round(ratingB + K_FACTOR * (outcomeForB - expectedB)),
  };
}
