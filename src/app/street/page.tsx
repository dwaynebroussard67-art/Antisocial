import { requireStreetAccess } from "@/lib/auth/roles";
import { NavBar } from "@/components/NavBar";
import { NuraPresence } from "@/components/NuraPresence";
import Image from "next/image";

export default async function StreetPage() {
  const { tier } = await requireStreetAccess();

  return (
    <main>
      <NavBar viewerTier={tier} />

      <section style={{ padding: "2rem", maxWidth: "720px" }}>
        <p className="label" style={{ color: "var(--tier-street)" }}>STREET</p>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2rem", marginTop: "0.5rem" }}>
          You don't owe anybody an explanation to be here.
        </h1>
        <p style={{ color: "var(--text-secondary)", marginTop: "1rem", lineHeight: 1.6 }}>
          This is the open door. No email, no history, no questions. Look
          around, play something, find out who we are and what we teach —
          the dark-skinned, Ethiopian Christ of the Tewahedo canon, not the
          version you were handed. Nura's watching over this whole site,
          including right here.
        </p>
      </section>

      <section style={{ position: "relative", height: "50vh", margin: "2rem 0" }}>
        <Image
          src="/images/brand/alley-glow-figure.jpg"
          alt="A figure alone at night, still carrying a light nobody's noticed yet"
          fill
          style={{ objectFit: "cover" }}
        />
      </section>

      <section style={{ padding: "0 2rem 3rem", display: "grid", gap: "1.5rem", maxWidth: "720px" }}>
        <Card title="Games" body="Chess, checkers, the basics. Better games open up on the Block." />
        <Card title="What we teach" body="A short introduction to the Ethiopian Tewahedo canon — why 81 books, not 66, and why it matters." />
        <Card title="Leaderboard" body="Every tier has one. You can challenge anyone at your level. Not above it." />
      </section>

      <section style={{ position: "relative", height: "44vh", margin: "0 0 2rem" }}>
        <Image
          src="/images/brand/misfit-squad-one-king.jpg"
          alt="A squad in Misfit hoodies around a gold cross, One King One Blood One War"
          fill
          style={{ objectFit: "cover" }}
        />
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
