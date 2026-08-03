// NURA — Tier 3: LLM adjudication. Last resort, ambiguous cases only. The
// LLM NOMINATES a classification; it never picks a consequence. Output is
// strictly validated — malformed/out-of-range/low-confidence is discarded
// and defaults to no-action + log (fail toward not punishing). If no model
// is configured or the call fails, Nura degrades to "Tier 2 only" and never
// blocks the chat.

import { getThresholds } from "./config";
import type { LlmClass, Site } from "./types";

export interface Tier3Result {
  class: LlmClass | null; // null => discard / unavailable, treat as no-action
  confidence: number | null;
  raw: string | null;
  discardedReason: string | null;
}

const VALID_CLASSES: LlmClass[] = ["playful", "tension", "genuine_harm", "crisis", "unclear"];

function tryParseClassification(raw: string): { class: string; confidence: number } | null {
  try {
    // Models sometimes wrap JSON in prose/code fences — pull the first
    // {...} block out defensively before parsing.
    const match = raw.match(/\{[\s\S]*\}/);
    const jsonText = match ? match[0] : raw;
    const parsed = JSON.parse(jsonText);
    if (typeof parsed.class !== "string" || typeof parsed.confidence !== "number") return null;
    return { class: parsed.class, confidence: parsed.confidence };
  } catch {
    return null;
  }
}

async function callAnthropic(prompt: string): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 100,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = data?.content?.[0]?.text;
    return typeof text === "string" ? text : null;
  } catch {
    return null;
  }
}

async function callOpenAI(prompt: string): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 100,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    return typeof text === "string" ? text : null;
  } catch {
    return null;
  }
}

function buildPrompt(body: string, contextLines: string[]): string {
  return [
    "You are a content classifier for a community chat moderation system.",
    "You NEVER decide consequences — you only classify.",
    "Classify the flagged message into exactly one class:",
    "playful, tension, genuine_harm, crisis, unclear.",
    "",
    "Recent context (oldest first):",
    ...contextLines.map((l) => `- ${l}`),
    "",
    `Flagged message: "${body}"`,
    "",
    'Respond with ONLY JSON: {"class": "<one of the classes>", "confidence": <0-1 number>}',
    "No prose, no explanation, JSON only.",
  ].join("\n");
}

/**
 * Model call is intentionally swappable — tries Anthropic, then OpenAI, then
 * gives up cleanly. Whichever ships in prod, only this function needs to
 * change.
 */
export async function runTier3(
  site: Site,
  body: string,
  contextLines: string[],
): Promise<Tier3Result> {
  const thresholds = await getThresholds(site);
  const prompt = buildPrompt(body, contextLines);

  const raw = (await callAnthropic(prompt)) ?? (await callOpenAI(prompt));

  if (!raw) {
    return {
      class: null,
      confidence: null,
      raw: null,
      discardedReason: "no_model_available",
    };
  }

  const parsed = tryParseClassification(raw);
  if (!parsed) {
    return { class: null, confidence: null, raw, discardedReason: "malformed_json" };
  }

  if (!VALID_CLASSES.includes(parsed.class as LlmClass)) {
    return { class: null, confidence: null, raw, discardedReason: "invalid_class" };
  }

  if (
    typeof parsed.confidence !== "number" ||
    Number.isNaN(parsed.confidence) ||
    parsed.confidence < 0 ||
    parsed.confidence > 1
  ) {
    return { class: null, confidence: null, raw, discardedReason: "invalid_confidence" };
  }

  if (parsed.confidence < thresholds.tier3ConfidenceMin) {
    return {
      class: null,
      confidence: parsed.confidence,
      raw,
      discardedReason: "confidence_below_threshold",
    };
  }

  return {
    class: parsed.class as LlmClass,
    confidence: parsed.confidence,
    raw,
    discardedReason: null,
  };
}
