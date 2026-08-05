import Link from "next/link";
import styles from "./HeroBoard.module.css";

/**
 * HERO BOARD — the block that tells a stranger what a thing is.
 *
 * D's brief: "Strangers getting on the app probably have no clue what it
 * does, or how to activate anything... human beings have to be coerced,
 * usually visually."
 *
 * That is a real gap, not a cosmetic one. Signal's page, for example, said
 * "Sign in to see your rooms" to someone who had never heard of Signal and
 * had no reason to want rooms. A feature nobody understands is a feature
 * nobody uses, however well it is built underneath.
 *
 * THE SHAPE, and why each part earns its place:
 *   kicker   — where am I
 *   headline — what is this, in plain words
 *   body     — what it does FOR ME (never a feature list)
 *   steps    — how to start, concretely, so there is no guessing
 *   cta      — the one obvious next click
 *   note     — what this will NOT do to me
 *
 * That last one matters more here than on most sites. These users have been
 * burned by platforms before; "we don't sell your email" is often the line
 * that actually earns the click.
 *
 * Every field except headline and body is optional, so a board can be as
 * small as a headline and a sentence where that is all a page needs.
 */

export type HeroStep = {
  title: string;
  body: string;
};

export function HeroBoard({
  kicker,
  headline,
  body,
  steps,
  ctaLabel,
  ctaHref,
  secondaryLabel,
  secondaryHref,
  note,
}: {
  kicker?: string;
  headline: string;
  body: string;
  steps?: HeroStep[];
  ctaLabel?: string;
  ctaHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  note?: string;
}) {
  return (
    // aria-labelledby ties the region to its own headline, so a screen
    // reader announces "Signal, region" rather than an anonymous group.
    <section className={styles.board} aria-labelledby={headingId(headline)}>
      {kicker && <p className={styles.kicker}>{kicker}</p>}

      <h2 id={headingId(headline)} className={styles.headline}>
        {headline}
      </h2>

      <p className={styles.body}>{body}</p>

      {steps && steps.length > 0 && (
        <ol className={styles.steps}>
          {steps.map((step) => (
            <li key={step.title} className={styles.step}>
              <span className={styles.stepTitle}>{step.title}</span>
              <span className={styles.stepBody}>{step.body}</span>
            </li>
          ))}
        </ol>
      )}

      {(ctaHref || secondaryHref) && (
        <div className={styles.actions}>
          {ctaHref && ctaLabel && (
            <Link href={ctaHref} className={styles.cta}>
              {ctaLabel}
            </Link>
          )}
          {secondaryHref && secondaryLabel && (
            <Link href={secondaryHref} className={styles.ctaGhost}>
              {secondaryLabel}
            </Link>
          )}
        </div>
      )}

      {note && <p className={styles.note}>{note}</p>}
    </section>
  );
}

/** Stable id from the headline so the aria-labelledby target always exists. */
function headingId(headline: string): string {
  return `hero-${headline.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}
