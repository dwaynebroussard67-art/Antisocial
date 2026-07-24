import type { MemberTier } from "@/lib/auth/roles";
import { AccessDeniedError } from "@/lib/auth/roles";

/**
 * THE LADDER (D's correction, this session).
 *
 * Two rules that were previously only half-encoded:
 *
 *  1. SEE ONE LEVEL UP — but presence only.
 *     Everyone can see that the tier directly above them exists and who is
 *     active in it. That's the whole of it: names and a live/idle dot.
 *     Not their conversations, not their rooms, not their content.
 *
 *  2. INTERACT DOWNWARD ONLY, NEVER UP.
 *     You may talk to your own tier and every tier beneath it. You may not
 *     talk to, ping, alert, invite, challenge, or otherwise touch anyone
 *     above you — including the tier you can see. Observation is the entire
 *     permitted interaction with the floor above you.
 *
 * So: the Street can see who's on the Block and that they're here. It can't
 * read them, can't reach them, can't disturb them. The Block can see and
 * talk to the Street, talk on the Block, and can see the Crib is occupied
 * without seeing into it. The Crib talks all the way down and sees the Pit.
 * The Pit sees everybody and can reach anybody — earned. Nobody reaches
 * up into the Pit.
 *
 * roles.ts's TIER_RANK already encoded downward *visibility*. What did not
 * exist anywhere was (a) the one-level-up presence peek and (b) an explicit
 * interaction gate. Feature code kept re-deriving "can A reach B?" from a
 * tier-floor check, which is the wrong question — a floor check asks "is
 * this viewer high enough for this page," not "is this target beneath this
 * actor." Those differ exactly when the target is above the actor, which is
 * the case this whole file exists to forbid.
 */

export const TIER_ORDER: MemberTier[] = ["street", "block", "crib", "pit"];

export function tierRank(tier: MemberTier): number {
  return TIER_ORDER.indexOf(tier);
}

/**
 * The tier directly above `tier`, or null at the top. This is the ONLY
 * tier above the viewer they get any signal about at all.
 */
export function tierAbove(tier: MemberTier): MemberTier | null {
  const next = TIER_ORDER[tierRank(tier) + 1];
  return next ?? null;
}

export type TierVisibility =
  /** Full read access: this tier's content, rooms, boards, conversations. */
  | "full"
  /** Presence board only: who is here, are they active. Nothing else. */
  | "presence_only"
  /** No signal at all. This tier does not exist as far as the viewer knows. */
  | "none";

/**
 * What a viewer at `viewerTier` may see of `targetTier`.
 *
 * Note the Pit is deliberately NOT special-cased as invisible here: the Crib
 * sits directly below it and gets the same presence-only peek every tier
 * gets of the floor above it. "Nothing sees the Pit" means nothing sees
 * *into* the Pit — its rooms, its calls, its content. That's `presence_only`,
 * not `none`. Anything more than two rungs down gets `none`.
 */
export function tierVisibility(viewerTier: MemberTier, targetTier: MemberTier): TierVisibility {
  const delta = tierRank(targetTier) - tierRank(viewerTier);
  if (delta <= 0) return "full";
  if (delta === 1) return "presence_only";
  return "none";
}

/**
 * Can `viewerTier` initiate ANY interaction with someone at `targetTier`?
 * Message, reply, challenge, invite, cheer, mention, notify — all of it.
 *
 * Downward and lateral only. This is the single function every feature
 * should call before letting one member act on another; do not re-derive
 * it from a tier-floor check.
 */
export function canInteractWith(viewerTier: MemberTier, targetTier: MemberTier): boolean {
  return tierRank(viewerTier) >= tierRank(targetTier);
}

/**
 * Can `viewerTier` observe the presence board of `targetTier`?
 * True for their own tier, everything below, and exactly one tier above.
 */
export function canObservePresence(viewerTier: MemberTier, targetTier: MemberTier): boolean {
  return tierVisibility(viewerTier, targetTier) !== "none";
}

/**
 * Throwing form of `canInteractWith`, for route handlers and services.
 * Reuses AccessDeniedError so existing 401/403 mapping in the API layer
 * catches it without every caller learning a new error type.
 */
export function assertCanInteractWith(viewerTier: MemberTier, targetTier: MemberTier): void {
  if (!canInteractWith(viewerTier, targetTier)) {
    throw new AccessDeniedError(
      "insufficient_tier",
      `Interaction flows downward only: ${viewerTier} cannot reach ${targetTier}.`
    );
  }
}

/**
 * PIT REACHES EVERYONE, PIT PROMOTES NO ONE.
 *
 * Called out as its own predicate because the Pit is the one tier where
 * "can reach anybody" is true, and it would be an easy and bad inference to
 * read that as authority. It isn't. The Pit earned range, not rank-granting
 * power. Promotion authority lives on site_role (staff/admin) and is checked
 * in tiers/promotion.ts — never on tier, and never here.
 */
export function canPromoteByTier(_viewerTier: MemberTier): false {
  return false;
}
