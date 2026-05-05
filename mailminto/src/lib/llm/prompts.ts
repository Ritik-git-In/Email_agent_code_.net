// Categories are now user-defined via /dashboard/categories.
// These types describe the runtime shape used by the classifier and pipeline.

export type CategoryDef = {
  slug: string;
  name: string;
  description: string;
  draft_prompt: string | null;
};

export function buildClassifierSystem(categories: CategoryDef[]): string {
  const fallbackSlug = categories.find((c) => c.slug === "internal")?.slug ?? categories[0]?.slug ?? "internal";

  const list = categories
    .map(
      (c, i) =>
        `${i + 1}. "${c.slug}" — ${c.description.trim()}`,
    )
    .join("\n\n");

  return `You are an email triage agent. Classify the input email into EXACTLY ONE of the user's categories below.

CATEGORIES:

${list}

If no category clearly matches, return "${fallbackSlug}".

OUTPUT FORMAT — STRICT JSON only, no markdown, no commentary:
{
  "category": "<slug from above>",
  "confidence": 0-100,
  "reason": "1 sentence why"
}`;
}

export function buildDraftSystem(category: CategoryDef): string {
  if (category.draft_prompt && category.draft_prompt.trim().length > 0) {
    return `${category.draft_prompt.trim()}

OUTPUT FORMAT — STRICT JSON only, no markdown:
{
  "subject": "Re: <suggested subject>",
  "body": "Full plain-text email body"
}`;
  }

  return `You are an Expert Email Response Assistant.

The incoming email has been classified as "${category.name}" — ${category.description.trim()}

Generate a professional, clear, business-appropriate reply that:
1. Directly addresses the questions, concerns, or requests
2. Uses a respectful, solution-focused tone
3. Acknowledges urgency where applicable
4. Defines next steps and timelines where relevant
5. Avoids emotional or defensive language

OUTPUT FORMAT — STRICT JSON only, no markdown, no commentary:
{
  "subject": "Re: <suggested subject>",
  "body": "Full plain-text email body"
}`;
}
