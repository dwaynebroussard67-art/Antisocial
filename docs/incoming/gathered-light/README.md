# The Gathered Light

Two people walk a shared path. Each controls only one thing: how close they
stay to the other. Stay close and light gathers between them; drift and it
dims. **There is no failure state — only softer light — and no score.**

> *"Stay close. Keep the light. This is what belonging looks like."*

## Why this one fits

The arcade doctrine already written into this repo says tier is never bought
or won through play. This game can't be won at all. It ends the same way for
everyone, and the only thing it measures is whether two people stayed near
each other. Of everything in the arcade, it argues the ministry's point most
directly — and it does it without a single line of text.

## What's here

| Piece | Path |
|---|---|
| Pure engine — no React, no Supabase, no skin knowledge | `src/game/gatheredLightEngine.ts` |
| Session hook (solo + two-device) | `src/game/useGatheredLightSession.ts` |
| Street / Block / Crib skins | `src/game/skins/` |
| Art (title card, flames, backgrounds, figures) | `public/assets/games/gathered_light/` |
| Shipped schema — **do not run, see below** | `src/lib/gatheredLightSchema.sql` |

The engine/skin separation is clean: skins never touch engine logic, so a
fourth skin is a new file and nothing else.

## Registered, not live

Both registry entries are in:

- `src/lib/arcade/seed-games.ts` — `gathered_light`, kind `multiplayer`
- `src/lib/arcade/variant-defaults.ts` — three variants, all `active: false`

`multiplayer` is deliberate. It is not `solo_score` (no score exists) and not
`head_to_head` (nobody is opposed), so leaderboard routes never resolve for
these keys. There is nothing to rank.

Activation stays a deliberate admin act, same as every other variant.

## Before it goes live — the schema

**Run `sql/gathered-light-schema-hardened.sql`, not the file in this bundle.**

The shipped schema grants anon full read and full update on both tables. Its
own comment says "Adjust to your app's auth model as needed," so this is that
adjustment rather than a disagreement with it. As written it allows:

- reading **every** session row — which makes the join codes that are supposed
  to be the access control world-readable, so the code stops being a secret
- updating **any** session — a stranger can move another pair's flame, drain
  their light, or mark their walk finished
- reading `gather_light_interactions` — an append-only, timestamped log of
  every tick, tied to player ids

The last one is the real problem. This is a game about two people staying
close; its interaction log is a record of **who sat with whom and for how
long**. On a site whose stated third priority is privacy, that cannot be
world-readable.

The hardened version scopes reads and writes to a session whose code you
actually present, gives the interaction log no read policy at all (RLS denies
by default), expires sessions after 24 hours, and adds a prune function so
the log doesn't quietly become the permanent record the game refuses to keep.

## Porting — the open decision

The bundle is standalone Vite + React + Tailwind. Antisocial is Next 14 /
React 18. Two options:

1. **Mount as a standalone bundle in an iframe.** Its React and Tailwind stay
   out of the app's. Fastest, and the game already has its own skin picker —
   though the picker would need removing, since the tier resolver should
   choose the skin, not the player.
2. **Port the components in natively.** Engine and hook are framework-light
   and would move cleanly; the skins need Tailwind classes converted to this
   repo's token system, the way `signal.module.css` was.

Option 2 is more work but makes the tier gate real — right now the shipped
`App.tsx` lets anyone pick any skin, which would let a Street member open the
Crib build. Whichever way it goes, **the skin must come from
`getPlayableVariants()`, not from a button.**

## Also needs deciding

- Two-device play needs Supabase configured; solo practice works without it.
- The engine has no age concern, but `min_age` is available on the variant
  rows if any skin should ever be gated.
