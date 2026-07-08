// PORTED, unchanged in behavior from salvage. This is the riskiest engine in
// Arcade sub-piece 2 — real edge cases (infinite War, a player running out of
// cards mid-chain) are handled explicitly, not glossed over, and the
// verification script alongside this file is the executable proof, per the
// Witness principle: reasoning through this by hand is not evidence.

export type Suit = "♠" | "♥" | "♦" | "♣";
export type Card = { rank: number; suit: Suit }; // rank: 2-14, 14 = Ace

export type WarState = {
  deckA: Card[];
  deckB: Card[];
  round: number;
  log: string[];
  winnerId: "A" | "B" | "draw" | null;
};

const SUITS: Suit[] = ["♠", "♥", "♦", "♣"];
const MAX_ROUNDS = 1000; // named safeguard against the real, documented infinite-War edge case

export function buildShuffledDecks(): { deckA: Card[]; deckB: Card[] } {
  const deck: Card[] = [];
  for (const suit of SUITS) for (let rank = 2; rank <= 14; rank++) deck.push({ rank, suit });

  // Fisher-Yates, using Math.random — fine for a card game with no money on
  // the line; NOT the choice you'd make if this ever became a real-money
  // gambling feature (it explicitly must not, per the marketplace scoping rule).
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return { deckA: deck.slice(0, 26), deckB: deck.slice(26) };
}

function playWarChain(deckA: Card[], deckB: Card[], pile: Card[]): "A" | "B" | "exhausted-A" | "exhausted-B" {
  // Real edge case: a player with fewer than 4 cards left can't do a full war
  // chain (1 face-down x3 + 1 face-up). House rule applied here: they stake
  // everything they have except their final card, which is their face-up.
  // If they have 0 cards at all, they lose immediately.
  const stakeCount = (deck: Card[]) => Math.max(0, Math.min(3, deck.length - 1));

  if (deckA.length === 0) return "exhausted-A";
  if (deckB.length === 0) return "exhausted-B";

  const stakeA = stakeCount(deckA);
  const stakeB = stakeCount(deckB);
  for (let i = 0; i < stakeA; i++) pile.push(deckA.shift()!);
  for (let i = 0; i < stakeB; i++) pile.push(deckB.shift()!);

  if (deckA.length === 0) return "exhausted-A";
  if (deckB.length === 0) return "exhausted-B";

  const faceUpA = deckA.shift()!;
  const faceUpB = deckB.shift()!;
  pile.push(faceUpA, faceUpB);

  if (faceUpA.rank > faceUpB.rank) return "A";
  if (faceUpB.rank > faceUpA.rank) return "B";
  return playWarChain(deckA, deckB, pile); // another tie — recurse into a deeper war
}

export function playRound(state: WarState): WarState {
  if (state.winnerId) return state; // game already decided, no-op

  const { deckA, deckB } = state;

  if (state.round >= MAX_ROUNDS) {
    // Named safeguard triggered: declare by card count rather than hang forever.
    const winnerId = deckA.length === deckB.length ? "draw" : deckA.length > deckB.length ? "A" : "B";
    return { ...state, winnerId, log: [...state.log, `Round cap (${MAX_ROUNDS}) reached — decided by card count.`] };
  }

  const cardA = deckA.shift();
  const cardB = deckB.shift();

  if (!cardA && !cardB) return { ...state, winnerId: "draw", log: [...state.log, "Both decks exhausted simultaneously."] };
  if (!cardA) return { ...state, winnerId: "B", log: [...state.log, "Player A ran out of cards."] };
  if (!cardB) return { ...state, winnerId: "A", log: [...state.log, "Player B ran out of cards."] };

  const pile: Card[] = [cardA, cardB];
  let roundLog = `Round ${state.round + 1}: A=${cardA.rank}${cardA.suit} vs B=${cardB.rank}${cardB.suit}`;
  let roundWinner: "A" | "B" | "exhausted-A" | "exhausted-B";

  if (cardA.rank > cardB.rank) roundWinner = "A";
  else if (cardB.rank > cardA.rank) roundWinner = "B";
  else {
    roundLog += " — WAR!";
    roundWinner = playWarChain(deckA, deckB, pile);
  }

  const newDeckA = [...deckA];
  const newDeckB = [...deckB];
  if (roundWinner === "A") newDeckA.push(...pile);
  else if (roundWinner === "B") newDeckB.push(...pile);
  // "exhausted-A"/"exhausted-B" fall through to the game-over check below,
  // pile cards are irrelevant since the game ends here.

  const nextState: WarState = {
    deckA: newDeckA,
    deckB: newDeckB,
    round: state.round + 1,
    log: [...state.log, roundLog],
    winnerId: null,
  };

  if (roundWinner === "exhausted-A" || (newDeckA.length === 0 && newDeckB.length > 0)) return { ...nextState, winnerId: "B" };
  if (roundWinner === "exhausted-B" || (newDeckB.length === 0 && newDeckA.length > 0)) return { ...nextState, winnerId: "A" };

  return nextState;
}
