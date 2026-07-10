import { and, desc, eq, gt, inArray, isNull, or } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  signalAftercare,
  signalMarks,
  signalMessages,
  signalRequests,
  signalRoomMembers,
  signalRooms,
} from "@/lib/db/schema/signal";
import { canAccessFloor, canCreateRoom, canSendInRoom, canUseVisibility, canUseWitnessMode } from "./permissions";
import type { CheckInKind, RoomType, MessageKind, Tier, VisibilityMode } from "./types";

/**
 * RECONSTRUCTED from the v2-extractor zip, which truncated five function
 * bodies mid-stream (listSignalBoard, createRoom, getRoom,
 * createFrontPorchRequest/createCheckIn, accept/rejectRequest all ended
 * before their returns). Completions below are the minimal deterministic
 * closures of what each function had already set up — no new features.
 * Two deliberate changes beyond completion, both flagged in HANDOFF-28:
 *   1. db.query.* -> db.select(): this project's drizzle instance is
 *      created WITHOUT a schema object (src/lib/db/index.ts), so the
 *      relational query API doesn't exist here. select() everywhere.
 *   2. sendSignalMessage now enforces the membership flags via
 *      canSendInRoom — the known permission gap (muted members could post).
 */

export type Viewer = {
  memberId: string;
  tier: Tier;
};

export async function listSignalBoard(viewer: Viewer) {
  const memberships = await db
    .select({ roomId: signalRoomMembers.roomId })
    .from(signalRoomMembers)
    .where(eq(signalRoomMembers.memberId, viewer.memberId));

  const roomIds = memberships.map((m) => m.roomId);
  if (roomIds.length === 0) return [];

  return db
    .select()
    .from(signalRooms)
    .where(inArray(signalRooms.id, roomIds))
    .orderBy(desc(signalRooms.updatedAt));
}

export async function createRoom(input: {
  viewer: Viewer;
  name: string;
  slug: string;
  type: RoomType;
  trustFloor: Tier;
  memberIds?: string[];
  witnessDefault?: boolean;
}) {
  if (!canCreateRoom(input.viewer.tier, input.type)) {
    throw new Error("Not allowed to create this room type");
  }
  if (!canAccessFloor(input.viewer.tier, input.trustFloor)) {
    throw new Error("Trust floor not allowed");
  }

  const [room] = await db
    .insert(signalRooms)
    .values({
      name: input.name,
      slug: input.slug,
      type: input.type,
      trustFloor: input.trustFloor,
      createdByMemberId: input.viewer.memberId,
      witnessDefault: input.witnessDefault ?? false,
      isPrivate: true,
    })
    .returning();

  const memberIds = Array.from(new Set([input.viewer.memberId, ...(input.memberIds ?? [])]));
  await db.insert(signalRoomMembers).values(
    memberIds.map((memberId) => ({
      roomId: room.id,
      memberId,
      role: memberId === input.viewer.memberId ? ("owner" as const) : ("member" as const),
    })),
  );

  return room;
}

export async function getRoom(viewer: Viewer, roomId: string) {
  const [room] = await db.select().from(signalRooms).where(eq(signalRooms.id, roomId)).limit(1);
  if (!room) return null;
  if (!canAccessFloor(viewer.tier, room.trustFloor as Tier)) return null;

  const [membership] = await db
    .select()
    .from(signalRoomMembers)
    .where(and(eq(signalRoomMembers.roomId, roomId), eq(signalRoomMembers.memberId, viewer.memberId)))
    .limit(1);
  if (!membership) return null;

  const now = new Date();
  const roomMessages = await db
    .select()
    .from(signalMessages)
    .where(
      and(
        eq(signalMessages.roomId, roomId),
        isNull(signalMessages.deletedAt),
        or(isNull(signalMessages.expiresAt), gt(signalMessages.expiresAt, now)),
      ),
    )
    .orderBy(desc(signalMessages.createdAt))
    .limit(200);

  // Newest-first from the DB for the LIMIT; chronological for reading.
  roomMessages.reverse();

  return { room, membership, roomMessages };
}

export async function sendSignalMessage(input: {
  viewer: Viewer;
  roomId: string;
  kind?: MessageKind;
  body?: string | null;
  voiceUrl?: string | null;
  transcript?: string | null;
  visibility?: VisibilityMode;
  witnessMode?: boolean;
  parentMessageId?: string | null;
  expiresAt?: Date | null;
  metadata?: Record<string, unknown>;
}) {
  const [room] = await db.select().from(signalRooms).where(eq(signalRooms.id, input.roomId)).limit(1);
  if (!room) throw new Error("Room not found");
  if (!canAccessFloor(input.viewer.tier, room.trustFloor as Tier)) throw new Error("Tier blocked");

  const [membership] = await db
    .select()
    .from(signalRoomMembers)
    .where(and(eq(signalRoomMembers.roomId, input.roomId), eq(signalRoomMembers.memberId, input.viewer.memberId)))
    .limit(1);
  if (!membership) throw new Error("Not a room member");

  // THE previously missing gate: muted / canPost / canReply / boundaryOnly.
  const kind = input.kind ?? "text";
  const denial = canSendInRoom(membership, { kind, isReply: !!input.parentMessageId });
  if (denial) throw new Error(`Sending blocked: ${denial}`);

  const visibility = input.visibility ?? "keep";
  if (!canUseVisibility(input.viewer.tier, visibility)) throw new Error("Visibility not allowed");
  if (input.witnessMode && !canUseWitnessMode(input.viewer.tier, room.type as RoomType)) {
    throw new Error("Witness mode not allowed");
  }

  const [message] = await db
    .insert(signalMessages)
    .values({
      roomId: input.roomId,
      senderMemberId: input.viewer.memberId,
      parentMessageId: input.parentMessageId ?? null,
      kind,
      body: input.body ?? null,
      voiceUrl: input.voiceUrl ?? null,
      transcript: input.transcript ?? null,
      visibility,
      witnessMode: input.witnessMode ?? false,
      expiresAt: input.expiresAt ?? null,
      metadata: input.metadata ?? {},
    })
    .returning();

  await db.update(signalRooms).set({ updatedAt: new Date() }).where(eq(signalRooms.id, input.roomId));
  return message;
}

export async function createFrontPorchRequest(input: {
  viewer: Viewer;
  toMemberId: string;
  prompt: string;
  payload?: Record<string, unknown>;
}) {
  // RE-KNOCK POLICY (HANDOFF-29 open item, decided here to match the
  // words already on the door): the reject button says "Not now" — not
  // "never" — so a rejected knock may be knocked again, which resets the
  // old row to pending (the unique(from,to,type) index means there is
  // exactly one row to reset). Two protective exceptions:
  //   - muted: the receiver said do-not-contact. The knocker gets the
  //     same response shape as success (no signal that they're muted —
  //     telling them invites escalation), but the row stays muted and
  //     the receiver never sees a new pending request.
  //   - pending/accepted: idempotent, return the existing row.
  const [existing] = await db
    .select()
    .from(signalRequests)
    .where(
      and(
        eq(signalRequests.fromMemberId, input.viewer.memberId),
        eq(signalRequests.toMemberId, input.toMemberId),
        eq(signalRequests.type, "front-porch"),
      ),
    )
    .limit(1);

  if (existing) {
    if (existing.status === "rejected") {
      const [reopened] = await db
        .update(signalRequests)
        .set({ status: "pending", prompt: input.prompt, payload: input.payload ?? {}, createdAt: new Date(), resolvedAt: null })
        .where(eq(signalRequests.id, existing.id))
        .returning();
      return reopened;
    }
    return existing; // pending, accepted, muted, redirected: no new knock
  }

  const [request] = await db
    .insert(signalRequests)
    .values({
      fromMemberId: input.viewer.memberId,
      toMemberId: input.toMemberId,
      type: "front-porch",
      status: "pending",
      prompt: input.prompt,
      payload: input.payload ?? {},
    })
    .returning();

  return request;
}

export async function createCheckIn(input: {
  viewer: Viewer;
  toMemberId: string | null;
  kind: CheckInKind;
  prompt: string;
  payload?: Record<string, unknown>;
}) {
  const [request] = await db
    .insert(signalRequests)
    .values({
      fromMemberId: input.viewer.memberId,
      toMemberId: input.toMemberId ?? input.viewer.memberId,
      type: "check-in",
      status: "pending",
      prompt: input.prompt,
      payload: { kind: input.kind, ...(input.payload ?? {}) },
    })
    .returning();

  return request;
}

export async function listRequests(viewer: Viewer) {
  return db
    .select()
    .from(signalRequests)
    .where(eq(signalRequests.toMemberId, viewer.memberId))
    .orderBy(desc(signalRequests.createdAt));
}

/**
 * Accepting a front-porch request is what OPENS the door: it creates the
 * direct room between the two members (consent-first — no thread exists
 * until the receiver says yes) and links it back onto the request row.
 */
export async function acceptRequest(viewer: Viewer, requestId: string) {
  const [request] = await db.select().from(signalRequests).where(eq(signalRequests.id, requestId)).limit(1);
  if (!request) throw new Error("Request not found");
  if (request.toMemberId !== viewer.memberId) throw new Error("Forbidden");
  if (request.status !== "pending") return request;

  let roomId = request.roomId;
  if (!roomId && request.type === "front-porch") {
    const room = await createRoom({
      viewer,
      name: "Front Porch",
      slug: `porch-${request.id.slice(0, 8)}`,
      type: "direct",
      trustFloor: "street",
      memberIds: [request.fromMemberId],
    });
    roomId = room.id;
  }

  const [updated] = await db
    .update(signalRequests)
    .set({ status: "accepted", resolvedAt: new Date(), roomId })
    .where(eq(signalRequests.id, requestId))
    .returning();
  return updated;
}

export async function rejectRequest(viewer: Viewer, requestId: string) {
  const [request] = await db.select().from(signalRequests).where(eq(signalRequests.id, requestId)).limit(1);
  if (!request) throw new Error("Request not found");
  if (request.toMemberId !== viewer.memberId) throw new Error("Forbidden");
  if (request.status !== "pending") return request;

  const [updated] = await db
    .update(signalRequests)
    .set({ status: "rejected", resolvedAt: new Date() })
    .where(eq(signalRequests.id, requestId))
    .returning();
  return updated;
}

export async function addMark(input: {
  viewer: Viewer;
  messageId: string;
  mark: "heard" | "with-you" | "praying" | "solid" | "check-in";
}) {
  await db
    .insert(signalMarks)
    .values({
      messageId: input.messageId,
      memberId: input.viewer.memberId,
      mark: input.mark,
    })
    .onConflictDoNothing();
}

export async function setAftercare(input: {
  viewer: Viewer;
  requestId: string;
  nextContactAt?: Date | null;
  resourcesShared?: string[];
  wantsFollowUp?: boolean;
  notes?: string | null;
}) {
  const [record] = await db
    .insert(signalAftercare)
    .values({
      requestId: input.requestId,
      ownerMemberId: input.viewer.memberId,
      nextContactAt: input.nextContactAt ?? null,
      resourcesShared: input.resourcesShared ?? [],
      wantsFollowUp: input.wantsFollowUp ?? true,
      notes: input.notes ?? null,
    })
    .onConflictDoUpdate({
      target: signalAftercare.requestId,
      set: {
        nextContactAt: input.nextContactAt ?? null,
        resourcesShared: input.resourcesShared ?? [],
        wantsFollowUp: input.wantsFollowUp ?? true,
        notes: input.notes ?? null,
        updatedAt: new Date(),
      },
    })
    .returning();

  return record;
}
