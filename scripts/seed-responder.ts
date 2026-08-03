// Run with: npx tsx scripts/seed-responder.ts
// Requires DATABASE_URL and RESPONDER_EMAIL to be set.
//
// WHO ANSWERS THE CALL (HANDOFF-37 §4a).
//
// Nura's alerts go to members whose site_role is 'admin' or 'moderator'. If no
// such row exists, alertStaff() selects zero recipients, every hold sits
// forever, and NOTHING ERRORS — the failure is completely silent, which is the
// worst possible shape for a child-safety alert path.
//
// This script is the fix. It grants site_role='admin' and marks the member an
// active Misfit First Responder, so crisis and predation alerts have somewhere
// to land.
//
// The email is read from RESPONDER_EMAIL rather than hardcoded. This repository
// is public; the responder's address does not belong in it.
//
// Idempotent — safe to re-run, and safe to run for a second responder later.
// Nothing here assumes exactly one responder; it only refuses to assume zero.

import { db } from "../src/lib/db";
import { members } from "../src/lib/db/schema/members";
import { memberRoles } from "../src/lib/db/schema/member-roles";
import { eq } from "drizzle-orm";

async function main() {
  const email = process.env.RESPONDER_EMAIL?.trim().toLowerCase();

  if (!email) {
    console.error(
      "[seed:responder] RESPONDER_EMAIL is not set.\n" +
        "  This is the address Nura's crisis and predation alerts go to.\n" +
        "  Set it and re-run:  RESPONDER_EMAIL=you@example.com npx tsx scripts/seed-responder.ts"
    );
    process.exit(1);
  }

  const [member] = await db
    .select({ id: members.id, email: members.email, displayName: members.displayName })
    .from(members)
    .where(eq(members.email, email))
    .limit(1);

  if (!member) {
    // Deliberately does NOT create the row. A members row is created by
    // signing in, and inventing one here would make an account that no auth
    // identity can ever reach — an admin nobody can log into.
    console.error(
      `[seed:responder] No member found with email ${email}.\n` +
        "  Sign in to the site once with that address first, then re-run this.\n" +
        "  (Not auto-creating the row on purpose: a members row with no\n" +
        "   auth_user_id is an admin account nobody can ever sign into.)"
    );
    process.exit(1);
  }

  const now = new Date();

  // Upsert rather than update: a member who has somehow never had a role row
  // would otherwise match zero rows and this would silently do nothing — the
  // exact silent-failure shape this script exists to prevent.
  await db
    .insert(memberRoles)
    .values({
      memberId: member.id,
      siteRole: "admin",
      isMisfitFirstResponder: true,
      responderActivatedAt: now,
    })
    .onConflictDoUpdate({
      target: memberRoles.memberId,
      set: {
        siteRole: "admin",
        isMisfitFirstResponder: true,
        responderActivatedAt: now,
        updatedAt: now,
      },
      // Tier is deliberately NOT set here. Promotion authority is site_role,
      // never tier (see lib/tiers/promotion.ts), and this script grants the
      // authority to answer calls — not a rung on the ladder.
    });

  // Verify rather than assume. This script's whole purpose is closing a silent
  // failure, so it must not itself fail silently.
  const [check] = await db
    .select({
      siteRole: memberRoles.siteRole,
      isResponder: memberRoles.isMisfitFirstResponder,
      tier: memberRoles.tier,
    })
    .from(memberRoles)
    .where(eq(memberRoles.memberId, member.id))
    .limit(1);

  if (check?.siteRole !== "admin" || !check?.isResponder) {
    console.error("[seed:responder] Write did not take effect. Check the database.", check);
    process.exit(1);
  }

  const who = member.displayName ?? email;
  console.log(
    `[seed:responder] ${who} is now site_role=admin, active responder ` +
      `(tier unchanged: ${check.tier}).\n` +
      "  Nura's crisis and predation alerts now have a recipient."
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
