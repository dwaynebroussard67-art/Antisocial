import { redirect } from "next/navigation";
import { requireCribAccess, AccessDeniedError } from "@/lib/auth/roles";
import { NavBar } from "@/components/NavBar";
import { getViewer } from "@/lib/auth/session";
import { NuraPresence } from "@/components/NuraPresence";
import { UpstairsPresence } from "@/components/UpstairsPresence";
import Image from "next/image";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function CribPage() {
  let tier;
  let isAdmin: boolean | undefined;
  try {
    ({ tier, isAdmin } = await requireCribAccess());
  } catch (err) {
    if (err instanceof AccessDeniedError) redirect("/");
    throw err;
  }

  const viewer = await getViewer();

  return (
    <main>
      <NavBar viewerTier={tier} viewer={viewer} isAdmin={isAdmin} />

      <section style={{ position: "relative", height: "40vh" }}>
        <Image
          src="/images/brand/hero-anointing.jpg"
          alt="A kneeling figure, marked and steadied by those who came before"
          fill
          style={{ objectFit: "cover", objectPosition: "center 25%" }}
        />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(10,9,8,0.1), rgba(10,9,8,0.95))" }} />
      </section>

      <section style={{ padding: "2rem", maxWidth: "720px" }}>
        <p className="label" style={{ color: "var(--tier-crib)" }}>THE CRIB</p>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2rem", marginTop: "0.5rem" }}>
          This is where bonds get made, not just met.
        </h1>
        <p style={{ color: "var(--text-secondary)", marginTop: "1rem", lineHeight: 1.6 }}>
          You're here because you gave real time, or because you're staff —
          either way, that was earned, not bought and not farmed through a
          game. This is where accountability holds, where the ministry
          actually gets shaped, and where the best of what we've built lives.
        </p>
      </section>

      <section style={{ padding: "0 2rem 3rem", display: "grid", gap: "1.5rem", maxWidth: "720px" }}>
        <Link href="/block/arcade" style={{ textDecoration: "none", color: "inherit" }}>
          <Card title="The best games" body="Same Arcade as the Block for now — Crib-exclusive games are still on the roadmap." />
        </Link>
        <Card title="Leadership on the Workshop" body="Lead projects, not just join them." />
        <Card title="Direct accountability" body="Small circles. Real names. Real follow-through." />
      </section>

      <section style={{ position: "relative", height: "44vh", margin: "0 0 2rem" }}>
        <Image
          src="/images/brand/cross-embrace-portrait.jpg"
          alt="One man steadying another in a close embrace, marked by the same wounds"
          fill
          style={{ objectFit: "cover" }}
        />
      </section>

      {/* One level up: the Pit. Presence only, same as every other floor —
          "nothing sees the Pit" means nothing sees INTO it. The Crib can
          see someone's down there; it can't call to them. */}
      <UpstairsPresence viewerTier={tier} />

      <NuraPresence />
    </main>
  );
}

function Card({ title, body }: { title: string; body: string }) {
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "1.25rem", background: "var(--surface-1)" }}>
      <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", margin: 0 }}>{title}</h3>
      <p style={{ color: "var(--text-secondary)", marginTop: "0.5rem", lineHeight: 1.5 }}>{body}</p>
    </div>
  );
}
