import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/crypto";
import {
  gmailFromRefreshToken,
  listUnreadIds,
  getMessage,
  addLabel,
  createDraft,
  type GmailMessage,
} from "@/lib/gmail/client";
import { ensureAllCategoryLabels, CATEGORY_LABELS } from "@/lib/gmail/labels";
import { classify, generateDraft } from "@/lib/llm/groq";
import { sendTelegramMessage } from "@/lib/telegram/send";
import type { Category } from "@/lib/llm/prompts";

export type ProcessSummary = {
  account: string;
  fetched: number;
  processed: number;
  skipped: number;
  errors: { gmail_msg_id: string; error: string }[];
  details: {
    gmail_msg_id: string;
    subject: string;
    category: Category;
    actionTaken: string;
  }[];
};

const DRAFT_CATEGORIES: Category[] = ["high_priority", "customer_support"];

export async function processUserEmails(): Promise<ProcessSummary[]> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return processForUserId(user.id, supabase);
}

export async function processForUserId(
  userId: string,
  supabase: SupabaseClient,
): Promise<ProcessSummary[]> {
  const [{ data: gmailAccounts }, { data: apiKeys }, { data: telegram }] = await Promise.all([
    supabase.from("gmail_accounts").select("id, email, refresh_token_encrypted").eq("user_id", userId),
    supabase.from("api_keys").select("provider, key_encrypted").eq("user_id", userId),
    supabase
      .from("telegram_configs")
      .select("bot_token_encrypted, chat_id")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  if (!gmailAccounts || gmailAccounts.length === 0) {
    throw new Error("No Gmail account connected. Connect one in Integrations.");
  }
  const llmKey =
    apiKeys?.find((k) => k.provider === "groq") ??
    apiKeys?.find((k) => k.provider === "openai");
  if (!llmKey) {
    throw new Error("No LLM API key configured. Add one in Integrations.");
  }
  const llmApiKey = decrypt(llmKey.key_encrypted);

  const telegramBotToken = telegram?.bot_token_encrypted
    ? decrypt(telegram.bot_token_encrypted)
    : null;
  const telegramChatId = telegram?.chat_id ?? null;

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
      const gmail = gmailFromRefreshToken(refreshToken);

      const labelIds = await ensureAllCategoryLabels(gmail);

      const messageIds = await listUnreadIds(gmail, 25);
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
}): Promise<{
  category: Category;
  confidence: number;
  actionTaken: string;
  draftId?: string;
}> {
  const { msg, labelIds, llmApiKey, telegramBotToken, telegramChatId, gmail } = args;

  const classification = await classify(llmApiKey, msg);
  const category = classification.category;

  const labelId = labelIds[category];
  await addLabel(gmail, msg.id, labelId);

  const actions: string[] = [`labeled:${CATEGORY_LABELS[category].name}`];
  let draftId: string | undefined;

  if (DRAFT_CATEGORIES.includes(category)) {
    const draft = await generateDraft(llmApiKey, category, msg);
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

  if (category === "high_priority" && telegramBotToken && telegramChatId) {
    const text =
      `🚨 High Priority — from ${msg.from}\n\n` +
      `Subject: ${msg.subject}\n\n` +
      `${msg.snippet.slice(0, 500)}`;
    const tg = await sendTelegramMessage(telegramBotToken, telegramChatId, text);
    actions.push(tg.ok ? "telegram_sent" : `telegram_failed:${tg.error}`);
  }

  return {
    category,
    confidence: classification.confidence,
    actionTaken: actions.join("; "),
    draftId,
  };
}

function extractEmailAddress(from: string): string {
  const match = from.match(/<([^>]+)>/);
  return match ? match[1] : from.trim();
}
