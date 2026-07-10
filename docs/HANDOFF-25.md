# ANTISOCIAL — Handoff Document 25
**Base:** HANDOFF-24 (build-verified, deployed live, auth working end-to-end
as of this session — the .supabase.CO-not-.COM env var bug is fixed, sign-in
works in production).

## What this session built (all build-verified)

1. **Ethiopian-canon Daily Trivia bank** — 26 questions sourced from the
   Ethiopian Orthodox Tewahedo 81-book canon, in
   `src/lib/arcade/trivia/ethiopian-questions.ts`. Categories: Book of
   Enoch (8), Book of Jubilees (4), The 81 Books (6), Scripture (5),
   Church History (3). Every question checked against tradition.
   Idempotent seeder wired into `scripts/seed.ts` — dedupes by exact
   question text, safe to re-run forever. D's standing directive: trivia
   content comes from the Ethiopian 81-book canon.
2. **Word Scramble play UI** — `word-scramble-game.tsx`. Uses existing
   round/submit routes; server verifies; each solve = score 1.
3. **Reaction Timer play UI** — `reaction-timer-game.tsx`. Tap-when-gold
   pad, foul detection for early taps, submits ms to the shared
   solo-score route (`reaction_timer`, lower_better).
4. **Coin Flip Streak play UI** — `coin-flip-game.tsx`. Server flips;
   client carries streak; loss records the streak as score.
5. **Arcade page** now renders all three between War and the
   leaderboards, sign-in-gated exactly like War. Shared styles in
   `solo-games.module.css`.

## To deploy this
```
git add -A && git commit -m "Ethiopian-canon trivia + 3 playable solo games (HANDOFF-25)" && git push
npm run seed        # in Termux with DATABASE_URL exported — loads the 26 questions
```
Vercel auto-deploys on push. Then: Block → Arcade → all four games playable.

## Still open (carried)
- Chess, Mystery, Shooter, RPG (sub-pieces 3–6)
- blindfolded-face.jpg swap; duplicate images; NuraPresence accent (D's call)
- Ministries → Antisocial button (lives in Ministries repo)
- More trivia questions over time — same file, same bar of accuracy
- Known ticket: signed-out taps on game areas do nothing visible on some
  screens; sign-in gating now shows explicit "Sign in to play" per game
