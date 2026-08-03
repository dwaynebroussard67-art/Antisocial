// NURA — demo seed data. Idempotent: safe to run more than once.
// Run with: npx tsx src/db/seed.ts

import "dotenv/config";
import { db, pool } from "./index";
import { members, memberRoles, nuraConfig } from "./schema";
import { eq } from "drizzle-orm";
import {
  CONFIG_KEYS,
  DEFAULT_CLASS_ACTION_MAP,
  DEFAULT_QUIET_MODE,
  DEFAULT_REMINDER_COPY,
  DEFAULT_THRESHOLDS,
  DEFAULT_TIER1_PACKS,
} from "@/lib/nura/config";
import type { Site } from "@/lib/nura/types";

async function upsertMember(handle: string, displayName: string, tier: string) {
  const [existing] = await db.select().from(members).where(eq(members.handle, handle)).limit(1);
  if (existing) return existing;
  const [created] = await db.insert(members).values({ handle, displayName, tier }).returning();
  return created;
}

async function seedConfig(site: Site) {
  const seeds: Array<[string, unknown]> = [
    [CONFIG_KEYS.TIER1_PACKS, DEFAULT_TIER1_PACKS[site]],
    [CONFIG_KEYS.THRESHOLDS, DEFAULT_THRESHOLDS[site]],
    [CONFIG_KEYS.CLASS_ACTION_MAP, DEFAULT_CLASS_ACTION_MAP[site]],
    [CONFIG_KEYS.REMINDER_COPY, DEFAULT_REMINDER_COPY[site]],
    [CONFIG_KEYS.QUIET_MODE, DEFAULT_QUIET_MODE[site]],
  ];
  const rows = await db.select().from(nuraConfig);
  for (const [key, value] of seeds) {
    // Only insert if this exact (site, key) doesn't exist yet — don't clobber
    // hand-tuned config on re-seed.
    const already = rows.some((r) => r.site === site && r.key === key);
    if (!already) {
      await db.insert(nuraConfig).values({ site, key, value: value as object });
    }
  }
}

async function main() {
  const dee = await upsertMember("d", "D", "keeper");
  const gee = await upsertMember("gee", "Gee", "street");
  const mo = await upsertMember("mo", "Mo", "street");
  const rev = await upsertMember("rev_alvarez", "Rev. Alvarez", "crib");
  const kay = await upsertMember("kay", "Kay", "crib");
  const responderSam = await upsertMember("sam_responder", "Sam", "crib");

  const [dRole] = await db.select().from(memberRoles).where(eq(memberRoles.memberId, dee.id)).limit(1);
  if (!dRole) {
    await db.insert(memberRoles).values({ memberId: dee.id, role: "admin", site: null });
  }
  const responderRoles = await db
    .select()
    .from(memberRoles)
    .where(eq(memberRoles.memberId, responderSam.id));
  if (responderRoles.length === 0) {
    await db.insert(memberRoles).values({ memberId: responderSam.id, role: "responder", site: null });
  }

  await seedConfig("antisocial");
  await seedConfig("misfit");

  console.log("Seed complete:", {
    members: [dee.handle, gee.handle, mo.handle, rev.handle, kay.handle, responderSam.handle],
  });
}

main()
  .then(() => pool.end())
  .catch((err) => {
    console.error(err);
    return pool.end().finally(() => process.exit(1));
  });
