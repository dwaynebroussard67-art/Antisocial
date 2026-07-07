# ANTISOCIAL — Handoff Document
**Checkpoint date:** this session, first build pass.
**Read this whole thing before you or another developer touches the code.**

---

## 1. What this project is

Antisocial is the social platform tied to Misfit Ministries
(https://misfit-ministries.vercel.app/). Four cascading trust tiers —
**Street → Block → Crib → Pit** — each unlocking more of the site, plus a
manually-maintained ledger in the Pit tracking Misfit First Responder /
Narcan Watch alert outcomes.

This is a **working foundation**, not a finished product. Everything in
Section 3 runs conceptually and is ready to wire to a real database and
real auth. Everything in Section 4 is not yet touched this session.

---

## 2. The vision, in one place (so nothing gets lost)

- **Entry**: two ways in — a direct/shared link, or an "Antisocial" button
  on Misfit Ministries. Both land on the same gate page.
- **Tier is assigned automatically from history, never self-selected, never
  bought, never earned through games.**
  - Decline an email → **Street**. Fully open, no barrier.
  - Give an email → **Block**. Doctrine gets sharper (Ethiopian
    Tewahedo/Ge'ez canon, the Afroasiatic Christ — explicitly not the
    Western depiction), games get better.
  - **Crib** (renamed from "House"): staff, or non-staff who've been
    manually vouched for by a minister/admin for real program
    participation or time given. Never automatic, never gamed.
  - **Pit**: the deepest tier. No games here at all. Home to the Misfit
    First Responder / Narcan Watch community, Neuro's role as a
    protective/praying presence, and the alert ledger board. Only the
    minister prays/talks directly with people here — that part is
    explicitly not meant to scale.
- **Access cascades downward, except Street is boxed in**: Pit sees
  everything, Crib sees Crib+Block+Street, Block sees Block+Street, Street
  sees only Street.
- **Game challenge rule**: you can challenge anyone at your tier or below,
  never above. Tier can't be bought or won through play.
- **Leaderboard/scoreboard visible in every section.**
- **The alert ledger (Pit board)**: per your explicit choice, this is a
  **standalone log that staff update manually** after each incident — it
  does NOT pull live from the Neuro/Narcan Watch alert system. It only ever
  stores aggregate/anonymized data: date, whether answered, outcome
  (saved/lost/unable to locate/false alarm), optional coarse area. No
  addresses, no names, no precise locations — ever.
- **Neuro** and the **live alert/location-sharing system** (911 prompt →
  "Alert the Narcan Watch" → 5-mile/10-mile search → one-time location send
  → immediate deletion → anonymized event log) are **already built on the
  Ministries side**. Antisocial does not rebuild them — it only links out to
  Neuro and keeps its own separate, manual outcome ledger.
- **Imagery**: brand assets are staged in `/public/images/brand/` — see
  Section 5 for what each one is and where it's used.

---

## 3. What's built and working in this project (this session)

```
antisocial/
├── package.json, drizzle.config.ts        — project + DB config
├── src/
│   ├── styles/tokens.css                  — full design system (colors, type, tier accents)
│   ├── lib/
│   │   ├── db/
│   │   │   ├── index.ts                   — Postgres/Drizzle client
│   │   │   └── schema/
│   │   │       ├── members.ts             — NEW: the core member table (see note below)
│   │   │       ├── member-roles.ts        — tiers (street/block/crib/pit), badges, events
│   │   │       └── alert-ledger.ts        — NEW: the Pit's manual alert tally
│   │   ├── auth/
│   │   │   ├── session.ts                 — STUB, see Section 6 #1
│   │   │   ├── anonymous-identity.ts      — lets Street visitors persist without email
│   │   │   └── roles.ts                   — all tier/role access-control logic + cascade
│   │   └── tiers/
│   │       └── assign-tier.ts             — auto Street→Block, manual Crib grant, Pit is read-only here
│   ├── components/
│   │   ├── NavBar.tsx                     — tier-aware nav, only shows reachable tiers
│   │   ├── NeuroPresence.tsx              — links out to Neuro, see Section 6 #2
│   │   └── AlertLedgerBoard.tsx           — renders the Pit tally board
│   └── app/
│       ├── layout.tsx
│       ├── page.tsx                       — the Antisocial gate/landing page
│       ├── street/page.tsx                — built out, imagery wired in
│       ├── block/page.tsx                 — built out
│       ├── crib/page.tsx                  — built out, imagery wired in
│       ├── pit/page.tsx                   — built out, alert ledger board wired in
│       └── api/alert-ledger/route.ts      — GET (any Pit viewer) / POST (staff only)
└── public/images/brand/                   — your selected imagery, see Section 5
```

**Important note on `members.ts`**: your uploaded file referenced a
`blockMembers` table (imported from `./block-members`) constantly, but that
file's actual definition was never in what you gave me. I rebuilt it from
scratch as `members` with the fields the rest of the code (and your
described auto-tier logic) needs: email, verification status, donation
total, purchase flag, sign-in count, staff flag, and program-participation
verification. **If you have the original `block-members.ts` file
somewhere, send it — it may have fields I didn't guess, and I'd rather
merge than have two competing member tables.**

---

## 4. What's salvaged but NOT yet moved into this project

Your original upload (`Antisocial1.txt`, ~325,000 characters) contains a
**large, well-built backend** beyond what I moved over this session. I
audited it structurally but did not port it yet. It includes real,
working-looking code for:

- **Moderation flags** (pending/reviewing/actioned/dismissed) for posts/replies
- **Block posts**: community feed with replies, cheers, rate limiting, notifications
- **Workshop**: volunteer projects, leads, discussion, completion flow with badge rewards
- **Mission Board**: needs/signups
- **Notifications**: in-app + email, typed (reply, mention, badge, quest ready, etc.)
- **Quotes**: scripture/encouragement/community quote system
- **Arcade**: trivia, a full mini-RPG (classes, quests, combat, zones,
  inventory), head-to-head matches, a "mystery lobby" game mode

This code referenced the **old 3-tier system** (`street/block/house`) and
will need the same rename/cascade treatment I gave `member-roles.ts` — the
access-check calls (`requireHouseAccess`, etc.) need to become
`requireCribAccess` per the new file in this project, and every
`requireBlockAccess`/`requireHouseAccess` call site across those ~84 API
routes needs a pass to confirm cascade behavior is correct.

**Next-session priority order**, if you want my recommendation:
1. Get me the real `block-members`/session file if it exists — this
   determines whether I keep `members.ts` as built or merge fields in.
2. Port Block Posts + Notifications (the actual "social" core of Antisocial).
3. Port Workshop + Mission Board (ties directly to your Crib "real
   participation earns trust" model).
4. Port the Arcade last — it's the most self-contained and least tied to
   the tier-access questions that matter most.

---

## 5. Imagery staged in `/public/images/brand/`

| File | Used where | What it is |
|---|---|---|
| `hero-anointing.jpg` | Crib page hero | King + knight steadying a kneeling, marked man |
| `cross-embrace-wide.jpg` | Landing/gate hero | The recurring elder-embracing-wounded-man-at-the-cross image |
| `cross-embrace-portrait.jpg`, `-alt1`, `-alt2` | not yet placed | Same scene, other crops — good for Block or doctrine pages |
| `warrior-angel-fire.jpg` | not yet placed | Fire-winged armored figure — reads as Pit/Crib register |
| `chained-ascension.jpg` | not yet placed | Figure rising through chains and light |
| `blindfolded-face.jpg` | not yet placed | Matches the live Ministries site's actual hero image |
| `alley-glow-figure.jpg` | Street page | Lone hooded figure, still carrying light, unnoticed |
| `word-love-cross.jpg` | not yet placed | Gold cross + "Khuba/Love" |
| `word-deliverance-cross.jpg` | not yet placed | Gold cross + "Porkana/Deliverance" — good candidates for section dividers or badge art |

Skipped on purpose: the Nura Vault merch mockups (hoodies) — you said the
store is out of scope for this build.

---

## 6. The real gaps — what actually needs a human/infra decision before this goes live

1. **Auth** (`src/lib/auth/session.ts`): currently a stub returning `null`
   always. You mentioned Ministries already has its own sign-in — the
   cleanest path is sharing that session across both apps (same domain,
   same provider, or a shared token). If Ministries doesn't have reusable
   auth infrastructure, NextAuth.js is the fastest bolt-on.
2. **Neuro embed** (`src/components/NeuroPresence.tsx`): currently just a
   link out to the Ministries homepage. If Neuro is embeddable (widget
   script/iframe), swap that in — should take minutes once you tell me how
   she's actually served.
3. **Database**: nothing is provisioned. Point `DATABASE_URL` at a real
   Postgres instance (ideally the same one Ministries already uses, in a
   separate schema) and run `npm run db:push`.
4. **The original member table**: see Section 3 note — send the real
   `block-members` file if one exists.
5. **Legal/liability review**: unchanged from what I flagged at the start
   of this conversation — anything touching real Narcan Watch location
   sharing needs a lawyer's eyes, even though that system lives on the
   Ministries side, not here.

---

## 7. What to say to me next session

Paste this file, or just say "continue the Antisocial build" and remind me
where the code lives. If you have the original `block-members`/session
files, attach them first — that unblocks the biggest open question.
