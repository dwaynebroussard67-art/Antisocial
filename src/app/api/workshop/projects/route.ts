import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { workshopProjects, workshopVolunteers } from "@/lib/db/schema/workshop";
import { requireCribAccess, AccessDeniedError } from "@/lib/auth/roles";
import { desc, sql } from "drizzle-orm";
import { z } from "zod";

// PORTED from salvage. requireHouseAccess -> requireCribAccess (tier rename).
// Whoever creates a project is auto-enrolled as its "Lead" volunteer.

const createSchema = z.object({
  title: z.string().trim().min(1).max(200),
  missionStatement: z.string().trim().min(1).max(500),
  description: z.string().trim().min(1).max(3000),
});

export async function GET() {
  const rows = await db
    .select({
      id: workshopProjects.id,
      title: workshopProjects.title,
      missionStatement: workshopProjects.missionStatement,
      status: workshopProjects.status,
      progressPercent: workshopProjects.progressPercent,
      coverPhotoUrls: workshopProjects.coverPhotoUrls,
      createdAt: workshopProjects.createdAt,
      volunteerCount: sql<number>`(
        SELECT count(*)::int FROM workshop_volunteers
        WHERE project_id = ${workshopProjects.id} AND status = 'active'
      )`,
    })
    .from(workshopProjects)
    .orderBy(desc(workshopProjects.createdAt));

  return NextResponse.json({ projects: rows });
}

export async function POST(req: NextRequest) {
  let viewer;
  try {
    viewer = (await requireCribAccess()).viewer;
    if (!viewer) throw new AccessDeniedError("unauthenticated", "Sign in required.");
  } catch (err) {
    if (err instanceof AccessDeniedError) {
      return NextResponse.json({ error: err.reason }, { status: err.reason === "unauthenticated" ? 401 : 403 });
    }
    throw err;
  }

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", details: parsed.error.flatten() }, { status: 400 });
  }

  const [project] = await db
    .insert(workshopProjects)
    .values({ ...parsed.data, createdBy: viewer.id })
    .returning();

  await db.insert(workshopVolunteers).values({ projectId: project.id, memberId: viewer.id, role: "Lead" });

  return NextResponse.json({ project }, { status: 201 });
}
