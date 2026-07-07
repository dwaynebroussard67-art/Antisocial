// Run with: npx tsx scripts/test-war-engine.mjs
// (or: npm install first if this is a fresh checkout — devDependencies
// already include tsx, no new dependency needed for this script)
//
// This is the concrete, executable check for the riskiest logic in this
// pass — per the Witness principle, this is what turns "I traced it by
// hand" into an actual recorded observation once you run it.

import { buildShuffledDecks, playRound } from "../src/lib/arcade/war/engine.ts";

let failed = false;
const fail = (msg) => {
  console.error(`FAIL: ${msg}`);
  failed = true;
};

// --- Test 1: a full game terminates and total cards stay conserved ---
{
  const { deckA, deckB } = buildShuffledDecks();
  let state = { deckA, deckB, round: 0, log: [], winnerId: null };
  let iterations = 0;

  while (!state.winnerId && iterations < 2000) {
    state = playRound(state);
    iterations++;
  }

  console.log(`Test 1: finished after ${iterations} rounds. Winner: ${state.winnerId}`);
  if (!state.winnerId) {
    fail("game did not terminate within 2000 iterations — the round cap safeguard did not work");
  } else {
    console.log("Test 1 OK: game terminated within the iteration bound");
  }

  const total = state.deckA.length + state.deckB.length;
  if (total !== 52 && state.winnerId !== "draw") {
    fail(`card count doesn't sum to 52 — cards were lost or duplicated. Total: ${total}`);
  } else {
    console.log(`Test 1 OK: card accounting consistent (${total} cards accounted for)`);
  }
}

// --- Test 2: MAX_ROUNDS safeguard actually fires and picks a real winner ---
// Force a state that's already at the round cap boundary and confirm the
// engine resolves by card count instead of looping forever or crashing.
{
  const state = {
    deckA: Array.from({ length: 30 }, (_, i) => ({ rank: (i % 13) + 2, suit: "♠" })),
    deckB: Array.from({ length: 22 }, (_, i) => ({ rank: (i % 13) + 2, suit: "♥" })),
    round: 1000,
    log: [],
    winnerId: null,
  };
  const result = playRound(state);
  if (result.winnerId !== "A") {
    fail(`expected round-cap safeguard to award the larger deck (A, 30 cards) the win, got ${result.winnerId}`);
  } else {
    console.log("Test 2 OK: round-cap safeguard resolved by card count, larger deck won");
  }
}

// --- Test 3: a player who runs out of cards mid-war-chain loses cleanly ---
// Deck B has fewer than 4 cards remaining after the initial tie draw, so the
// war-chain "stake what you have" house rule and the exhaustion path both
// get exercised in one deterministic case.
{
  const state = {
    deckA: [
      { rank: 5, suit: "♠" }, { rank: 3, suit: "♠" }, { rank: 4, suit: "♠" },
      { rank: 6, suit: "♠" }, { rank: 7, suit: "♠" },
    ],
    deckB: [
      { rank: 5, suit: "♥" }, // ties deckA's first card -> forces a war
      { rank: 2, suit: "♥" },
    ],
    round: 0,
    log: [],
    winnerId: null,
  };
  const result = playRound(state);
  if (result.winnerId !== "A") {
    fail(`expected player A to win when B is exhausted mid-war-chain, got ${result.winnerId}`);
  } else {
    console.log("Test 3 OK: exhaustion-during-war-chain resolved correctly, no crash, no hang");
  }
}

if (failed) process.exit(1);
console.log("PASS: all War engine invariants held.");
