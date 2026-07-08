import { redirect } from "next/navigation";
import { requireBlockAccess, AccessDeniedError } from "@/lib/auth/roles";
import { NavBar } from "@/components/NavBar";
import { getViewer } from "@/lib/auth/session";
import { NuraPresence } from "@/components/NuraPresence";
import Image from "next/image";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function BlockPage() {
  let tier;
  try {
    ({ tier } = await requireBlockAccess());
  } catch (err) {
    if (err instanceof AccessDeniedError) redirect("/");
    throw err;
  }

  const viewer = await getViewer();

  return (
    <main>
      <NavBar viewerTier={tier} viewer={viewer} />

      <section style={{ position: "relative", height: "40vh" }}>
        <Image
          src="/images/brand/king-knight-kneeling-v2.jpg"
          alt="A king and an armored knight standing over a kneeling man, fire behind them"
          fill
          style={{ objectFit: "cover", objectPosition: "center 30%" }}
        />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(10,9,8,0.1), rgba(10,9,8,0.95))" }} />
      </section>

      <section style={{ padding: "2rem", maxWidth: "720px" }}>
        <p className="label" style={{ color: "var(--tier-block)" }}>BLOCK</p>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2rem", marginTop: "0.5rem" }}>
          Closer than the street. Not all the way home yet.
        </h1>
        <p style={{ color: "var(--text-secondary)", marginTop: "1rem", lineHeight: 1.6 }}>
          You gave us something real to reach you by. That means something.
          The doctrine here gets sharper and more specific — this is not the
          blonde-hair, blue-eyed Jesus. This is the dark-skinned, Afroasiatic
          Christ of the Ethiopian Tewahedo tradition, taught plainly. The
          games get better too. And people here are starting to actually know
          you, the way you're starting to know them.
        </p>
      </section>

      <section style={{ padding: "0 2rem", display: "grid", gap: "1.5rem", maxWidth: "720px" }}>
        <Card title="Doctrine, unfiltered" body="The 81-book canon, taught without apology. Weekly studies tied to the Friday teachings." />
      </section>

      <section style={{ position: "relative", height: "36vh", margin: "2rem 0" }}>
        <Image
          src="/images/brand/word-deliverance-cross-v2.jpg"
          alt="A gold cross with Hebrew script, the word Deliverance"
          fill
          style={{ objectFit: "cover" }}
        />
      </section>

      <section style={{ padding: "0 2rem 3rem", display: "grid", gap: "1.5rem", maxWidth: "720px" }}>
        <Link href="/block/arcade" style={{ textDecoration: "none", color: "inherit" }}>
          <Card title="Better games" body="Daily trivia, word scramble, reaction timer, coin flip streak — head-to-head matches and ranked play are next." />
        </Link>
        <Card title="The Workshop" body="Real volunteer projects. Join one, lead one, build something with your hands alongside people who show up." />
        <Card title="Mission Board" body="See what the community actually needs right now, and what you can offer." />
      </section>

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
