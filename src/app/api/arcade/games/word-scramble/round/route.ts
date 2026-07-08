import { NextResponse } from "next/server";
import { SCRAMBLE_WORDS, scramble } from "@/lib/arcade/word-scramble/words";

// Without this, Next.js statically prerenders this handler at build time
// (it reads nothing from the request), freezing ONE word + ONE scramble
// for every visitor until the next deploy. Caught by the first real
// `next build` since HANDOFF-22 — the route showed up as ○ (Static).
export const dynamic = "force-dynamic";

export async function GET() {
  const word = SCRAMBLE_WORDS[Math.floor(Math.random() * SCRAMBLE_WORDS.length)];
  // The answer is never sent — only the scrambled letters and a length hint.
  // Verification happens server-side in the submit route below.
  return NextResponse.json({ scrambled: scramble(word), length: word.length, roundId: word });
  // NOTE (ported verbatim from salvage): using the plaintext word as roundId
  // is a real, named shortcut — trivially crackable by reading network
  // traffic, but this is a zero-stakes word game with no leaderboard
  // integrity requirement beyond "did you actually unscramble it," so this
  // doesn't rise to a security concern.
}
