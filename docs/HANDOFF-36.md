# HANDOFF-36 — D's corrections: the ladder, Street games, Nura's authority

Three corrections given verbally by D this session, implemented here. Each is
numbered as D gave them (C1/C2/C3) and referenced by number in the code.

---

## C1 — The ladder: see one level up, interact downward only

**What D said.** You can see one level up, you just can't disturb the people up
there. The Street sees who's on the Block — that they're present and active —
but not their conversations, and it can't talk to them or alert them. The Block
sees and talks to the Street, talks on the Block, and can see the Crib is
occupied without seeing into it. The Crib talks all the way down and sees the
Pit. The Pit sees everybody and can reach anybody — earned. Nobody reaches up
into the Pit. **The Pit cannot promote or demote anyone.**

**What was already right.** `TIER_RANK` in `lib/auth/roles.ts` already encoded
downward *visibility*, and every page's tier-floor check worked.

**What was missing, and is now built.**

| Piece | File |
|---|---|
| The ladder rules as predicates | `src/lib/tiers/visibility.ts` (new) |
| One-level-up presence data | `src/lib/tiers/peek-presence.ts` (new) |
| The peek, rendered | `src/components/UpstairsPresence.tsx` (new) |
| The peek as JSON | `src/app/api/presence/upstairs/route.ts` (new) |
| Promotion authority | `src/lib/tiers/promotion.ts` (new) |

Three things worth knowing about how this is enforced:

1. **Peek rows carry no member id.** `PeekPresenceRow` is `{ displayName,
   active }` and nothing else. Without an id a client physically cannot build a
   DM, challenge, mention or cheer against someone upstairs, so "can't disturb
   them" can't be lost later by a component that assumes an id means it may act.
   Same-tier and downward rows *do* carry ids, because interaction there is
   allowed.

2. **`canInteractWith()` is a different question from a tier-floor check.** A
   floor check asks "is this viewer high enough for this page." Interaction asks
   "is this target at or beneath this actor." Those differ exactly when the
   target is above the actor — the case the ladder forbids. Feature code should
   call `canInteractWith` / `assertCanInteractWith`, never re-derive it.

3. **Promotion is `site_role`, never tier.** `assertPromotionAuthority()` checks
   for staff/admin and deliberately ignores tier. This guards a trap: every
   other capability here scales with tier, so a promotion path gated on
   `requirePitAccess()` would have looked idiomatic and been wrong. A
   Street-tier admin may promote; a Pit member with no site role may not.
   `grantCribByProgramParticipation` now calls it — it previously recorded who
   granted Crib without ever checking they were allowed to.

**One behavioural change:** the presence heartbeat
(`/api/presence/heartbeat`) was gated at Block, so no Street member ever had a
presence row. That made the Street invisible to the tiers above it and would
have shown every Block member as permanently "away" on the Street's new peek
board. Floor lowered to Street.

**On the Pit and `presence_only`:** "nothing sees the Pit" is implemented as
seeing *into* it — its rooms, calls and content. The Crib gets the same
name-and-dot peek of the Pit that every floor gets of the floor above it.
Say if that's wrong and it becomes a one-line change in `tierVisibility`.

---

## C2 — The Street gets games

**What D said.** The games aren't present on the Street. The Street versions
should be the simplest games and the simplest versions of the games. Just
because you're on the Street doesn't mean you don't get to play.

**What was wrong.** There was no Street arcade at all — `/block/arcade` was the
only one and it was gated at Block. The Street page advertised "Chess,
checkers, the basics" and had nowhere to send anybody.

**The model.** A game is no longer one thing you can or can't reach. A game is a
family, and your tier decides which **build** you get.

```
arcade_games          one row per game        (pac_man)
arcade_game_variants  one row per (game,tier) (pac_man+street -> "The Grind")
```

Resolution: take the build for your own tier; if that game has no build at your
tier, fall back to the best build *below* you. Fallback is downward only, same
as everything else here. A game that only ever ships a Street build is played by
everyone, in its Street form.

**Pac-Man**, from the zip D supplied, registered as the worked example:

| Tier | Build | Live? |
|---|---|---|
| street | The Grind — classic 2D | inactive |
| block | Grind City — 3D | inactive |
| crib | Trap Man — 3D, police/cash/getaway | inactive, **18+** |

They ship **inactive** because the bundles don't exist in this repo yet — a live
tile pointing at a missing bundle is worse than no tile. Flip `active` when the
builds land; that's a data change, not a deploy.

**What is live on the Street now:** the four solo games that already work —
Daily Trivia, Word Scramble, Reaction Timer, Coin Flip Streak — at
`/street/arcade`. War stays a Block game (head-to-head). The Pit still has no
games, per HANDOFF.md §2.

**Gating changed from tier-floor to registry.** The game routes now take a
Street floor and call `assertPlayable(gameKey, tier, viewerId)`, which asks the
real question — does this member have a build of this game they may play? That
folds the registry check, the tier resolution and the age gate into one call.

**Age gate.** `min_age` is enforced server-side on every read in
`lib/arcade/variants.ts`, not in the page that draws the tile, so no deep link
or future invite path routes around it. It needed something to check against, so
`members.adult_verified_at` was added — **NULL means not a verified adult, and
the gate fails closed.** Without that column `min_age` would have been a number
nothing could read: a gate that only looks like one. How adulthood actually gets
verified is not decided here; a human sets the column, same as program
participation. **Until something sets it, nobody can reach Trap Man** — which
is the correct failure direction, but it does mean the Crib build stays dark
even after its bundle lands.

**No tease:** games a viewer can't play are not rendered as locked tiles.
Nothing on the Street tells anyone what they're missing upstairs.

---

## C3 — Nura's moderation authority

**This overrides the standing handoff.** `HANDOFFCHAPELSTRUCTURAL.md` §0 put
NURA's reasoning, memory and moderation logic out of scope. D overrode that for
one specific power: hate speech and disciplinary action. She has final
authority, she needs no permission, and if she even thinks something's
happening she quarantines it.

### The doctrine, as built

**Quarantine first, always.** Any suspicion pulls the content out of sight
before anything else happens. Quarantine is not a punishment and not a verdict —
it's the pause button, and it costs nothing to press.

**The sender is never told.** Not at quarantine, not during review, not on
removal. They may have worded something badly, or Nura may have misread them;
nothing is said either way while that's worked out. There is no "your message
was held" notice anywhere in this system, by design.

**Band A — obvious** (hate speech, evil-worship, glorifying evil, threats).
Content removed, account removed. No warning, no questions, no human in the
loop first.

**Band B — uncertain.** Content stays quarantined and invisible. D and every
staff member get alerted. A human decides. The sender still hears nothing.

### Files

| Piece | File |
|---|---|
| The cut lines | `src/lib/moderation/nura-bands.ts` |
| Classifier interface + baseline | `src/lib/moderation/nura-classifier.ts` |
| Enforcement pipeline | `src/lib/moderation/nura.ts` |
| Tables | `src/lib/db/schema/nura-moderation.ts` |

Wired into: block posts, block replies, Signal messages. Ban enforced in
`getViewer()` — a banned member resolves to no viewer at all, so every gate,
route and page treats them as a signed-out stranger.

### How the silence is actually enforced

This is the part most likely to be broken by a well-meaning future edit:

- Content is written **quarantined and promoted to published only if Nura
  clears it** — not inserted live and demoted after. Inserting-then-demoting
  leaves a window, however short, where the feed can serve something that's
  about to be held.
- Routes return an **identical 201 either way**, with `status` hard-coded to
  `"published"` rather than echoed from the row. Echoing it would hand the
  author the verdict in the response body.
- A quarantined reply does **not** increment `replyCount`, and a quarantined
  Signal message does **not** bump the room's `updatedAt`. Either one would
  announce the hold — a counter moving or a room jumping to the top of
  everyone's list with nothing new visible in it.

### Two safety properties, both deliberate

**1. Score alone can never ban.** Band A requires a high score *and* an
auto-ban-eligible category (`nura-bands.ts`). A 95-scoring harassment or
self-harm case falls back to Band B and a human reads it. Self-harm is the
clearest case for why: someone in crisis trips a high score, and this is a
ministry that exists to catch that person, not remove them.

**2. A single lexical hit can never ban.** The baseline classifier caps its own
score at 84 — one below the line — unless two independent signals agree.

Verified behaviour of the current baseline:

| Input | Score | Band |
|---|---|---|
| ordinary talk / grief | 0 | clear |
| "praise the devil, he's the only one who ever showed up" | 55 | **B** — a human reads it |
| "hail satan, evil is good and always was" | 100 | **A** |
| "i'm gonna kill you" (single signal) | 50 | **B** |
| "i want to die..." | 40 | **B**, never A |

### What is NOT settled — needs D

**The classifier is a placeholder and should be treated as one.**
`BaselineLexicalClassifier` is lexical pattern matching, not the moderation
intelligence D is building toward. It exists so the enforcement path is provable
end to end and the site isn't unguarded meanwhile. D's own note on this was
"maybe we need to ride another algorithm" — the rubric is genuinely open.

`getClassifier()` is the one-line swap point. Nothing else in the moderation
path changes when the real NURA layer lands.

Consequently `BANDS.OBVIOUS = 85` sits high on purpose. **The two mistakes are
not symmetrical:** a wrong Band B costs someone a delay they never find out
about; a wrong Band A removes a person from a community they may have needed.
Until a real classifier is in, the bias is toward the reversible mistake.

**Real lexicons don't belong in this repo.** Slurs, coded language and local
vernacular load at runtime from `NURA_LEXICON_JSON` — see the format in
`nura-classifier.ts`. Malformed entries are skipped loudly, never silently.

### The audit tables, and why they exist

D asked for no appeal and no warning in the user-facing flow, and that is
exactly what is built — nothing in any response, notification or page mentions
a hold, a ban, or a way to contest one.

`nura_actions` (append-only) and `member_bans.reversed_at` are **staff-side
only**. Nobody is notified, nothing is promised to anyone, and no reversal ever
happens on its own. They are there so that if Nura is wrong, the mistake is
findable and undoable by a human instead of silent and permanent. This was
raised as a recommendation and D has not ruled on it — it is easy to strip if
unwanted, and nothing user-facing depends on it.

### Known gaps, named rather than papered over

1. **Voice with no transcript is not screened.** Nothing to read. It passes.
   Closes when transcription is always-on, not before.
2. **A Band B hold with no staff to alert sits invisible forever.** Logged
   loudly when it happens; there is no admin/moderator seeded by default.
3. **No staff review UI yet.** `listOpenQuarantine()` and `resolveQuarantine()`
   exist and work; `/moderation/quarantine/[id]` — the link in the staff
   notification — is not built. Until it is, Band B holds accumulate and can
   only be resolved by calling the function directly.

---

## Migration

`drizzle/0002_ladder_variants_nura.sql`, idempotent throughout. Run
`node apply-schema.mjs`.

New tables: `arcade_game_variants`, `content_quarantine`, `nura_actions`,
`member_bans`.
New columns: `members.adult_verified_at`/`adult_verified_by`,
`block_post_replies.status`, `signal_messages.quarantined_at`.
New enum value: `block_post_status.quarantined`.

## Verification

`npx tsc --noEmit` clean; `npm run build` passes. Band logic verified against
the table above. **Nothing has been run against a live database** — there is no
`DATABASE_URL` in this environment, so the migration and every query path in
this change are unexercised against real Postgres.

## Still open

- Nothing here touches the Chapel, ranks, teaching sessions, lost-sheep tables
  or sidewalks/alleys from `HANDOFFCHAPELSTRUCTURAL.md`. That handoff's build
  order is untouched by these corrections except that Nura moderation, formerly
  out of scope, now exists.
- The Pac-Man builds themselves are not ported. The Vite/React app D supplied is
  a separate bundle; the registry is ready for it.
- No Pit variant of Pac-Man exists in the supplied zip, and the Pit has no games
  by doctrine. Flag if that's wrong.
