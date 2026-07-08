import { db } from "@/lib/db";
import { workshopVolunteers, workshopProjects } from "@/lib/db/schema/workshop";
import { emitMemberEvent } from "@/lib/roles/events";
import { and, eq } from "drizzle-orm";

export class WorkshopError extends Error {
  constructor(public code: "not_found" | "already_active" | "not_a_volunteer") {
    super(code);
  }
}

export async function joinProject(projectId: string, memberId: string, role?: string): Promise<void> {
  const [existing] = await db
    .select()
    .from(workshopVolunteers)
    .where(and(eq(workshopVolunteers.projectId, projectId), eq(workshopVolunteers.memberId, memberId)))
    .limit(1);

  if (existing?.status === "active") throw new WorkshopError("already_active");

  if (existing) {
    await db
      .update(workshopVolunteers)
      .set({ status: "active", role: role ?? existing.role })
      .where(eq(workshopVolunteers.id, existing.id));
  } else {
    await db.insert(workshopVolunteers).values({ projectId, memberId, role: role ?? null });
  }
}

export async function leaveProject(projectId: string, memberId: string): Promise<void> {
  const result = await db
    .update(workshopVolunteers)
    .set({ status: "left" })
    .where(
      and(
        eq(workshopVolunteers.projectId, projectId),
        eq(workshopVolunteers.memberId, memberId),
        eq(workshopVolunteers.status, "active")
      )
    )
    .returning({ id: workshopVolunteers.id });

  if (result.length === 0) throw new WorkshopError("not_a_volunteer");
}

// Only path that awards the completion badge — marking a project complete
// through any other route (there is none) would silently skip badge
// awarding, which is exactly why this logic lives in one place.
export async function completeProject(projectId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const [project] = await tx.select().from(workshopProjects).where(eq(workshopProjects.id, projectId)).limit(1);
    if (!project) throw new WorkshopError("not_found");

    await tx
      .update(workshopProjects)
      .set({ status: "completed", completedAt: new Date(), progressPercent: 100 })
      .where(eq(workshopProjects.id, projectId));

    const activeVolunteers = await tx
      .select({ memberId: workshopVolunteers.memberId })
      .from(workshopVolunteers)
      .where(and(eq(workshopVolunteers.projectId, projectId), eq(workshopVolunteers.status, "active")));

    for (const v of activeVolunteers) {
      await emitMemberEvent(v.memberId, "workshop.project_completed", { projectId }, tx);
    }
  });
}
