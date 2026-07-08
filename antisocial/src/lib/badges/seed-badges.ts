import { db } from "@/lib/db";
import { badges } from "@/lib/db/schema/member-roles";

// Closes two gaps at once:
//  - HANDOFF-17 §3: workshop_builder was referenced by BADGE_RULES in
//    lib/roles/events.ts but never had a seed row, so it silently no-ops
//    (loudly, via console.warn) every time a Workshop project completes.
//  - HANDOFF-17 §4.7: "No seed script exists in this project yet at all."
//
// These keys MUST match BADGE_RULES in src/lib/roles/events.ts exactly.
const SEED_BADGES = [
  {
    key: "workshop_builder",
    name: "Builder",
    description: "Completed a Workshop project as an active volunteer.",
  },
  {
    key: "arcade_7_day_streak",
    name: "7-Day Streak",
    description: "Hit a 7-day activity streak in The Arcade.",
  },
];

export async function seedBadges() {
  await db.insert(badges).values(SEED_BADGES).onConflictDoNothing({ target: badges.key });
  console.log(`[seed:badges] ensured ${SEED_BADGES.length} badge definitions exist`);
}
