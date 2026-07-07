import { db } from "@/lib/db";
import { memberEvents, memberBadges, badges } from "@/lib/db/schema/member-roles";
import { eq } from "drizzle-orm";

/**
 * NEW this session — the schema for this (badges, memberBadges, memberEvents
 * in member-roles.ts) already existed, but no helper function called it yet.
 * Ported/adapted from the salvage's roles/events.ts pattern.
 *
 * Add a rule here when a new feature wants to award a badge. Features never
 * touch member_badges directly — they emit an event and stop caring.
 */
type BadgeRule = {
  eventType: string;
  badgeKey: string;
  condition?: (payload: Record<string, unknown>) => boolean;
};

const BADGE_RULES: BadgeRule[] = [
  { eventType: "workshop.project_completed", badgeKey: "workshop_builder" },
  // NEW this session — Arcade sub-piece 1. Fires from lib/arcade/streaks.ts.
  {
    eventType: "arcade.streak_hit",
    badgeKey: "arcade_7_day_streak",
    condition: (p) => typeof p.streakLength === "number" && p.streakLength >= 7,
  },
];

type DbOrTx = typeof db;

export async function emitMemberEvent(
  memberId: string,
  eventType: string,
  payload: Record<string, unknown> = {},
  executor: DbOrTx = db // callers inside a transaction pass `tx` here to keep this atomic with their own writes
): Promise<void> {
  await executor.insert(memberEvents).values({ memberId, eventType, payload });

  const matching = BADGE_RULES.filter(
    (r) => r.eventType === eventType && (!r.condition || r.condition(payload))
  );

  for (const rule of matching) {
    const [badge] = await executor.select().from(badges).where(eq(badges.key, rule.badgeKey)).limit(1);
    if (!badge) {
      // Loud, not silent: a rule referencing an unseeded badge is a config
      // bug, not something to swallow quietly. Seed the "workshop_builder"
      // badge row (via member-roles seed data or drizzle-kit studio) before
      // relying on this in production.
      console.warn(
        `[roles/events] badge rule references unseeded badge key "${rule.badgeKey}" — seed it or remove the rule.`
      );
      continue;
    }
    await executor
      .insert(memberBadges)
      .values({ memberId, badgeId: badge.id, sourceEvent: eventType })
      .onConflictDoNothing({ target: [memberBadges.memberId, memberBadges.badgeId] });
  }
}
