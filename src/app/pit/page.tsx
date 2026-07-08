import { redirect } from "next/navigation";
import { requirePitAccess, AccessDeniedError } from "@/lib/auth/roles";
import { NavBar } from "@/components/NavBar";
import { getViewer } from "@/lib/auth/session";
import { NuraPresence } from "@/components/NuraPresence";
import { AlertLedgerBoard } from "@/components/AlertLedgerBoard";
import { db } from "@/lib/db";
import { alertLedgerEntries } from "@/lib/db/schema/alert-ledger";
import { desc } from "drizzle-orm";
import Image from "next/image";

export const dynamic = "force-dynamic";

export default async function PitPage() {
  let tier;
  try {
    ({ tier } = await requirePitAccess());
  } catch (err) {
    if (err instanceof AccessDeniedError) redirect("/");
    throw err;
  }

  const viewer = await getViewer();

  const entries = await db
    .select()
    .from(alertLedgerEntries)
    .orderBy(desc(alertLedgerEntries.incidentDate))
    .limit(200);

  return (
    <main>
      <NavBar viewerTier={tier} viewer={viewer} />

      <section style={{ position: "relative", height: "42vh" }}>
        <Image
          src="/images/brand/harrowing-dead-man-walking.jpg"
          alt="A hooded figure, hands reaching up from the grave, The Harrowing"
          fill
          style={{ objectFit: "cover", objectPosition: "center 20%" }}
        />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(10,9,8,0.15), rgba(10,9,8,0.95))" }} />
      </section>

      <section style={{ padding: "2rem", maxWidth: "720px" }}>
        <p className="label" style={{ color: "var(--tier-pit)" }}>THE PIT</p>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2rem", marginTop: "0.5rem" }}>
          Where the pain gets shed.
        </h1>
        <p style={{ color: "var(--text-secondary)", marginTop: "1rem", lineHeight: 1.6 }}>
          No games down here. This is a place for quiet, for prayer, and for
          the people who've answered a call at two in the morning and gone
          out to try to save somebody's life. Nura is present here as a
          protective, praying spirit. The minister prays and sits with people
          directly, and shares his own scars — that part doesn't scale, and
          it isn't supposed to.
        </p>
      </section>

      <section style={{ position: "relative", height: "34vh", margin: "0 0 2rem" }}>
        <Image
          src="/images/brand/warrior-angel-fire-v2.jpg"
          alt="An armored angel with wings, gold light, standing watch"
          fill
          style={{ objectFit: "cover" }}
        />
      </section>

      <section style={{ padding: "0 2rem 3rem", maxWidth: "720px" }}>
        <AlertLedgerBoard entries={entries as any} />
      </section>

      <NuraPresence />
    </main>
  );
}
