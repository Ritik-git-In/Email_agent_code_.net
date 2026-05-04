import Groq from "groq-sdk";
import {
  CLASSIFIER_SYSTEM,
  HIGH_PRIORITY_DRAFT_SYSTEM,
  FINANCE_SUMMARY_SYSTEM,
  CUSTOMER_SUPPORT_DRAFT_SYSTEM,
  PROMOTION_SUMMARY_SYSTEM,
  INTERNAL_SUMMARY_SYSTEM,
  type Category,
  CATEGORIES,
} from "./prompts";

const CLASSIFIER_MODEL = "llama-3.3-70b-versatile";
const DRAFT_MODEL = "llama-3.3-70b-versatile";

function client(apiKey: string) {
  return new Groq({ apiKey });
}

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
  category: Category;
  confidence: number;
  reason: string;
};

export async function classify(
  apiKey: string,
  email: { subject: string; from: string; snippet: string; body: string },
): Promise<Classification> {
  const groq = client(apiKey);
  const userMsg = `From: ${email.from}\nSubject: ${email.subject}\n\nBody:\n${email.body || email.snippet}`;
  const completion = await groq.chat.completions.create({
    model: CLASSIFIER_MODEL,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: CLASSIFIER_SYSTEM },
      { role: "user", content: userMsg },
    ],
  });
  const raw = completion.choices[0]?.message?.content ?? "";
  const parsed = safeJsonParse<Classification>(raw);
  if (!parsed || !CATEGORIES.includes(parsed.category)) {
    return { category: "internal", confidence: 0, reason: "fallback_parse_error" };
  }
  return parsed;
}

const SYSTEM_BY_CATEGORY: Record<Category, string> = {
  high_priority: HIGH_PRIORITY_DRAFT_SYSTEM,
  finance: FINANCE_SUMMARY_SYSTEM,
  customer_support: CUSTOMER_SUPPORT_DRAFT_SYSTEM,
  promotion: PROMOTION_SUMMARY_SYSTEM,
  internal: INTERNAL_SUMMARY_SYSTEM,
};

export type DraftOutput = { subject: string; body: string };

export async function generateDraft(
  apiKey: string,
  category: Category,
  email: { subject: string; from: string; snippet: string; body: string },
): Promise<DraftOutput | null> {
  const groq = client(apiKey);
  const userMsg = `From: ${email.from}\nSubject: ${email.subject}\n\nBody:\n${email.body || email.snippet}`;
  const completion = await groq.chat.completions.create({
    model: DRAFT_MODEL,
    temperature: 0.4,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_BY_CATEGORY[category] },
      { role: "user", content: userMsg },
    ],
  });
  const raw = completion.choices[0]?.message?.content ?? "";
  const parsed = safeJsonParse<DraftOutput>(raw);
  if (!parsed?.subject || !parsed?.body) return null;
  return parsed;
}
