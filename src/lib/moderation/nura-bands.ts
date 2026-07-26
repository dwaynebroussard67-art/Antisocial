/**
 * THE PARAMETER — where Nura's authority starts and stops.
 *
 * D: "if it's rated within a certain parameter, she don't need no permission
 * ... if she's unsure, she alerts me or she alerts a staff member ... if it
 * gets past that parameter where it's obviously hate speech, obviously
 * devil worshiping, obviously glorifying evil, then the person is kicked off
 * the site with no questions asked, no warnings."
 *
 * That's two cut lines on one 0-100 scale:
 *
 *    0 ─────────── SUSPICION ──────────── OBVIOUS ─────────── 100
 *        clear     │   Band B: quarantine   │  Band A: quarantine
 *      (nothing)   │   + alert a human      │  + remove + ban
 *
 * Both are in this one file so the parameter can be tuned without touching
 * enforcement, and so "where is the line" has exactly one answer in the
 * codebase.
 *
 * ON THE VALUES BELOW: they are a starting position, not a finished rubric.
 * D flagged that the scoring algorithm itself is still to be worked out
 * ("maybe we need to ride another algorithm"). Until a real classifier is
 * wired in, OBVIOUS sits deliberately high — the automatic no-questions ban
 * should be reachable only by content the classifier is genuinely certain
 * about, and everything short of that should land in Band B where a human
 * looks at it. The cost of those two mistakes is not symmetrical: a wrong
 * Band B costs someone a delay they never find out about; a wrong Band A
 * removes a person from a community they may have needed.
 */

export const BANDS = {
  /**
   * At or above this, Nura acts alone: content removed, member removed.
   * No warning, no questions, no permission.
   */
  OBVIOUS: 85,

  /**
   * At or above this (and below OBVIOUS), content is quarantined and a
   * human is alerted. "If she even thinks something's happening."
   * Set low on purpose — quarantine is cheap and silent, and the whole
   * point is that suspicion is enough to hold something.
   */
  SUSPICION: 30,
} as const;

export type Band = "clear" | "band_b_uncertain" | "band_a_violation";

export function bandForScore(score: number): Band {
  if (score >= BANDS.OBVIOUS) return "band_a_violation";
  if (score >= BANDS.SUSPICION) return "band_b_uncertain";
  return "clear";
}

/**
 * The categories Nura scores against. `autoBanEligible` marks the ones D
 * named as grounds for immediate removal — hate, evil-worship, glorifying
 * evil. A category that isn't auto-ban-eligible can quarantine and can
 * summon a human, but can never on its own trigger the automatic ban, no
 * matter how high it scores.
 *
 * This is the second lock on Band A: a high score is necessary but not
 * sufficient. Something has to be one of the named things.
 */
export const CATEGORIES = {
  hate: { label: "Hate speech", autoBanEligible: true },
  evil_worship: { label: "Devil worship / occult devotion", autoBanEligible: true },
  glorifying_evil: { label: "Glorifying evil", autoBanEligible: true },
  violence: { label: "Threat or incitement to violence", autoBanEligible: true },
  harassment: { label: "Targeted harassment", autoBanEligible: false },
  self_harm: { label: "Self-harm", autoBanEligible: false },
  sexual_minor: { label: "Sexual content involving a minor", autoBanEligible: true },
  other: { label: "Other concern", autoBanEligible: false },
} as const;

export type CategoryKey = keyof typeof CATEGORIES;

export function anyAutoBanEligible(categories: readonly string[]): boolean {
  return categories.some((c) => CATEGORIES[c as CategoryKey]?.autoBanEligible === true);
}

/**
 * The final word on which band applies, score AND category together.
 * Enforcement calls this, never bandForScore directly.
 *
 * Note the demotion: a 95-scoring harassment case is NOT an automatic ban —
 * it falls back to Band B and a human reads it. Self-harm is the clearest
 * case for why this exists. Somebody in crisis can trip a high score, and
 * this is a ministry that exists to catch that person, not to remove them.
 */
export function resolveBand(score: number, categories: readonly string[]): Band {
  const byScore = bandForScore(score);
  if (byScore === "band_a_violation" && !anyAutoBanEligible(categories)) {
    return "band_b_uncertain";
  }
  return byScore;
}
