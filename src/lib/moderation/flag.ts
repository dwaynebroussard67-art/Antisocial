import { db } from "@/lib/db";
import { moderationFlags } from "@/lib/db/schema/moderation";

export type FlaggableContentType = "block_post" | "block_reply";

export async function flagForReview(params: {
  contentType: FlaggableContentType;
  contentId: string;
  reason: string;
  reportedBy?: string;
}): Promise<void> {
  await db.insert(moderationFlags).values({
    contentType: params.contentType,
    contentId: params.contentId,
    reason: params.reason,
    reportedBy: params.reportedBy ?? null,
    status: "pending",
  });
}
