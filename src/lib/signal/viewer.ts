import { getViewer } from "@/lib/auth/session";
import { getMemberTier } from "@/lib/auth/roles";
import type { Tier } from "./types";
import type { Viewer } from "./service";

/**
 * Adapter between antisocial's auth (getViewer -> {id, email} | null,
 * tier via roles) and the Signal service's Viewer shape {memberId, tier}.
 * Signal requires a signed-in member — anonymous Street visitors get null
 * here and a 401 from the routes; consent-based messaging needs a stable
 * identity on both ends.
 */
export async function getSignalViewer(): Promise<Viewer | null> {
  const viewer = await getViewer();
  if (!viewer) return null;
  const tier = (await getMemberTier(viewer.id)) as Tier;
  return { memberId: viewer.id, tier };
}
