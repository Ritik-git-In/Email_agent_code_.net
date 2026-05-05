"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/crypto";
import { env } from "@/lib/env";
import {
  gmailFromRefreshToken,
  listUnreadIds,
  getMessage,
} from "@/lib/gmail/client";
import { ensureLabelsForCategories } from "@/lib/gmail/labels";
import { getUserOAuthCreds } from "@/lib/gmail/creds";
import { classify } from "@/lib/llm/groq";
import type { CategoryDef } from "@/lib/llm/prompts";

type Result = { ok: true } | { ok: false; error: string };

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

export async function createCategory(formData: FormData): Promise<Result> {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const colorBg = String(formData.get("color_bg") ?? "").trim();
  const colorText = String(formData.get("color_text") ?? "").trim();
  const generateDraft = formData.get("generate_draft") === "on";
  const notifyTelegram = formData.get("notify_telegram") === "on";
  const draftPrompt = String(formData.get("draft_prompt") ?? "").trim() || null;

  if (!name) return { ok: false, error: "Name is required" };
  if (name.length > 50) return { ok: false, error: "Name too long (max 50)" };
  if (description.length < 10) {
    return { ok: false, error: "Description must be at least 10 characters" };
  }
  if (description.length > 1000) {
    return { ok: false, error: "Description too long (max 1000)" };
  }
  if (!colorBg || !colorText) return { ok: false, error: "Pick a color" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { count: existingCount } = await supabase
    .from("categories")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  if ((existingCount ?? 0) >= 15) {
    return { ok: false, error: "Maximum 15 categories per user" };
  }

  const baseSlug = slugify(name) || "category";
  let slug = baseSlug;
  let attempt = 1;
  while (attempt < 100) {
    const { data: clash } = await supabase
      .from("categories")
      .select("id")
      .eq("user_id", user.id)
      .eq("slug", slug)
      .maybeSingle();
    if (!clash) break;
    attempt += 1;
    slug = `${baseSlug}_${attempt}`;
  }

  const { data: maxOrder } = await supabase
    .from("categories")
    .select("display_order")
    .eq("user_id", user.id)
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("categories").insert({
    user_id: user.id,
    slug,
    name,
    description,
    color_bg: colorBg,
    color_text: colorText,
    is_default: false,
    enabled: true,
    generate_draft: generateDraft,
    notify_telegram: notifyTelegram,
    draft_prompt: draftPrompt,
    display_order: ((maxOrder?.display_order as number | undefined) ?? 0) + 1,
  });
  if (error) return { ok: false, error: error.message };

  await syncCategoriesToGmail(user.id, supabase);
  revalidatePath("/dashboard/categories");
  return { ok: true };
}

export async function updateCategory(formData: FormData): Promise<Result> {
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const colorBg = String(formData.get("color_bg") ?? "").trim();
  const colorText = String(formData.get("color_text") ?? "").trim();
  const enabled = formData.get("enabled") !== "off";
  const generateDraft = formData.get("generate_draft") === "on";
  const notifyTelegram = formData.get("notify_telegram") === "on";
  const draftPrompt = String(formData.get("draft_prompt") ?? "").trim() || null;

  if (!id) return { ok: false, error: "Missing id" };
  if (!name) return { ok: false, error: "Name is required" };
  if (description.length < 10) {
    return { ok: false, error: "Description must be at least 10 characters" };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { error } = await supabase
    .from("categories")
    .update({
      name,
      description,
      color_bg: colorBg,
      color_text: colorText,
      enabled,
      generate_draft: generateDraft,
      notify_telegram: notifyTelegram,
      draft_prompt: draftPrompt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };

  await syncCategoriesToGmail(user.id, supabase);
  revalidatePath("/dashboard/categories");
  return { ok: true };
}

export async function deleteCategory(id: string): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { data: row } = await supabase
    .from("categories")
    .select("is_default")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!row) return { ok: false, error: "Category not found" };
  if (row.is_default) {
    return { ok: false, error: "Default categories can't be deleted — disable instead" };
  }

  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/categories");
  return { ok: true };
}

export type TestSampleResult = {
  subject: string;
  from: string;
  matched: boolean;
  matched_slug: string | null;
  matched_name: string | null;
  confidence: number;
  reason: string;
};

export type TestClassificationResult =
  | { ok: true; samples: TestSampleResult[] }
  | { ok: false; error: string };

export async function testClassificationAction(input: {
  name: string;
  slug?: string;
  description: string;
}): Promise<TestClassificationResult> {
  if (!input.name.trim() || input.description.trim().length < 10) {
    return { ok: false, error: "Name and description (min 10 chars) required" };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const [{ data: gmailAccounts }, { data: apiKeys }, { data: existingCats }] = await Promise.all([
    supabase.from("gmail_accounts").select("id, email, refresh_token_encrypted").eq("user_id", user.id).limit(1),
    supabase.from("api_keys").select("provider, key_encrypted").eq("user_id", user.id),
    supabase
      .from("categories")
      .select("slug, name, description, draft_prompt")
      .eq("user_id", user.id)
      .eq("enabled", true)
      .order("display_order"),
  ]);

  if (!gmailAccounts || gmailAccounts.length === 0) {
    return { ok: false, error: "Connect a Gmail account first" };
  }

  const userLlmKey =
    apiKeys?.find((k) => k.provider === "kimi") ??
    apiKeys?.find((k) => k.provider === "groq") ??
    apiKeys?.find((k) => k.provider === "openai");
  const llmApiKey = userLlmKey
    ? decrypt(userLlmKey.key_encrypted)
    : env.kimiApiKey || env.groqApiKey;
  if (!llmApiKey) return { ok: false, error: "No LLM key configured" };

  // Inject the test category alongside existing — replace if same slug, else append
  const testSlug = (input.slug && input.slug.trim()) || slugify(input.name) || "test_category";
  const existingArr = (existingCats ?? []) as CategoryDef[];
  const merged: CategoryDef[] = [
    ...existingArr.filter((c) => c.slug !== testSlug),
    {
      slug: testSlug,
      name: input.name,
      description: input.description,
      draft_prompt: null,
    },
  ];

  let oauthCreds;
  try {
    oauthCreds = await getUserOAuthCreds(user.id, supabase);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "creds_missing" };
  }

  try {
    const account = gmailAccounts[0];
    const gmail = gmailFromRefreshToken(decrypt(account.refresh_token_encrypted), oauthCreds);
    const ids = await listUnreadIds(gmail, 5);
    if (ids.length === 0) {
      return { ok: false, error: "No unread emails to test on" };
    }
    const samples = await Promise.all(
      ids.map(async (id): Promise<TestSampleResult> => {
        try {
          const msg = await getMessage(gmail, id);
          const result = await classify(llmApiKey, merged, msg);
          const matchedDef = merged.find((c) => c.slug === result.category);
          return {
            subject: msg.subject || "(no subject)",
            from: msg.from,
            matched: result.category === testSlug,
            matched_slug: result.category,
            matched_name: matchedDef?.name ?? null,
            confidence: result.confidence,
            reason: result.reason,
          };
        } catch (err) {
          return {
            subject: "(error fetching)",
            from: "",
            matched: false,
            matched_slug: null,
            matched_name: null,
            confidence: 0,
            reason: err instanceof Error ? err.message : "unknown",
          };
        }
      }),
    );
    return { ok: true, samples };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "test failed" };
  }
}

// Best-effort label sync — creates Gmail labels for any new/changed enabled categories
// across all the user's Gmail accounts. Failures don't block the parent action.
async function syncCategoriesToGmail(
  userId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
): Promise<void> {
  try {
    const [{ data: gmailAccounts }, { data: cats }] = await Promise.all([
      supabase.from("gmail_accounts").select("refresh_token_encrypted").eq("user_id", userId),
      supabase
        .from("categories")
        .select("slug, name, color_bg, color_text")
        .eq("user_id", userId)
        .eq("enabled", true),
    ]);
    if (!gmailAccounts?.length || !cats?.length) return;

    const oauthCreds = await getUserOAuthCreds(userId, supabase);
    for (const acc of gmailAccounts) {
      try {
        const gmail = gmailFromRefreshToken(decrypt(acc.refresh_token_encrypted), oauthCreds);
        await ensureLabelsForCategories(gmail, cats);
      } catch {
        // Per-account sync failure is non-fatal
      }
    }
  } catch {
    // Sync best-effort — never block the user's save
  }
}
