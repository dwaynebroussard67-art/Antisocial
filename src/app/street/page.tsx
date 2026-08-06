import { HeroBoard } from "@/components/HeroBoard";
import { requireStreetAccess } from "@/lib/auth/roles";
import { NavBar } from "@/components/NavBar";
import { getViewer } from "@/lib/auth/session";
import { NuraPresence } from "@/components/NuraPresence";
import { UpstairsPresence } from "@/components/UpstairsPresence";
import { getPlayableVariants } from "@/lib/arcade/variants";
import Image from "next/image";
import Link from "next/link";

export default async function StreetPage() {
  const { tier, isAdmin } = await requireStreetAccess();
  const viewer = await getViewer();

  // Drives whether the Games card appears at all — see the card below.
  const streetGames = await getPlayableVariants(tier, viewer?.id ?? null);

  return (
    <main>
      <NavBar viewerTier={tier} viewer={viewer} isAdmin={isAdmin} />

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

      {/* GUIDED TOUR — Street. Tells a newcomer what is actually reachable
          from here and, honestly, how the next door opens. */}
      <section style={{ padding: "0 2rem", maxWidth: "760px" }}>
        <HeroBoard
          kicker="You are here — Street"
          headline="Everything on this floor is open right now."
          body="No email, no account, nothing to prove. You can play, read, and look around as long as you want. Nobody will chase you, and nothing here is trying to keep you scrolling."
          steps={[
            {
              title: "Play something",
              body: "The Arcade is open to you with no account. Your scores go on the same boards as everyone else's.",
            },
            {
              title: "Read what we actually teach",
              body: "The dark-skinned, Ethiopian Christ of the Tewahedo canon — taught plainly, not the version you were handed.",
            },
            {
              title: "Go further when you want to",
              body: "Giving an email opens the Block: the community feed, Signal messaging, better games. That is the only step you take yourself.",
            },
          ]}
          ctaLabel="Open the Arcade"
          ctaHref="/street/arcade"
          secondaryLabel="Give an email, open the Block"
          secondaryHref="/sign-in?mode=signup"
          note="Nura watches this whole site, including here — for hate and threats, not for what you confess."
        />
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
        {/* Was: "Chess, checkers, the basics. Better games open up on the
            Block." — which advertised games the Street couldn't open and
            framed the Street as the version of the site where you don't get
            to play. Both fixed this session: the Street has its own arcade
            now, and the copy points at it instead of upstairs. */}
        {/* Only shown when the Street actually HAS a game switched on. The
            whole reason this card was rewritten is that it used to advertise
            games the Street couldn't open; pointing it at an arcade whose
            variants are all inactive would be the same lie with a new URL.
            Activation is a data change, so this appears on its own the
            moment a Street variant is switched on — no deploy needed. */}
        {streetGames.length > 0 && (
          <Card
            href="/street/arcade"
            title="Games"
            body="Trivia, word scramble, reaction timer, coin flip. Simple versions, real boards — the same boards everybody else is on."
          />
        )}
        {/* This card was decoration for months — a promise of teaching with
            nothing behind it, the same failure the Games card had. It now
            points at the Ethiopian Orthodox Tewahedo Church's own canon
            list rather than at a page of ours restating it: on the question
            of what the 81 books ARE, the church's own word is the source,
            and anything we wrote would be a paraphrase standing in front of
            it. Our own teaching pages, when they're written, go alongside
            this — not instead of it. */}
        <Card
          href="https://www.ethiopianorthodox.org/english/canonical/books.html"
          title="What we teach"
          body="The Ethiopian Orthodox Tewahedo canon, from the church itself — all 81 books, 46 Old Testament and 35 New. Enoch, Jubilees, the Meqabyan. The ones most Bibles leave out."
        />
        <Card title="Leaderboard" body="Every tier has one. You can challenge anyone at your level. Not above it." />
      </section>

      {/* The one-level-up peek: who's on the Block right now. Presence only —
          no names to click, no way to reach them. See lib/tiers/visibility.ts */}
      <UpstairsPresence viewerTier={tier} />

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

function Card({ title, body, href }: { title: string; body: string; href?: string }) {
  const inner = (
    <>
      <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", margin: 0 }}>{title}</h3>
      <p style={{ color: "var(--text-secondary)", marginTop: "0.5rem", lineHeight: 1.5 }}>{body}</p>
    </>
  );

  const style = {
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-md)",
    padding: "1.25rem",
    background: "var(--surface-1)",
  } as const;

  if (!href) return <div style={style}>{inner}</div>;

  const linkStyle = { ...style, display: "block", textDecoration: "none", color: "inherit" };

  // External links leave the site, so they get a plain anchor rather than
  // next/link (which is for client-side routing and does nothing useful for
  // an off-site URL). rel="noopener noreferrer" is not optional: without
  // noopener the opened page gets a handle on this window via window.opener
  // and can navigate it somewhere else.
  if (/^https?:\/\//.test(href)) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" style={linkStyle}>
        {inner}
        <span
          aria-hidden
          style={{ color: "var(--text-secondary)", fontSize: "0.8rem", marginTop: "0.6rem", display: "inline-block" }}
        >
          ethiopianorthodox.org ↗
        </span>
        <span className="sr-only"> (opens the Ethiopian Orthodox Tewahedo Church website in a new tab)</span>
      </a>
    );
  }

  return (
    <Link href={href} style={linkStyle}>
      {inner}
    </Link>
  );
}
