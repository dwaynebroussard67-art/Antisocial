export type Tier = "street" | "block" | "crib" | "pit";

export type SignalSurface =
  | "signal-board"
  | "front-porch"
  | "room"
  | "side-street"
  | "check-in"
  | "aftercare"
  | "pit-watch";

// RECONSTRUCTION FIX: the extractor's copy of this file was missing
// "pit-watch", but schema.ts declares it as a room type and permissions.ts
// compares against it — without it here, those comparisons are type errors.
export type RoomType =
  | "direct"
  | "group"
  | "protected"
  | "mission"
  | "prayer"
  | "witness"
  | "pit-watch";

export type MessageKind =
  | "text"
  | "voice"
  | "image"
  | "video"
  | "burn"
  | "pulse"
  | "check-in"
  | "mark";

export type CheckInKind =
  | "okay"
  | "listen"
  | "prayer"
  | "practical-help"
  | "unsafe"
  | "call-me";

export type VisibilityMode = "keep" | "fade" | "seal" | "burn";

export type RequestStatus = "pending" | "accepted" | "rejected" | "muted" | "redirected";

export type MarkKind = "heard" | "with-you" | "praying" | "solid" | "check-in";
