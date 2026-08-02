// Run with: npx tsx scripts/seed-admin.ts
//
// One-time, idempotent: makes misfitministries2026@gmail.com the first
// admin. Without this, alertStaff() in lib/moderation/nura.ts finds zero
// staff and every Band B hold (Nura unsure, needs a human) sits invisible
// forever with nothing but a console.error. See docs/HANDOFF-37 §5 gap 1.
//
// Safe to re-run — checks before every write, never duplicates.
import { db } from "../src/lib/db";
import { members } from "../src/lib/db/schema/members";
import { memberRoles } from "../src/lib/db/schema/member-roles";
import { eq } from "drizzle-orm";

const ADMIN_EMAIL = "misfitministries2026@gmail.com";

async function main() {
  let [member] = await db.select().from(members).where(eq(members.email, ADMIN_EMAIL)).limit(1);

  if (!member) {
    [member] = await db
      .insert(members)
      .values({ email: ADMIN_EMAIL, isMinistryStaff: true })
      .returning();
    console.log(`Created member row for ${ADMIN_EMAIL}`);
  } else if (!member.isMinistryStaff) {
    [member] = await db
      .update(members)
      .set({ isMinistryStaff: true })
      .where(eq(members.id, member.id))
      .returning();
    console.log(`Marked existing member ${ADMIN_EMAIL} as ministry staff`);
  }

  const [existingRole] = await db
    .select()
    .from(memberRoles)
    .where(eq(memberRoles.memberId, member.id))
    .limit(1);

  if (!existingRole) {
    // Pit: the deepest tier, D's own. siteRole (admin) is what alertStaff()
    // actually checks — tier is set here because there's no reason the
    // founder's own account should sit below the tier he built.
    await db.insert(memberRoles).values({ memberId: member.id, siteRole: "admin", tier: "pit" });
    console.log(`Granted admin role + Pit tier to ${ADMIN_EMAIL}`);
  } else if (existingRole.siteRole !== "admin") {
    await db.update(memberRoles).set({ siteRole: "admin" }).where(eq(memberRoles.memberId, member.id));
    console.log(`Upgraded ${ADMIN_EMAIL} to admin`);
  } else {
    console.log(`${ADMIN_EMAIL} is already admin — nothing to do`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
