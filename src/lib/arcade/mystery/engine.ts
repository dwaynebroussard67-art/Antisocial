// PORTED, unchanged in behavior from salvage. Server-authoritative Cluedo-
// style deduction engine. Pairs with redact.ts, which is the ONLY thing
// allowed to build what a client actually receives — this file's state
// object must never be sent to a client as-is.

export const SUSPECTS = [
  "Mr. Alaric Finch",
  "Ms. Odette Reyes",
  "Professor Callum Wren",
  "Dame Sylvie Okafor",
  "Captain Rian Blackwood",
  "Ms. Priya Vantage",
] as const;

export const TOOLS = [
  "Lockpick",
  "Grappling Hook",
  "Master Key",
  "Smoke Bomb",
  "Crowbar",
  "Forged Documents",
] as const;

export const LOCATIONS = [
  "The Archive",
  "The Gallery",
  "The Rooftop",
  "The Server Room",
  "The Wine Cellar",
  "The Security Office",
] as const;

type CardType = "suspect" | "tool" | "location";

function cardId(type: CardType, name: string): string {
  return `${type}:${name}`;
}

function shuffle<T>(arr: readonly T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export type MysteryPlayerState = {
  memberId: string;
  seatOrder: number;
  hand: string[];
  status: "active" | "eliminated";
};

export type PendingDisprove = {
  suggestionIndex: number;
  suggesterId: string;
  disproverId: string;
  candidateCardIds: string[];
};

export type MysteryLogEntry =
  | { type: "suggestion"; turn: number; suggesterId: string; suspect: string; tool: string; location: string; disprovedBy: string | null }
  | { type: "accusation"; turn: number; accuserId: string; suspect: string; tool: string; location: string; correct: boolean };

export type MysteryEngineState = {
  solution: { suspect: string; tool: string; location: string };
  players: MysteryPlayerState[];
  currentTurnSeat: number;
  pendingDisprove: PendingDisprove | null;
  log: MysteryLogEntry[];
  turnCount: number;
  gameOver: boolean;
  winnerId: string | null;
};

export function initializeGame(memberIds: string[]): MysteryEngineState {
  if (memberIds.length < 3 || memberIds.length > 6) {
    throw new Error("Mystery requires 3-6 players");
  }
  const suspects = shuffle(SUSPECTS);
  const tools = shuffle(TOOLS);
  const locations = shuffle(LOCATIONS);
  const solution = { suspect: suspects[0], tool: tools[0], location: locations[0] };

  const remainingCards = [
    ...suspects.slice(1).map((n) => cardId("suspect", n)),
    ...tools.slice(1).map((n) => cardId("tool", n)),
    ...locations.slice(1).map((n) => cardId("location", n)),
  ];
  const deck = shuffle(remainingCards);
  const seated = shuffle(memberIds);
  const hands: string[][] = seated.map(() => []);
  deck.forEach((card, i) => hands[i % seated.length].push(card));

  const players: MysteryPlayerState[] = seated.map((memberId, i) => ({
    memberId,
    seatOrder: i,
    hand: hands[i],
    status: "active",
  }));

  return { solution, players, currentTurnSeat: 0, pendingDisprove: null, log: [], turnCount: 0, gameOver: false, winnerId: null };
}

export type MysteryActionResult =
  | { ok: true; state: MysteryEngineState }
  | { ok: false; error: "not_found" | "not_your_turn" | "eliminated" | "disprove_pending" | "invalid_card" | "game_over" };

function findPlayer(state: MysteryEngineState, memberId: string) {
  return state.players.find((p) => p.memberId === memberId);
}

// Bound is `step <= n` INTENTIONALLY (not `< n`) — this allows wraparound
// back to the caller's own seat, which is the correct behavior when they are
// the sole remaining active player: the turn legitimately returns to them.
// Do not "fix" this to match the disprove loop below, which uses `< n` for
// a different, also-intentional reason (a suggester can never disprove
// themselves).
function nextActiveSeat(state: MysteryEngineState, fromSeat: number): number | null {
  const n = state.players.length;
  for (let step = 1; step <= n; step++) {
    const seat = (fromSeat + step) % n;
    const player = state.players.find((p) => p.seatOrder === seat);
    if (player && player.status === "active") return seat;
  }
  return null;
}

export function makeSuggestion(
  state: MysteryEngineState,
  suggesterId: string,
  suspect: string,
  tool: string,
  location: string
): MysteryActionResult {
  if (state.gameOver) return { ok: false, error: "game_over" };
  if (state.pendingDisprove) return { ok: false, error: "disprove_pending" };
  const suggester = findPlayer(state, suggesterId);
  if (!suggester) return { ok: false, error: "not_found" };
  if (suggester.seatOrder !== state.currentTurnSeat) return { ok: false, error: "not_your_turn" };
  if (suggester.status === "eliminated") return { ok: false, error: "eliminated" };
  if (!SUSPECTS.includes(suspect as any) || !TOOLS.includes(tool as any) || !LOCATIONS.includes(location as any)) {
    return { ok: false, error: "invalid_card" };
  }

  const suggestedIds = [cardId("suspect", suspect), cardId("tool", tool), cardId("location", location)];
  const n = state.players.length;
  let disprover: MysteryPlayerState | null = null;
  let candidateCardIds: string[] = [];

  // `step < n`: excludes the suggester's own seat. Eliminated players are
  // NOT skipped here — they still hold real cards and must still disprove.
  // Elimination only revokes the right to suggest/accuse, never to disprove.
  for (let step = 1; step < n; step++) {
    const seat = (suggester.seatOrder + step) % n;
    const player = state.players.find((p) => p.seatOrder === seat)!;
    const matches = player.hand.filter((c) => suggestedIds.includes(c));
    if (matches.length > 0) {
      disprover = player;
      candidateCardIds = matches;
      break;
    }
  }

  const newLog: MysteryLogEntry = {
    type: "suggestion",
    turn: state.turnCount,
    suggesterId,
    suspect,
    tool,
    location,
    disprovedBy: disprover ? disprover.memberId : null,
  };

  if (!disprover) {
    const nextSeat = nextActiveSeat(state, suggester.seatOrder);
    return {
      ok: true,
      state: {
        ...state,
        log: [...state.log, newLog],
        turnCount: state.turnCount + 1,
        currentTurnSeat: nextSeat ?? state.currentTurnSeat,
        gameOver: nextSeat === null,
        winnerId: null,
      },
    };
  }

  return {
    ok: true,
    state: {
      ...state,
      log: [...state.log, newLog],
      pendingDisprove: { suggestionIndex: state.log.length, suggesterId, disproverId: disprover.memberId, candidateCardIds },
    },
  };
}

export function resolveDisprove(state: MysteryEngineState, disproverId: string, chosenCardId: string): MysteryActionResult {
  if (state.gameOver) return { ok: false, error: "game_over" };
  if (!state.pendingDisprove) return { ok: false, error: "not_found" };
  if (state.pendingDisprove.disproverId !== disproverId) return { ok: false, error: "not_your_turn" };
  if (!state.pendingDisprove.candidateCardIds.includes(chosenCardId)) return { ok: false, error: "invalid_card" };

  const suggester = findPlayer(state, state.pendingDisprove.suggesterId)!;
  const nextSeat = nextActiveSeat(state, suggester.seatOrder);
  return {
    ok: true,
    state: {
      ...state,
      pendingDisprove: null,
      turnCount: state.turnCount + 1,
      currentTurnSeat: nextSeat ?? state.currentTurnSeat,
      gameOver: nextSeat === null,
    },
  };
}

export function makeAccusation(
  state: MysteryEngineState,
  accuserId: string,
  suspect: string,
  tool: string,
  location: string
): MysteryActionResult {
  if (state.gameOver) return { ok: false, error: "game_over" };
  if (state.pendingDisprove) return { ok: false, error: "disprove_pending" };
  const accuser = findPlayer(state, accuserId);
  if (!accuser) return { ok: false, error: "not_found" };
  if (accuser.seatOrder !== state.currentTurnSeat) return { ok: false, error: "not_your_turn" };
  if (accuser.status === "eliminated") return { ok: false, error: "eliminated" };
  if (!SUSPECTS.includes(suspect as any) || !TOOLS.includes(tool as any) || !LOCATIONS.includes(location as any)) {
    return { ok: false, error: "invalid_card" };
  }

  const correct = state.solution.suspect === suspect && state.solution.tool === tool && state.solution.location === location;
  const newLog: MysteryLogEntry = { type: "accusation", turn: state.turnCount, accuserId, suspect, tool, location, correct };

  if (correct) {
    return { ok: true, state: { ...state, log: [...state.log, newLog], gameOver: true, winnerId: accuserId, turnCount: state.turnCount + 1 } };
  }

  const updatedPlayers = state.players.map((p) => (p.memberId === accuserId ? { ...p, status: "eliminated" as const } : p));
  const stillActive = updatedPlayers.some((p) => p.status === "active");
  const nextSeat = stillActive ? nextActiveSeat({ ...state, players: updatedPlayers }, accuser.seatOrder) : null;

  return {
    ok: true,
    state: {
      ...state,
      players: updatedPlayers,
      log: [...state.log, newLog],
      turnCount: state.turnCount + 1,
      currentTurnSeat: nextSeat ?? state.currentTurnSeat,
      gameOver: !stillActive || nextSeat === null,
      winnerId: null,
    },
  };
}
