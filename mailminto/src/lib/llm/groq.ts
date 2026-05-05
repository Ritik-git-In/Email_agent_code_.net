// Despite the filename, this module now talks to Kimi (Moonshot AI) via the
// OpenAI-compatible SDK. The filename is kept for back-compat with existing imports.
import OpenAI from "openai";
import { env } from "@/lib/env";
import {
  buildClassifierSystem,
  buildDraftSystem,
  type CategoryDef,
} from "./prompts";

function client(apiKey: string) {
  return new OpenAI({
    apiKey,
    baseURL: env.kimiBaseUrl,
  });
}

const CLASSIFIER_TEMPERATURE = 0;
const DRAFT_TEMPERATURE = 0.4;

function safeJsonParse<T>(text: string): T | null {
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}

export type Classification = {
  category: string;
  confidence: number;
  reason: string;
};

export async function classify(
  apiKey: string,
  categories: CategoryDef[],
  email: { subject: string; from: string; snippet: string; body: string },
): Promise<Classification> {
  const llm = client(apiKey);
  const userMsg = `From: ${email.from}\nSubject: ${email.subject}\n\nBody:\n${email.body || email.snippet}`;
  const completion = await llm.chat.completions.create({
    model: env.kimiModel,
    temperature: CLASSIFIER_TEMPERATURE,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: buildClassifierSystem(categories) },
      { role: "user", content: userMsg },
    ],
  });
  const raw = completion.choices[0]?.message?.content ?? "";
  const parsed = safeJsonParse<Classification>(raw);
  const validSlugs = new Set(categories.map((c) => c.slug));
  if (!parsed || !validSlugs.has(parsed.category)) {
    const fallback =
      categories.find((c) => c.slug === "internal")?.slug ??
      categories[0]?.slug ??
      "internal";
    return { category: fallback, confidence: 0, reason: "fallback_parse_error" };
  }
  return parsed;
}

export type DraftOutput = { subject: string; body: string };

export async function generateDraft(
  apiKey: string,
  category: CategoryDef,
  email: { subject: string; from: string; snippet: string; body: string },
): Promise<DraftOutput | null> {
  const llm = client(apiKey);
  const userMsg = `From: ${email.from}\nSubject: ${email.subject}\n\nBody:\n${email.body || email.snippet}`;
  const completion = await llm.chat.completions.create({
    model: env.kimiModel,
    temperature: DRAFT_TEMPERATURE,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: buildDraftSystem(category) },
      { role: "user", content: userMsg },
    ],
  });
  const raw = completion.choices[0]?.message?.content ?? "";
  const parsed = safeJsonParse<DraftOutput>(raw);
  if (!parsed?.subject || !parsed?.body) return null;
  return parsed;
}
