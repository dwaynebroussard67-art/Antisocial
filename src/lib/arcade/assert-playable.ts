import { AccessDeniedError, type MemberTier } from "@/lib/auth/roles";
import { resolveVariantForViewer } from "./variants";

/**
 * THE ARCADE'S ACCESS CHECK, post-variants.
 *
 * Before this session every arcade route gated on requireBlockAccess() — a
 * flat tier floor. That is now the wrong question to ask. The Street plays
 * games too; what the tier decides is which BUILD you get, not whether you
 * get in.
 *
 * So routes take the Street floor (everyone) and then call this, which asks
 * the registry the real question: does this member have a build of this game
 * they're allowed to play? That folds in, in one place:
 *   - the game being registered and active at all
 *   - the tier resolution (own tier, else the best build below it)
 *   - the server-side age gate on adult-only builds
 *
 * Fails closed — no resolvable build means denied.
 */
export async function assertPlayable(
  gameKey: string,
  viewerTier: MemberTier,
  viewerId: string | null
) {
  const variant = await resolveVariantForViewer(gameKey, viewerTier, viewerId);
  if (!variant) {
    throw new AccessDeniedError(
      "insufficient_tier",
      `No build of "${gameKey}" is available to a ${viewerTier} viewer.`
    );
  }
  return variant;
}
