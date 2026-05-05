import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/crypto";
import { env } from "@/lib/env";
import {
  gmailFromRefreshToken,
  listUnreadIds,
  getMessage,
  addLabel,
  createDraft,
  type GmailMessage,
} from "@/lib/gmail/client";
import { ensureLabelsForCategories } from "@/lib/gmail/labels";
import { getUserOAuthCreds } from "@/lib/gmail/creds";
import { classify, generateDraft } from "@/lib/llm/groq";
import { sendTelegramMessage } from "@/lib/telegram/send";
import type { CategoryDef } from "@/lib/llm/prompts";

export type ProcessSummary = {
  account: string;
  fetched: number;
  processed: number;
  skipped: number;
  errors: { gmail_msg_id: string; error: string }[];
  details: {
    gmail_msg_id: string;
    subject: string;
    category: string;
    actionTaken: string;
  }[];
};

type CategoryRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  color_bg: string;
  color_text: string;
  enabled: boolean;
  generate_draft: boolean;
  notify_telegram: boolean;
  draft_prompt: string | null;
};

export async function processUserEmails(): Promise<ProcessSummary[]> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return processForUserId(user.id, supabase);
}

const PLAN_DAILY_LIMITS: Record<string, number> = {
  free: 50,
  pro: Infinity,
  agency: Infinity,
};

export async function processForUserId(
  userId: string,
  supabase: SupabaseClient,
): Promise<ProcessSummary[]> {
  const [
    { data: gmailAccounts },
    { data: apiKeys },
    { data: telegram },
    { data: profile },
    { data: categoriesRaw },
  ] = await Promise.all([
    supabase.from("gmail_accounts").select("id, email, refresh_token_encrypted").eq("user_id", userId),
    supabase.from("api_keys").select("provider, key_encrypted").eq("user_id", userId),
    supabase
      .from("telegram_configs")
      .select("bot_token_encrypted, chat_id")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase.from("profiles").select("plan").eq("id", userId).maybeSingle(),
    supabase
      .from("categories")
      .select("id, slug, name, description, color_bg, color_text, enabled, generate_draft, notify_telegram, draft_prompt")
      .eq("user_id", userId)
      .eq("enabled", true)
      .order("display_order"),
  ]);

  if (!gmailAccounts || gmailAccounts.length === 0) {
    throw new Error("No Gmail account connected. Connect one in Integrations.");
  }
  const categories = (categoriesRaw ?? []) as CategoryRow[];
  if (categories.length === 0) {
    throw new Error("No categories defined. Set up at least one in /dashboard/categories.");
  }

  const oauthCreds = await getUserOAuthCreds(userId, supabase);
  const userLlmKey =
    apiKeys?.find((k) => k.provider === "kimi") ??
    apiKeys?.find((k) => k.provider === "groq") ??
    apiKeys?.find((k) => k.provider === "openai");
  const llmApiKey = userLlmKey
    ? decrypt(userLlmKey.key_encrypted)
    : env.kimiApiKey || env.groqApiKey;
  if (!llmApiKey) {
    throw new Error(
      "LLM unavailable. Server has no KIMI_API_KEY configured and user has no key set.",
    );
  }

  const plan = profile?.plan ?? "free";
  const dailyLimit = PLAN_DAILY_LIMITS[plan] ?? PLAN_DAILY_LIMITS.free;
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const { count: processedToday } = await supabase
    .from("emails_processed")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("processed_at", todayStart.toISOString());
  const alreadyToday = processedToday ?? 0;
  const remainingToday = dailyLimit - alreadyToday;
  if (remainingToday <= 0) {
    throw new Error(
      `Daily limit reached (${dailyLimit} emails/day on ${plan} plan). Upgrade to Pro for unlimited.`,
    );
  }
  const batchSize = Math.min(25, remainingToday);

  const telegramBotToken = telegram?.bot_token_encrypted
    ? decrypt(telegram.bot_token_encrypted)
    : null;
  const telegramChatId = telegram?.chat_id ?? null;

  const categoriesBySlug = new Map(categories.map((c) => [c.slug, c]));
  const categoryDefs: CategoryDef[] = categories.map((c) => ({
    slug: c.slug,
    name: c.name,
    description: c.description,
    draft_prompt: c.draft_prompt,
  }));

  const summaries: ProcessSummary[] = [];

  for (const account of gmailAccounts) {
    const summary: ProcessSummary = {
      account: account.email,
      fetched: 0,
      processed: 0,
      skipped: 0,
      errors: [],
      details: [],
    };
    summaries.push(summary);

    try {
      const refreshToken = decrypt(account.refresh_token_encrypted);
      const gmail = gmailFromRefreshToken(refreshToken, oauthCreds);

      const labelIds = await ensureLabelsForCategories(gmail, categories);

      const messageIds = await listUnreadIds(gmail, batchSize);
      summary.fetched = messageIds.length;

      const { data: alreadyProcessed } = await supabase
        .from("emails_processed")
        .select("gmail_msg_id")
        .eq("gmail_account_id", account.id)
        .in("gmail_msg_id", messageIds);
      const processedSet = new Set((alreadyProcessed ?? []).map((r) => r.gmail_msg_id));

      for (const msgId of messageIds) {
        if (processedSet.has(msgId)) {
          summary.skipped++;
          continue;
        }

        try {
          const msg = await getMessage(gmail, msgId);
          const result = await processSingleEmail({
            msg,
            account,
            labelIds,
            llmApiKey,
            telegramBotToken,
            telegramChatId,
            gmail,
            categoryDefs,
            categoriesBySlug,
          });

          await supabase.from("emails_processed").insert({
            user_id: userId,
            gmail_account_id: account.id,
            gmail_msg_id: msg.id,
            subject: msg.subject,
            from_email: msg.from,
            category: result.category,
            confidence: result.confidence,
            action_taken: result.actionTaken,
            draft_id: result.draftId ?? null,
          });

          summary.processed++;
          summary.details.push({
            gmail_msg_id: msg.id,
            subject: msg.subject,
            category: result.category,
            actionTaken: result.actionTaken,
          });
        } catch (err) {
          summary.errors.push({
            gmail_msg_id: msgId,
            error: err instanceof Error ? err.message : "unknown",
          });
        }
      }

      await supabase
        .from("gmail_accounts")
        .update({ last_synced_at: new Date().toISOString() })
        .eq("id", account.id);
    } catch (err) {
      summary.errors.push({
        gmail_msg_id: "_account",
        error: err instanceof Error ? err.message : "unknown",
      });
    }
  }

  const month = new Date().toISOString().slice(0, 7);
  const totalProcessed = summaries.reduce((s, x) => s + x.processed, 0);
  if (totalProcessed > 0) {
    await supabase.rpc("increment_usage", {
      p_user_id: userId,
      p_month: month,
      p_count: totalProcessed,
    }).then(() => undefined, async () => {
      const { data: existing } = await supabase
        .from("usage")
        .select("id, emails_count")
        .eq("user_id", userId)
        .eq("month", month)
        .maybeSingle();
      if (existing) {
        await supabase
          .from("usage")
          .update({ emails_count: existing.emails_count + totalProcessed })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("usage")
          .insert({ user_id: userId, month, emails_count: totalProcessed });
      }
    });
  }

  return summaries;
}

async function processSingleEmail(args: {
  msg: GmailMessage;
  account: { id: string; email: string };
  labelIds: Record<string, string>;
  llmApiKey: string;
  telegramBotToken: string | null;
  telegramChatId: string | null;
  gmail: ReturnType<typeof gmailFromRefreshToken>;
  categoryDefs: CategoryDef[];
  categoriesBySlug: Map<string, CategoryRow>;
}): Promise<{
  category: string;
  confidence: number;
  actionTaken: string;
  draftId?: string;
}> {
  const {
    msg,
    labelIds,
    llmApiKey,
    telegramBotToken,
    telegramChatId,
    gmail,
    categoryDefs,
    categoriesBySlug,
  } = args;

  const classification = await classify(llmApiKey, categoryDefs, msg);
  const matched = categoriesBySlug.get(classification.category);
  if (!matched) {
    return {
      category: classification.category,
      confidence: classification.confidence,
      actionTaken: "no_matching_category",
    };
  }

  const labelId = labelIds[matched.slug];
  const actions: string[] = [];
  if (labelId) {
    await addLabel(gmail, msg.id, labelId);
    actions.push(`labeled:${matched.name}`);
  }

  let draftId: string | undefined;
  if (matched.generate_draft) {
    const draft = await generateDraft(
      llmApiKey,
      {
        slug: matched.slug,
        name: matched.name,
        description: matched.description,
        draft_prompt: matched.draft_prompt,
      },
      msg,
    );
    if (draft) {
      try {
        const fromEmail = extractEmailAddress(msg.from);
        draftId = await createDraft(gmail, {
          to: fromEmail,
          subject: draft.subject,
          body: draft.body,
          threadId: msg.threadId,
        });
        actions.push(`draft_created:${draftId}`);
      } catch (err) {
        actions.push(`draft_failed:${err instanceof Error ? err.message : "unknown"}`);
      }
    }
  }

  if (matched.notify_telegram && telegramBotToken && telegramChatId) {
    const text =
      `📬 ${matched.name} — from ${msg.from}\n\n` +
      `Subject: ${msg.subject}\n\n` +
      `${msg.snippet.slice(0, 500)}`;
    const tg = await sendTelegramMessage(telegramBotToken, telegramChatId, text);
    actions.push(tg.ok ? "telegram_sent" : `telegram_failed:${tg.error}`);
  }

  return {
    category: matched.slug,
    confidence: classification.confidence,
    actionTaken: actions.join("; "),
    draftId,
  };
}

function extractEmailAddress(from: string): string {
  const match = from.match(/<([^>]+)>/);
  return match ? match[1] : from.trim();
}
