// PORTED unchanged from salvage — a small, deliberately non-competitive word
// list, not a full dictionary. This is meant to be a 30-second daily
// distraction, not a competitive word game.
export const SCRAMBLE_WORDS = [
  "MERCY", "FAITH", "HARBOR", "COURAGE", "SHELTER",
  "WITNESS", "COVENANT", "REFUGE", "STEADFAST", "KINDNESS",
  "RENEWAL", "PURPOSE",
];

export function scramble(word: string): string {
  const letters = word.split("");
  for (let i = letters.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [letters[i], letters[j]] = [letters[j], letters[i]];
  }
  // Guard against a scramble that happens to equal the original word —
  // rare with longer words but a real bug if left unhandled on a short one.
  const result = letters.join("");
  return result === word ? scramble(word) : result;
}
