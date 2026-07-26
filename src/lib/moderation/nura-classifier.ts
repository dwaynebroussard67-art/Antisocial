import type { CategoryKey } from "./nura-bands";

/**
 * THE CLASSIFIER SEAM.
 *
 * D's own note on this correction: "maybe we need to ride another algorithm."
 * The scoring rubric is genuinely not settled yet, and the NURA reasoning
 * layer that will eventually do this work is still being written.
 *
 * So the classifier is an interface, and enforcement (nura.ts) never knows
 * which implementation it's talking to. Swapping the baseline below for the
 * real NURA call is one line in `getClassifier()` and touches nothing else.
 *
 * What is NOT deferred: the pipeline. Quarantine-first, silent-to-sender,
 * Band A auto-removal, Band B human alert — all of that is real and running
 * against whatever classifier is installed. The brain can arrive later; the
 * reflexes are wired now.
 */

export type ClassificationInput = {
  text: string;
  authorId: string;
  contentType: string;
};

export type Classification = {
  /** 0-100. See nura-bands.ts for what the numbers mean. */
  score: number;
  categories: CategoryKey[];
  /** Whatever the classifier can show its work with. Free-form. */
  rationale: Record<string, unknown>;
};

export interface NuraClassifier {
  readonly name: string;
  classify(input: ClassificationInput): Promise<Classification>;
}

/**
 * BASELINE CLASSIFIER — a placeholder with its limits stated plainly.
 *
 * This is lexical pattern matching. It is not the moderation intelligence
 * D is building toward, and it should not be mistaken for it. It exists so
 * the enforcement path is provable end-to-end before the real classifier
 * lands, and so the site is not completely unguarded in the meantime.
 *
 * It is tuned to be QUIET rather than aggressive on the ban path:
 *   - it can and does push things into Band B (quarantine + a human looks),
 *     which is silent, cheap, and reversible;
 *   - it caps its own score below the Band A line UNLESS multiple
 *     independent signals in an auto-ban-eligible category agree.
 * A single unlucky word does not get anybody removed from this site.
 *
 * The term lists are deliberately small and unambiguous. A real lexicon
 * (slurs, coded language, the local vernacular this community actually
 * uses) should not be committed to a public repo — it belongs in the NURA
 * layer or in config loaded at runtime. See `loadLexiconFromEnv` below.
 */

type Signal = { pattern: RegExp; category: CategoryKey; weight: number; label: string };

const BASELINE_SIGNALS: Signal[] = [
  // Incitement / threat. Phrase-shaped, not word-shaped, to cut false hits.
  {
    pattern: /\b(kill|shoot|stab|beat)\s+(all|every|them|those)\b/i,
    category: "violence",
    weight: 45,
    label: "violence:incitement_phrase",
  },
  {
    pattern: /\b(i'?m gonna|i will|imma)\s+(kill|shoot|hurt|end)\s+(you|him|her|them)\b/i,
    category: "violence",
    weight: 50,
    label: "violence:direct_threat",
  },
  // Dehumanising constructions — the grammar hate speech tends to take,
  // without needing the slur itself in this file.
  {
    pattern: /\b(all|those|these)\s+\w+\s+(are|is)\s+(animals|vermin|roaches|subhuman|trash)\b/i,
    category: "hate",
    weight: 50,
    label: "hate:dehumanising_construction",
  },
  {
    pattern: /\b(gas|exterminate|purge|cleanse)\s+(the|all|every)\b/i,
    category: "hate",
    weight: 55,
    label: "hate:eliminationist_phrase",
  },
  // Evil-worship / glorification, per D's doctrine.
  {
    pattern: /\b(hail|praise|serve|worship)\s+(satan|lucifer|the devil)\b/i,
    category: "evil_worship",
    weight: 55,
    label: "evil_worship:devotional_phrase",
  },
  {
    pattern: /\b(sold|selling|give)\s+my\s+soul\s+to\s+(satan|the devil)\b/i,
    category: "evil_worship",
    weight: 40,
    label: "evil_worship:pact_phrase",
  },
  {
    pattern: /\b(evil|sin|the devil)\s+(is|was)\s+(good|right|the way|king)\b/i,
    category: "glorifying_evil",
    weight: 45,
    label: "glorifying_evil:inversion_phrase",
  },
  // Self-harm — quarantine and get a human, never a ban. The band resolver
  // in nura-bands.ts enforces the "never a ban" half.
  {
    pattern: /\b(kill myself|end it all|not gonna be here tomorrow|want to die)\b/i,
    category: "self_harm",
    weight: 40,
    label: "self_harm:disclosure",
  },
];

/**
 * Extra patterns supplied at runtime, so the real lexicon never has to live
 * in the repo. Format: JSON array of
 *   { "pattern": "...", "flags": "i", "category": "hate", "weight": 40 }
 * in NURA_LEXICON_JSON. Malformed entries are skipped loudly rather than
 * silently — a moderation list that quietly half-loaded is worse than one
 * that didn't load at all.
 */
function loadLexiconFromEnv(): Signal[] {
  const raw = process.env.NURA_LEXICON_JSON;
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      console.error("[nura:lexicon] NURA_LEXICON_JSON is not an array — ignored");
      return [];
    }
    const out: Signal[] = [];
    for (let i = 0; i < parsed.length; i++) {
      const entry = parsed[i];
      try {
        out.push({
          pattern: new RegExp(entry.pattern, entry.flags ?? "i"),
          category: entry.category as CategoryKey,
          weight: Number(entry.weight),
          label: entry.label ?? `lexicon:${i}`,
        });
      } catch (err) {
        console.error(`[nura:lexicon] entry ${i} skipped:`, err);
      }
    }
    return out;
  } catch (err) {
    console.error("[nura:lexicon] NURA_LEXICON_JSON failed to parse — ignored:", err);
    return [];
  }
}

export class BaselineLexicalClassifier implements NuraClassifier {
  readonly name = "baseline-lexical-v1";

  async classify(input: ClassificationInput): Promise<Classification> {
    const signals = [...BASELINE_SIGNALS, ...loadLexiconFromEnv()];
    const hits = signals.filter((s) => s.pattern.test(input.text));

    if (hits.length === 0) {
      return { score: 0, categories: [], rationale: { classifier: this.name, hits: [] } };
    }

    const categories = Array.from(new Set(hits.map((h) => h.category)));
    const rawScore = hits.reduce((sum, h) => sum + h.weight, 0);

    // THE BRAKE: a single lexical hit never reaches the Band A line on its
    // own, no matter how heavily weighted. Pattern matching is not certainty,
    // and Band A is the door that doesn't reopen. Two independent signals
    // agreeing is the minimum this classifier will stake a ban on.
    const distinctHitsInBannableCategory = new Set(
      hits.filter((h) => h.category !== "self_harm" && h.category !== "harassment").map((h) => h.label)
    ).size;

    const ceiling = distinctHitsInBannableCategory >= 2 ? 100 : 84; // 84 = one below BANDS.OBVIOUS
    const score = Math.min(rawScore, ceiling);

    return {
      score,
      categories,
      rationale: {
        classifier: this.name,
        hits: hits.map((h) => h.label),
        rawScore,
        ceilingApplied: ceiling,
        note:
          ceiling === 84
            ? "Single-signal match: capped below the auto-ban line, routed to human review."
            : "Multiple independent signals agreed.",
      },
    };
  }
}

let installed: NuraClassifier | null = null;

/**
 * Swap point. When the NURA reasoning layer is ready, set it here (or via
 * `setClassifier` at boot) and nothing else in the moderation path changes.
 */
export function getClassifier(): NuraClassifier {
  return installed ?? (installed = new BaselineLexicalClassifier());
}

export function setClassifier(classifier: NuraClassifier): void {
  installed = classifier;
}
