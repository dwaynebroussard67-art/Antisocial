# INCOMING — material D handed over, parked here on purpose

D's instruction when he sent these: *"I'm just dumping all this stuff on you that
you can hold in reserve or push wherever you need to push it. You don't gotta
deal with it now. You just need to save it."*

So this directory is a **holding bay, not a build**. Nothing here is wired into
the running app. It is committed because the session container it arrived in is
ephemeral, and none of this should have to be sent twice.

Read this file before starting work on any of it.

---

## 1. `nura-safety-layer/` — READ THIS FIRST

**This is the most important thing in this directory, and it changes what needs
building.**

A working three-tier Nura safety pipeline from an earlier session. It implements,
in code, the architecture D later described verbally (recorded in
`../HANDOFF-37-nura-sandbox-doctrine.md` §3) — meaning **parts of HANDOFF-37's gap
list may already be solved here.** Check this before building any of it fresh.

| Piece | Path |
|---|---|
| Tier orchestration | `src/lib/nura/pipeline.ts` |
| Tier 1 — deterministic screen, no LLM | `src/lib/nura/tier1.ts` |
| Tier 2 — context resolver | `src/lib/nura/tier2.ts` |
| Tier 3 | `src/lib/nura/tier3.ts` |
| Consequences | `src/lib/nura/nura-consequences.ts` |
| Config / thresholds / packs | `src/lib/nura/config.ts` |
| Append-only log migration | `src/db/migrations-manual/0001_nura_log_append_only.sql` |
| Admin UI | `src/app/admin/nura/` |
| Admin API (log, config, actions, alerts, quiet-mode) | `src/app/api/admin/nura/` |

**Why this matters most:** Tier 1 carries a **`predation`** pack that flags and
escalates immediately, bypassing context resolution entirely. That is the
child-safety detection that `../HANDOFF-36.md` and the live
`src/lib/moderation/nura-bands.ts` are still missing — the `sexual_minor`
category exists there as a label with **zero patterns behind it**. Do not build
that from scratch without reading this first.

Also present here and absent from the live app: a **quiet mode**, and an
append-only log with an explicit rollback migration.

**Caveats, stated plainly:**
- It is from a *different* app skeleton (integer ids, a `chapel` surface, a
  `messages` table). The live Antisocial schema uses uuid ids and has
  `block_posts` / `signal_messages`. This is a port, not a drop-in.
- Its ingest is **public-commons only** and deliberately never touches a private
  DM table. Antisocial *does* have private Signal rooms, which the live
  `screenContent` already screens. Reconcile that difference deliberately —
  don't let a port silently narrow what gets screened.
- The pipeline note says the realtime trigger was stubbed to a synchronous call
  in its sandbox.

---

## 2. `arcade-maze/` — the Pac-Man builds HANDOFF-36 was waiting on

Vite + React + Three.js source for the tiered maze-chase game. `HANDOFF-36.md`
§C2 registered three variants and shipped them **inactive** because "the bundles
don't exist in this repo yet." These are those bundles.

| Tier | Build | Notes |
|---|---|---|
| `streets` | **The Grind** — classic 2D | `ClassicLevel.tsx` |
| `block` | **Grind City** — 3D | `ThreeDLevel.tsx` |
| `crib` | **Trap Man** — 3D | police / cash / getaway boost; carries `min_age: 18` in the registry |

It keeps tier access *outside* the game so the site enforces it at the router —
which matches how the registry and `assertPlayable()` already work.

Two things to settle before it ships:
- **Activation stays a deliberate act** (HANDOFF-36 §C2): turn variants on only
  after server-side `min_age` enforcement is verified against real Postgres.
- **The Street tier needs no sign-in at all**, so it is the tier a minor is most
  likely to reach. "The Grind" is mild — but it shares Trap Man's frame
  (chasers, "stacks", "getaway boost"). Flagged for D's decision rather than
  shipped by default. Trap Man itself is already gated and fails closed.

Its `package.json` wants React 19 / Vite 7; this repo is Next 14 / React 18.
Porting means either an iframe/standalone bundle or a dependency reconciliation.

---

## 3. `alley-cat/` — ALLEY CAT game design document

32-page GDD for a 3D action-platformer (UE5, mid-size AA, 12–20 hrs). Full text
extracted alongside the PDF so it is greppable without a PDF reader.

Premise: a street cat in a Gulf-South city of animals; a collar of eight
diamonds and one empty socket that the hood reads as status and Alley knows is a
leash. Misfit Ministries appears in-world as a storefront church. Its stated
hook — *"an action-platformer whose combat system exists to be avoided"* — is a
design thesis, not a feature list.

Nothing built. Scope is far beyond the arcade registry; this is a separate
production, not an Antisocial tile.

---

## 4. `GOVERNED-AGENT-HANDOFF.md` — governed browser agent architecture

The reader / oracle / overseer triangle. Root law: *"Rather do nothing than the
wrong thing. Act only on the verified. When unsure, refuse."*

Unbuilt except the components it names as already existing (code extractor,
re-anchor engine, council pipeline, memory bank). The doc's own assessment is
that the **oracle** — a deterministic fact table, authored per task — is the one
genuinely missing piece. Unrelated to Antisocial's runtime; parked here for
safekeeping.

---

## Elsewhere, from the same handover

- **`That's What Love Does` (the real book, 50-page scan)** → `misfit_ministries`,
  with a partial transcription. It replaces invented placeholder chapters
  currently live on that site.
- **THE HALL BUILD DOSSIER** (storefront backend spec) → `misfit-store`, with a
  decoded text copy.
