// Run with: npx tsx scripts/test-mystery-redaction.mjs
//
// Concrete, executable check for the Mystery engine + redact.ts pairing.
// Per this project's stated principle, tracing this by hand isn't evidence —
// this is what turns it into a recorded observation.

import {
  initializeGame,
  makeSuggestion,
  resolveDisprove,
  makeAccusation,
  SUSPECTS,
  TOOLS,
  LOCATIONS,
} from "../src/lib/arcade/mystery/engine.ts";
import { redactStateForViewer } from "../src/lib/arcade/mystery/redact.ts";

let failed = false;
const fail = (msg) => {
  console.error(`FAIL: ${msg}`);
  failed = true;
};

// --- Test 1: deal integrity — every non-solution card dealt exactly once ---
{
  const players = ["p1", "p2", "p3", "p4"];
  const state = initializeGame(players);

  const allCards = [
    ...SUSPECTS.map((n) => `suspect:${n}`),
    ...TOOLS.map((n) => `tool:${n}`),
    ...LOCATIONS.map((n) => `location:${n}`),
  ];
  const solutionIds = [
    `suspect:${state.solution.suspect}`,
    `tool:${state.solution.tool}`,
    `location:${state.solution.location}`,
  ];
  const dealt = state.players.flatMap((p) => p.hand);

  if (dealt.length !== allCards.length - 3) {
    fail(`expected ${allCards.length - 3} dealt cards, got ${dealt.length}`);
  } else {
    console.log(`Test 1 OK: ${dealt.length} cards dealt (18 total - 3 solution)`);
  }

  const dealtSet = new Set(dealt);
  if (dealtSet.size !== dealt.length) {
    fail("a card was dealt to more than one player — duplicate in hands");
  } else {
    console.log("Test 1 OK: no card dealt twice");
  }

  const overlap = dealt.filter((c) => solutionIds.includes(c));
  if (overlap.length > 0) {
    fail(`solution card(s) leaked into a player hand: ${overlap.join(", ")}`);
  } else {
    console.log("Test 1 OK: solution cards never dealt to a player");
  }

  // hand sizes should differ by at most 1 (15 cards / 4 players)
  const sizes = state.players.map((p) => p.hand.length);
  if (Math.max(...sizes) - Math.min(...sizes) > 1) {
    fail(`hand sizes too uneven: ${sizes.join(", ")}`);
  } else {
    console.log(`Test 1 OK: hand sizes balanced (${sizes.join(", ")})`);
  }
}

// --- Test 2: player-count bounds are enforced ---
{
  try {
    initializeGame(["p1", "p2"]);
    fail("expected initializeGame to throw for 2 players (min is 3)");
  } catch {
    console.log("Test 2 OK: rejects under 3 players");
  }
  try {
    initializeGame(["p1", "p2", "p3", "p4", "p5", "p6", "p7"]);
    fail("expected initializeGame to throw for 7 players (max is 6)");
  } catch {
    console.log("Test 2 OK: rejects over 6 players");
  }
}

// --- Test 3: suggestion correctly finds the first disprover in seat order,
//     and correctly finds NO disprover when no one holds a matching card ---
{
  // Hand-construct state instead of relying on random deal, so the
  // "first active player clockwise who holds a matching card" rule is
  // actually exercised deterministically.
  const baseState = {
    solution: { suspect: SUSPECTS[0], tool: TOOLS[0], location: LOCATIONS[0] },
    players: [
      { memberId: "p1", seatOrder: 0, hand: [`suspect:${SUSPECTS[1]}`], status: "active" },
      { memberId: "p2", seatOrder: 1, hand: [`tool:${TOOLS[4]}`], status: "active" }, // no match
      { memberId: "p3", seatOrder: 2, hand: [`suspect:${SUSPECTS[1]}`, `location:${LOCATIONS[1]}`], status: "active" }, // matches suspect
      { memberId: "p4", seatOrder: 3, hand: [], status: "active" },
    ],
    currentTurnSeat: 0,
    pendingDisprove: null,
    log: [],
    turnCount: 0,
    gameOver: false,
    winnerId: null,
  };

  const result = makeSuggestion(baseState, "p1", SUSPECTS[1], TOOLS[2], LOCATIONS[3]);
  if (!result.ok) fail(`suggestion unexpectedly failed: ${JSON.stringify(result)}`);
  else if (!result.state.pendingDisprove) fail("expected a pending disprove — p2 holds no match but p3 does, in that seat order");
  else if (result.state.pendingDisprove.disproverId !== "p3") {
    fail(`expected p3 to be the disprover (first clockwise seat holding a match, seat 2), got ${result.state.pendingDisprove.disproverId}`);
  } else if (result.state.pendingDisprove.candidateCardIds.length !== 1 || result.state.pendingDisprove.candidateCardIds[0] !== `suspect:${SUSPECTS[1]}`) {
    fail(`expected exactly one candidate card (the suspect match), got ${JSON.stringify(result.state.pendingDisprove.candidateCardIds)}`);
  } else {
    console.log("Test 3 OK: disprove correctly skips non-matching p2 and lands on matching p3");
  }

  // No one holds any of the suggested cards -> no disprove, turn advances.
  const noMatchState = { ...baseState, players: baseState.players.map((p) => ({ ...p, hand: [] })) };
  const noMatchResult = makeSuggestion(noMatchState, "p1", SUSPECTS[2], TOOLS[3], LOCATIONS[4]);
  if (!noMatchResult.ok) fail(`unmatched suggestion unexpectedly failed: ${JSON.stringify(noMatchResult)}`);
  else if (noMatchResult.state.pendingDisprove !== null) fail("expected no pending disprove when no hand matches");
  else if (noMatchResult.state.currentTurnSeat !== 1) fail(`expected turn to advance to seat 1, got ${noMatchResult.state.currentTurnSeat}`);
  else console.log("Test 3 OK: no-match suggestion advances turn cleanly with no disprove");
}

// --- Test 4: resolveDisprove rejects the wrong player, accepts the right one ---
{
  const state = {
    solution: { suspect: SUSPECTS[0], tool: TOOLS[0], location: LOCATIONS[0] },
    players: [
      { memberId: "p1", seatOrder: 0, hand: [], status: "active" },
      { memberId: "p2", seatOrder: 1, hand: [], status: "active" },
      { memberId: "p3", seatOrder: 2, hand: [`suspect:${SUSPECTS[1]}`], status: "active" },
    ],
    currentTurnSeat: 0,
    pendingDisprove: { suggestionIndex: 0, suggesterId: "p1", disproverId: "p3", candidateCardIds: [`suspect:${SUSPECTS[1]}`] },
    log: [],
    turnCount: 0,
    gameOver: false,
    winnerId: null,
  };

  const wrongPlayer = resolveDisprove(state, "p2", `suspect:${SUSPECTS[1]}`);
  if (wrongPlayer.ok) fail("expected resolveDisprove to reject a disprove attempt from the wrong player");
  else console.log("Test 4 OK: rejects disprove from non-designated player");

  const badCard = resolveDisprove(state, "p3", `tool:${TOOLS[3]}`);
  if (badCard.ok) fail("expected resolveDisprove to reject a card the disprover isn't offering as a candidate");
  else console.log("Test 4 OK: rejects a card not in candidateCardIds");

  const good = resolveDisprove(state, "p3", `suspect:${SUSPECTS[1]}`);
  if (!good.ok) fail(`expected valid disprove resolution to succeed: ${JSON.stringify(good)}`);
  else if (good.state.pendingDisprove !== null) fail("expected pendingDisprove to clear after resolution");
  else if (good.state.currentTurnSeat !== 1) fail(`expected turn to advance to seat 1 (next active after suggester), got ${good.state.currentTurnSeat}`);
  else console.log("Test 4 OK: valid disprove clears pending state and advances turn correctly");
}

// --- Test 5: accusation — correct solution wins immediately, wrong solution eliminates ---
{
  const state = {
    solution: { suspect: SUSPECTS[0], tool: TOOLS[0], location: LOCATIONS[0] },
    players: [
      { memberId: "p1", seatOrder: 0, hand: [], status: "active" },
      { memberId: "p2", seatOrder: 1, hand: [], status: "active" },
    ],
    currentTurnSeat: 0,
    pendingDisprove: null,
    log: [],
    turnCount: 0,
    gameOver: false,
    winnerId: null,
  };

  const wrong = makeAccusation(state, "p1", SUSPECTS[1], TOOLS[1], LOCATIONS[1]);
  if (!wrong.ok) fail(`wrong accusation call unexpectedly failed: ${JSON.stringify(wrong)}`);
  else {
    const p1After = wrong.state.players.find((p) => p.memberId === "p1");
    if (p1After.status !== "eliminated") fail("expected p1 to be eliminated after a wrong accusation");
    else if (wrong.state.gameOver) fail("expected game to continue — p2 is still active after p1's wrong accusation");
    else if (wrong.state.currentTurnSeat !== 1) fail(`expected turn to pass to p2 (seat 1), got ${wrong.state.currentTurnSeat}`);
    else console.log("Test 5 OK: wrong accusation eliminates accuser, game continues, turn passes on");
  }

  const right = makeAccusation(state, "p1", SUSPECTS[0], TOOLS[0], LOCATIONS[0]);
  if (!right.ok) fail(`correct accusation call unexpectedly failed: ${JSON.stringify(right)}`);
  else if (!right.state.gameOver || right.state.winnerId !== "p1") {
    fail(`expected correct accusation to end the game with p1 as winner, got gameOver=${right.state.gameOver} winnerId=${right.state.winnerId}`);
  } else {
    console.log("Test 5 OK: correct accusation ends the game with the accuser as winner");
  }

  // last active player standing alone should also end the game (checked via
  // nextActiveSeat returning null after everyone else is eliminated)
  const soloState = {
    ...state,
    players: [
      { memberId: "p1", seatOrder: 0, hand: [], status: "eliminated" },
      { memberId: "p2", seatOrder: 1, hand: [], status: "active" },
    ],
    currentTurnSeat: 1,
  };
  const soloWrong = makeAccusation(soloState, "p2", SUSPECTS[1], TOOLS[1], LOCATIONS[1]);
  if (!soloWrong.ok) fail(`solo wrong accusation unexpectedly failed: ${JSON.stringify(soloWrong)}`);
  else if (!soloWrong.state.gameOver) fail("expected game to end when the last active player accuses incorrectly and no one remains");
  else console.log("Test 5 OK: game ends cleanly when the last active player is wrong (no active seats left)");
}

// --- Test 6: redaction never leaks hands, solution, or another viewer's
//     disprove candidates ---
{
  const state = {
    solution: { suspect: SUSPECTS[0], tool: TOOLS[0], location: LOCATIONS[0] },
    players: [
      { memberId: "p1", seatOrder: 0, hand: [`suspect:${SUSPECTS[1]}`, `tool:${TOOLS[1]}`], status: "active" },
      { memberId: "p2", seatOrder: 1, hand: [`location:${LOCATIONS[1]}`], status: "active" },
      { memberId: "p3", seatOrder: 2, hand: [`suspect:${SUSPECTS[2]}`], status: "active" },
    ],
    currentTurnSeat: 0,
    pendingDisprove: { suggestionIndex: 0, suggesterId: "p1", disproverId: "p3", candidateCardIds: [`suspect:${SUSPECTS[2]}`] },
    log: [],
    turnCount: 1,
    gameOver: false,
    winnerId: null,
  };

  const forOutsider = redactStateForViewer(state, "p2");
  const forOutsiderJson = JSON.stringify(forOutsider);
  if (forOutsiderJson.includes(SUSPECTS[1]) || forOutsiderJson.includes(TOOLS[1])) {
    fail("p1's hand leaked into p2's redacted view");
  } else if (forOutsider.pendingDisprove.candidateCardIds.length !== 0) {
    fail("candidateCardIds leaked to a viewer who is not the disprover");
  } else if (forOutsider.solution !== null) {
    fail("solution leaked before game over");
  } else if (JSON.stringify(forOutsider.yourHand) !== JSON.stringify([`location:${LOCATIONS[1]}`])) {
    fail(`p2's own hand not returned correctly: ${JSON.stringify(forOutsider.yourHand)}`);
  } else {
    console.log("Test 6 OK: outsider view leaks nothing — no hands, no candidates, no solution");
  }

  const forDisprover = redactStateForViewer(state, "p3");
  if (forDisprover.pendingDisprove.candidateCardIds.length !== 1) {
    fail("disprover should see their own candidate cards, but they were withheld");
  } else {
    console.log("Test 6 OK: the actual disprover correctly sees their own candidate cards");
  }

  const finishedState = { ...state, gameOver: true, winnerId: "p1" };
  const forViewerAfterEnd = redactStateForViewer(finishedState, "p2");
  if (forViewerAfterEnd.solution === null) {
    fail("solution should be revealed once gameOver is true");
  } else {
    console.log("Test 6 OK: solution correctly revealed after game over");
  }

  // handSize must reflect real hand length for every player, never the hand itself
  const anyHandLeak = forOutsider.players.some((p) => "hand" in p);
  if (anyHandLeak) fail("a raw `hand` field leaked into the redacted players array");
  else console.log("Test 6 OK: players array exposes handSize only, never raw hand contents");
}

if (failed) process.exit(1);
console.log("PASS: all Mystery engine + redaction invariants held.");
