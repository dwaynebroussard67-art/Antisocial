import { db } from "@/lib/db";
import { notifications, notificationTypeEnum } from "@/lib/db/schema/notifications";

type NotificationType = (typeof notificationTypeEnum.enumValues)[number];
type DbOrTx = typeof db;

// PORTED from salvage, unchanged in logic. Accepts a `tx` so callers can
// write the notification atomically with the event that triggered it
// (e.g. inside the same transaction as inserting a reply).
export async function notifyMember(
  params: { memberId: string; type: NotificationType; title: string; body: string; linkUrl?: string },
  executor: DbOrTx = db
): Promise<void> {
  await executor.insert(notifications).values(params);
}
