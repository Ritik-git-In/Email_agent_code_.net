import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { sendTelegramMessage } from "@/lib/telegram/send";

type TelegramUpdate = {
  message?: {
    chat: { id: number };
    from?: { id: number; first_name?: string };
    text?: string;
  };
};

export async function POST(req: Request) {
  // Verify Telegram secret header (set when registering webhook)
  if (env.telegramWebhookSecret) {
    const sent = req.headers.get("x-telegram-bot-api-secret-token");
    if (sent !== env.telegramWebhookSecret) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
  }

  let update: TelegramUpdate;
  try {
    update = (await req.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const msg = update.message;
  if (!msg?.text || !msg.chat?.id) {
    return NextResponse.json({ ok: true });
  }

  const startMatch = msg.text.match(/^\/start\s+([a-f0-9]{32,})/i);
  if (!startMatch) {
    return NextResponse.json({ ok: true });
  }

  const token = startMatch[1];
  const chatId = String(msg.chat.id);
  const admin = createAdminClient();

  const { data: linkRow } = await admin
    .from("telegram_link_tokens")
    .select("user_id, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (!linkRow) {
    await sendTelegramMessage(env.telegramBotToken, chatId, "❌ Invalid or expired link.");
    return NextResponse.json({ ok: true });
  }
  if (new Date(linkRow.expires_at) < new Date()) {
    await admin.from("telegram_link_tokens").delete().eq("token", token);
    await sendTelegramMessage(env.telegramBotToken, chatId, "⌛ Link expired. Generate a new one in MailMinto.");
    return NextResponse.json({ ok: true });
  }

  const { error: upsertErr } = await admin.from("telegram_configs").upsert(
    {
      user_id: linkRow.user_id,
      chat_id: chatId,
      bot_token_encrypted: null,
    },
    { onConflict: "user_id" },
  );
  if (upsertErr) {
    await sendTelegramMessage(env.telegramBotToken, chatId, `⚠️ Could not link: ${upsertErr.message}`);
    return NextResponse.json({ ok: false });
  }

  await admin.from("telegram_link_tokens").delete().eq("token", token);

  await sendTelegramMessage(
    env.telegramBotToken,
    chatId,
    `✅ Connected to MailMinto!\n\nYou'll get instant alerts here when high-priority emails arrive.`,
  );

  return NextResponse.json({ ok: true });
}
