import { MysteryEngineState, MysteryLogEntry } from "./engine";

// PORTED, unchanged in behavior from salvage. This is the ONLY function
// allowed to build what gets sent to a client — routes must never send
// MysteryEngineState directly.

export type RedactedMysteryState = {
  players: { memberId: string; seatOrder: number; handSize: number; status: "active" | "eliminated" }[];
  yourHand: string[];
  currentTurnSeat: number;
  pendingDisprove: { suggesterId: string; disproverId: string; candidateCardIds: string[] } | null;
  log: MysteryLogEntry[];
  turnCount: number;
  gameOver: boolean;
  winnerId: string | null;
  solution: { suspect: string; tool: string; location: string } | null;
};

export function redactStateForViewer(state: MysteryEngineState, viewerId: string): RedactedMysteryState {
  const you = state.players.find((p) => p.memberId === viewerId);
  return {
    // NOTE: intentionally NOT spreading `p` here — building this object
    // field-by-field means an unrelated future field added to
    // MysteryPlayerState can never silently leak through an accidental
    // `...p` spread. This is slower to write and exactly as slow to audit,
    // which is the point.
    players: state.players.map((p) => ({
      memberId: p.memberId,
      seatOrder: p.seatOrder,
      handSize: p.hand.length,
      status: p.status,
    })),
    yourHand: you ? you.hand : [],
    currentTurnSeat: state.currentTurnSeat,
    pendingDisprove: state.pendingDisprove
      ? {
          suggesterId: state.pendingDisprove.suggesterId,
          disproverId: state.pendingDisprove.disproverId,
          candidateCardIds: state.pendingDisprove.disproverId === viewerId ? state.pendingDisprove.candidateCardIds : [],
        }
      : null,
    log: state.log, // suggestions/accusations are PUBLIC by the actual rules of the genre — only the disprove card itself is private
    turnCount: state.turnCount,
    gameOver: state.gameOver,
    winnerId: state.winnerId,
    solution: state.gameOver ? state.solution : null,
  };
}
