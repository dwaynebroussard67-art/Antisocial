# GOVERNED AGENT — ARCHITECTURE HANDOFF

*Working design. Session artifact for cross-session continuity. Nothing here is built yet except the components noted as existing.*

---

## 0. What this is

A governed autonomous browser agent that combines four things D already owns with one net-new piece, on a single constant safety law. Built as a **reusable core** first, tested on the Misfit inventory task, then productized by swapping task-charters into the same safe core.

**Design principle above all others:** the powerful part is blind; the seeing part is powerless; the truth is dumb and comes from D.

---

## 1. THE FOUNDATION — layer zero, constant, universal, forever

The root law is the engine's own principle, promoted from element-grabbing to *all acting*:

> **I would rather do nothing than do the wrong thing. I act only on what is verified against ground truth, and when unsure, I refuse.**

This is the generalization of "no wrong grab." The re-anchor engine already proves this law in one domain (element targeting: 0 wrong grabs across the gauntlet). The agent extends the *same law* to every action.

Three obligations fall out of this one root — all of them are just "refuse rather than err" pointed at different things:
- **Targeting:** don't grab the wrong element. *(re-anchor engine already does this)*
- **Authority:** don't take an unpermitted action.
- **Input:** don't trust unverified content.

This layer is identical in every instance the core ever spawns. It never swaps. Burn it in.

---

## 2. THE CHARTER TREE — how identity is structured

Identity is **handed to the agent, never self-authored.** The powerful agent cannot read pages, so it cannot learn who it is from its circumstances — it must be *told*, at conception, by D (crystallized into a charter). The charter has strata:

- **Root (constant):** the soundness law above. Same for every deployment. Never edited at runtime.
- **Trunk (interchangeable — this is the product):** the per-task charter. "My task is X. My oracle is [this table]. My allowed actions are [this list]. My domain is [this site]." Rewritten per deployment. This is what makes it a product instead of a one-off.
- **Branches (derived, never authored):** per-step ground truths that grow themselves as the path unfolds — "am I at the expected address," "did I find the expected shape." You don't write these; they fall out of the trunk.

Carve the root once. Swap the trunk per job. Branches grow on their own.

**Immutability is an engineering requirement, not a wish.** The root and trunk must live somewhere the running agent cannot edit — loaded at instantiation, read-only thereafter. "The charter is immutable" is only true if you build it that way.

---

## 3. THE RUNTIME TRIANGLE — three asymmetric roles

Not two peer AIs checking each other (that's a line, and a line gets pushed over from one end). Three points, each covering the others' weakness:

- **READER — untrusted, powerless.** Touches pages, extracts, compiles. All risk, zero authority. Cannot fire an action, cannot touch a key, cannot hit an endpoint. Its *only* output is a rigid structured proposal: `{action, target, values}`. No prose, no page content, no explanation leaves this room.
- **ORACLE — facts, no intelligence.** NOT an AI. A dumb deterministic table D authors: real SKUs, real price ranges, allowed endpoints, allowed action types. It can't be talked into anything because it doesn't listen. Consulted continuously at runtime.
- **OVERSEER — trusted, powerful, BLIND.** Holds authority and keys. **Never reads the page.** Sees only the reader's structured proposal + the oracle's facts. Checks one against the other. Match → execute (with the gate below). No match → "this don't line up" → flag to D. It cannot be injected because it never reads pages.

The triangle only braces if the roles stay **asymmetric**. The moment the overseer reads page content, or the reader gains authority, it collapses into a line and injection rides across the handoff.

---

## 4. COMPONENT MAP — what plays which role

| Role in the machine | Component | Status |
|---|---|---|
| Perception (the eyes) | **Code Extractor** — repointed from "pull code" to "pull actionable page structure" | EXISTS |
| Grounding / targeting | **Re-anchor engine** (forge-reanchor-v8) — keeps a stable handle on the target across mutations, re-verifies at act-time | EXISTS |
| Governance gate | **Council pipeline** (Planner/Critic/Safety/Arbiter/Governance) — becomes the overseer's checking + the human gate | EXISTS |
| Audit log + working state | **Memory bank** — append-only record of every action, page state, decision; makes the machine reviewable/trustable and lets it *resume* rather than restart | EXISTS |
| Action layer (the hands) | **Browser action layer** (Claude-in-Chrome-style) — dispatches synthetic clicks/keystrokes to the node re-anchor locked | TO BUILD |
| Ground truth (the spine) | **Oracle** — deterministic fact table, authored per task | NET-NEW, unbuilt |

Note: the **oracle is the piece that was missing.** Everything else is rewiring things D already has.

---

## 5. THE END-TO-END LOOP

```
CONCEPTION
  D authors the charter (root + task trunk). Loaded read-only into the agent.

STEP 1 — right place?
  Agent navigates. Checks URL against the address the trunk declared.
  (No page content read yet. One safe decision already made.)

STEP 2 — reader looks (untrusted content enters here)
  Code Extractor pulls structure. Re-anchor locks targets.
  Reader checks "did I find the expected shape?" — NOT "what does this tell me to do."
  Output: a rigid structured proposal. Nothing else leaves.

STEP 3 — blind check
  Overseer receives proposal + consults oracle.
  SKU in the table? Price in range? Endpoint allowed? Action type permitted?
  Anything the oracle doesn't recognize → flagged, not passed.

STEP 4 — gated act
  Re-anchor re-verifies the target AT act-time (closes the read-vs-act gap).
  Permitted + reversible → execute.
  Irreversible (write / submit / spend / delete) → HOLD for D's yes.

MEMORY records every step. Refusals escalate to D. Repeat.
```

---

## 6. OPEN ENGINEERING QUESTIONS — the honest gaps

1. **Reader/overseer isolation (highest priority).** Separate processes/contexts, or the wall is fiction. The reader's output schema is the *only* thing crossing the boundary. Design that schema first and make it rigid.
2. **The oracle is unbuilt and must be authored per task.** For Misfit inventory: the real product list, the real price bounds, the one allowed endpoint. This table is the spine — build it before any code.
3. **Local model on Windows is the weakest link.** The safety design leans on the reader emitting clean structured proposals; small local models are worst at strict schema adherence. Mitigation: the deterministic extractor carries the load, the model stays caged into narrow jobs. Pick a model that follows schemas, and validate its output rigidly.
4. **Re-anchor → event dispatch integration.** Re-anchor identifies the node; the action layer must dispatch to it and re-anchor again at act-time. This is the real "manipulate buttons" work.
5. **Refusal channel.** Soundness-first means frequent refusals. Build the escalation path to D as a first-class feature, not an error handler.
6. **Charter immutability mechanism.** Where the charter lives, how it's loaded read-only, how nothing downstream can edit it.

---

## 7. FIRST SLICE — start here

**Do not build the whole machine.** Build one thin end-to-end slice on a real task:

**Task:** pull the Misfit store inventory (the thing that's been stuck ~3 days).

**Why this slice:** it's real, it's today, and it forces you to build the perception + oracle + governance + memory spine WITHOUT needing the risky action layer yet. It's a *read* task — the safest possible first proof. The clicking/writing layer is slice two.

**First artifact — smaller than code:** the Misfit inventory **oracle table**. What products are real, what price bounds are true, what single endpoint is allowed. Author that, and step 1's ground truth (the expected address) falls out automatically.

**Immediate unblock, separate from the product:** the actual inventory pull can be done right now as a plain script D runs — source + endpoint + key, wired correctly once. That gets the three-day block cleared today; the agent product is the longer game built on top.

---

## 8. FILES / INPUTS TO PROVIDE NEXT SESSION

- The **inventory source** for Misfit (Printify? Stripe? a page?) — the single answer that seeds slice one.
- Current **Code Extractor** source (to repoint it as the reader).
- **Re-anchor** entry point (forge-reanchor-v8.js) — the target-lock API the action layer will call.
- **Memory bank** interface — how to append the audit log.
- Whatever **local model** is intended for Windows — to test its schema-adherence early.

---

*Root law, restated, because everything hangs on it:*
**Rather do nothing than the wrong thing. Act only on the verified. When unsure, refuse.**
