import type { Tier, RoomType, VisibilityMode, MessageKind } from "./types";

/**
 * RECONSTRUCTION FIXES in this file, called out for the handoff:
 *  1. `tierOrder` was referenced but never defined in the extracted copy —
 *     defined here, mirroring TIER_RANK in src/lib/auth/roles.ts exactly
 *     (street < block < crib < pit; the Pit sits at the top of the cascade).
 *     One doctrine, one ordering — if roles.ts ever changes, change this too.
 *  2. `canSendInRoom` did not exist anywhere — sendSignalMessage checked
 *     membership but ignored muted/canPost/canReply/boundaryOnly, meaning a
 *     muted member could still post. This was the known "message-sending
 *     permission gap." Closed here, enforced in service.ts.
 */

export const tierOrder: Tier[] = ["street", "block", "crib", "pit"];

export function tierRank(tier: Tier) {
  return tierOrder.indexOf(tier);
}

export function canAccessFloor(viewerTier: Tier, floor: Tier) {
  return tierRank(viewerTier) >= tierRank(floor);
}

export function canInviteIntoFloor(inviterTier: Tier, inviteeTier: Tier, roomFloor: Tier) {
  return canAccessFloor(inviterTier, roomFloor) && tierRank(roomFloor) <= tierRank(inviteeTier);
}

export function canCreateRoom(viewerTier: Tier, type: RoomType) {
  if (type === "direct") return true;
  if (type === "group" || type === "prayer") return viewerTier !== "street";
  if (type === "protected" || type === "mission" || type === "witness")
    return viewerTier === "crib" || viewerTier === "pit";
  // pit-watch rooms are system/ministry-created, never member-created.
  return false;
}

export function canUseVisibility(viewerTier: Tier, visibility: VisibilityMode) {
  if (visibility === "keep") return true;
  if (visibility === "fade") return viewerTier !== "street";
  if (visibility === "seal") return viewerTier === "crib" || viewerTier === "pit";
  if (visibility === "burn") return viewerTier === "block" || viewerTier === "crib" || viewerTier === "pit";
  return false;
}

export function canSeeMemberList(viewerTier: Tier, roomType: RoomType) {
  if (roomType === "protected" || roomType === "mission" || roomType === "pit-watch")
    return viewerTier === "crib" || viewerTier === "pit";
  return true;
}

export function canUseWitnessMode(viewerTier: Tier, roomType: RoomType) {
  return roomType === "prayer" || roomType === "witness" || viewerTier === "pit";
}

/** Room-membership flags that govern sending. Mirrors signal_room_members. */
export type SendMembership = {
  muted: boolean;
  canPost: boolean;
  canReply: boolean;
  boundaryOnly: boolean;
};

export type SendDenial =
  | "muted"
  | "cannot_post"
  | "cannot_reply"
  | "boundary_only";

/**
 * The message-send gate. Returns null when sending is allowed, or the
 * reason it isn't. Rules, in order:
 *  - muted blocks everything.
 *  - boundaryOnly restricts to low-pressure kinds: check-in and mark. This
 *    is the "provisional presence" flag — someone can signal they're here
 *    and receive care without opening a broadcast channel.
 *  - replies (parentMessageId set) require canReply; top-level requires
 *    canPost. The two flags are independent on purpose: read-and-reply
 *    members exist (canPost=false, canReply=true).
 */
export function canSendInRoom(
  membership: SendMembership,
  opts: { kind: MessageKind; isReply: boolean }
): SendDenial | null {
  if (membership.muted) return "muted";
  if (membership.boundaryOnly && opts.kind !== "check-in" && opts.kind !== "mark") {
    return "boundary_only";
  }
  if (opts.isReply) {
    if (!membership.canReply) return "cannot_reply";
  } else if (!membership.canPost) {
    return "cannot_post";
  }
  return null;
}
