import { getQuietMode, setConfig, CONFIG_KEYS } from "@/lib/nura/config";
import type { Site } from "@/lib/nura/types";

export const dynamic = "force-dynamic";

function isSite(v: unknown): v is Site {
  return v === "antisocial" || v === "misfit";
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const site = searchParams.get("site");
  if (!isSite(site)) {
    return Response.json({ error: "site must be 'antisocial' or 'misfit'" }, { status: 400 });
  }
  const quiet = await getQuietMode(site);
  return Response.json({ site, quiet });
}

export async function PUT(req: Request) {
  const body = await req.json();
  const { site, enabled } = body ?? {};
  if (!isSite(site) || typeof enabled !== "boolean") {
    return Response.json({ error: "site and boolean enabled are required" }, { status: 400 });
  }
  await setConfig(site, CONFIG_KEYS.QUIET_MODE, { enabled });
  return Response.json({ ok: true, site, quiet: { enabled } });
}
