import { db } from "@/lib/db";
import { arcadeGames } from "@/lib/db/schema/arcade-core";
import { arcadeGameVariants } from "@/lib/db/schema/arcade-variants";
import { members } from "@/lib/db/schema/members";
import { eq } from "drizzle-orm";
import type { MemberTier } from "@/lib/auth/roles";
import { tierRank } from "@/lib/tiers/visibility";

/**
 * WHICH BUILD OF A GAME DOES THIS MEMBER GET?
 *
 * Not "which games can they reach" — every game reaches every tier now.
 * The tier decides which BUILD of it they play.
 *
 * Resolution rule: take the variant for the member's own tier. If that game
 * has no build at their tier, fall back to the highest build at or below
 * them. So a game that only ever ships a Street build is played by everyone,
 * in its Street form, and a Crib member is never handed a build above their
 * tier just because it's the only fancy one available.
 *
 * Fallback is DOWNWARD ONLY, always. The same direction as everything else
 * on this site.
 */

export type ResolvedVariant = {
  gameKey: string;
  gameName: string;
  kind: "solo_score" | "head_to_head" | "multiplayer";
  variantKey: string;
  title: string;
  blurb: string | null;
  assetBundle: string | null;
  /** The tier this build belongs to — may be BELOW the viewer's tier. */
  variantTier: MemberTier;
};

/**
 * Every playable build for a viewer, one row per game.
 *
 * Age gate: a variant with `min_age` set is dropped unless the viewer is a
 * verified adult. This is enforced HERE, on the read, so it holds for every
 * caller — the arcade page, a deep link, a future invite flow — rather than
 * in whichever component happens to render the tile. Fails closed: an
 * unverified or anonymous viewer is treated as a minor.
 */
export async function getPlayableVariants(
  viewerTier: MemberTier,
  viewerId: string | null
): Promise<ResolvedVariant[]> {
  const isVerifiedAdult = await isAdult(viewerId);

  const rows = await db
    .select({
      gameKey: arcadeGameVariants.gameKey,
      gameName: arcadeGames.name,
      kind: arcadeGames.kind,
      gameActive: arcadeGames.active,
      variantKey: arcadeGameVariants.variantKey,
      title: arcadeGameVariants.title,
      blurb: arcadeGameVariants.blurb,
      assetBundle: arcadeGameVariants.assetBundle,
      variantTier: arcadeGameVariants.tier,
      minAge: arcadeGameVariants.minAge,
    })
    .from(arcadeGameVariants)
    .innerJoin(arcadeGames, eq(arcadeGames.key, arcadeGameVariants.gameKey))
    .where(eq(arcadeGameVariants.active, true));

  const viewerRank = tierRank(viewerTier);
  const bestPerGame = new Map<string, (typeof rows)[number]>();

  for (const row of rows) {
    // arcade_games.active is text("true"/"false") in the existing schema,
    // not a boolean — matching how arcade-core.ts declared it. Compare as
    // text rather than coercing, so a row reading "false" is honoured.
    if (row.gameActive !== "true") continue;

    // Never hand anyone a build above their tier.
    if (tierRank(row.variantTier) > viewerRank) continue;

    // Age gate, fail-closed.
    if (row.minAge !== null && !isVerifiedAdult) continue;

    const incumbent = bestPerGame.get(row.gameKey);
    if (!incumbent || tierRank(row.variantTier) > tierRank(incumbent.variantTier)) {
      bestPerGame.set(row.gameKey, row);
    }
  }

  // Array.from rather than spread: this project's tsconfig targets below
  // ES2015, where spreading a Map iterator doesn't compile.
  return Array.from(bestPerGame.values())
    .map((r) => ({
      gameKey: r.gameKey,
      gameName: r.gameName,
      kind: r.kind,
      variantKey: r.variantKey,
      title: r.title,
      blurb: r.blurb,
      assetBundle: r.assetBundle,
      variantTier: r.variantTier,
    }))
    .sort((a, b) => a.title.localeCompare(b.title));
}

/**
 * Single-game resolution, for a game page that already knows its key.
 * Returns null when the viewer has no build they're allowed to play —
 * which is the correct answer for a minor hitting an adults-only game,
 * and must be rendered as "not available," never as a locked-but-visible
 * tile that tells a minor what they're missing.
 */
export async function resolveVariantForViewer(
  gameKey: string,
  viewerTier: MemberTier,
  viewerId: string | null
): Promise<ResolvedVariant | null> {
  const all = await getPlayableVariants(viewerTier, viewerId);
  return all.find((v) => v.gameKey === gameKey) ?? null;
}

async function isAdult(viewerId: string | null): Promise<boolean> {
  if (!viewerId) return false; // anonymous Street visitor — treated as a minor.

  const [row] = await db
    .select({ adultVerifiedAt: members.adultVerifiedAt })
    .from(members)
    .where(eq(members.id, viewerId))
    .limit(1);

  // No row, or a row with no verification timestamp, both mean "not a
  // verified adult." Only an explicit timestamp opens the gate.
  return Boolean(row?.adultVerifiedAt);
}
