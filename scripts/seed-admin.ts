// Run with: npm run seed-admin
//
// Establishes the ONE set-aside administrative account and makes sure no
// other account holds admin. D's direction: the personal account he signs
// in with day to day should not be the account that carries administrative
// authority — that gets separated out into a dedicated ministry address.
//
// Two things this fixes at once:
//   1. alertStaff() in lib/moderation/nura.ts finds staff by site_role.
//      With nobody holding admin, every Band B hold (Nura unsure, needs a
//      human) sits invisible forever behind a console.error.
//      See docs/HANDOFF-37 §5 gap 1.
//   2. Admin authority stops riding on a personal account.
//
// It demotes any OTHER admin rather than naming a specific personal address
// to remove — that way there is no second place in this repo where a private
// email has to be written down, and the invariant it enforces is the real
// one: exactly one administrative account, and it is this one.
//
// Demotion is siteRole -> "member" only. It never deletes a member row:
// members cascade-delete their posts, badges and history, and losing that
// is not what "remove admin credentials" means.
//
// Safe to re-run. Prints every change it makes.
import { db } from "../src/lib/db";
import { members } from "../src/lib/db/schema/members";
import { memberRoles } from "../src/lib/db/schema/member-roles";
import { eq, ne, and, inArray } from "drizzle-orm";

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
    // Pit: the deepest tier. siteRole (admin) is what alertStaff() actually
    // checks — tier is set here because there's no reason the account that
    // answers every alert should sit below the tier it watches over.
    await db.insert(memberRoles).values({ memberId: member.id, siteRole: "admin", tier: "pit" });
    console.log(`Granted admin + Pit tier to ${ADMIN_EMAIL}`);
  } else if (existingRole.siteRole !== "admin" || existingRole.tier !== "pit") {
    await db
      .update(memberRoles)
      .set({ siteRole: "admin", tier: "pit" })
      .where(eq(memberRoles.memberId, member.id));
    console.log(`Upgraded ${ADMIN_EMAIL} to admin + Pit tier`);
  } else {
    console.log(`${ADMIN_EMAIL} already holds admin + Pit — no change`);
  }

  // Anyone ELSE holding admin loses it. This is the half that actually
  // separates administrative authority from a personal account.
  const others = await db
    .select({ memberId: memberRoles.memberId, email: members.email })
    .from(memberRoles)
    .innerJoin(members, eq(members.id, memberRoles.memberId))
    .where(and(eq(memberRoles.siteRole, "admin"), ne(memberRoles.memberId, member.id)));

  if (others.length === 0) {
    console.log("No other account holds admin.");
  } else {
    await db
      .update(memberRoles)
      .set({ siteRole: "member" })
      .where(
        and(
          eq(memberRoles.siteRole, "admin"),
          inArray(
            memberRoles.memberId,
            others.map((o) => o.memberId)
          )
        )
      );
    for (const o of others) {
      // Tier is deliberately untouched — this removes administrative
      // authority, not someone's standing in the community.
      console.log(`Removed admin from ${o.email ?? o.memberId} (tier unchanged)`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
