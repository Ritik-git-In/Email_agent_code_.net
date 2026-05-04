"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { encrypt } from "@/lib/crypto";

type Result = { ok: true } | { ok: false; error: string };

export async function saveApiKey(formData: FormData): Promise<Result> {
  const provider = String(formData.get("provider") ?? "");
  const key = String(formData.get("key") ?? "").trim();

  if (!["openai", "groq", "anthropic"].includes(provider)) {
    return { ok: false, error: "Invalid provider" };
  }
  if (!key || key.length < 10) {
    return { ok: false, error: "API key looks too short" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { error } = await supabase.from("api_keys").upsert(
    {
      user_id: user.id,
      provider,
      key_encrypted: encrypt(key),
    },
    { onConflict: "user_id,provider" },
  );

  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/integrations");
  return { ok: true };
}

export async function deleteApiKey(provider: string): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { error } = await supabase
    .from("api_keys")
    .delete()
    .eq("user_id", user.id)
    .eq("provider", provider);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/integrations");
  return { ok: true };
}

export async function saveTelegramConfig(formData: FormData): Promise<Result> {
  const botToken = String(formData.get("bot_token") ?? "").trim();
  const chatId = String(formData.get("chat_id") ?? "").trim();

  if (!botToken || !chatId) {
    return { ok: false, error: "Both bot token and chat ID are required" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { error } = await supabase.from("telegram_configs").upsert(
    {
      user_id: user.id,
      bot_token_encrypted: encrypt(botToken),
      chat_id: chatId,
    },
    { onConflict: "user_id" },
  );

  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/integrations");
  return { ok: true };
}

export async function deleteTelegramConfig(): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { error } = await supabase
    .from("telegram_configs")
    .delete()
    .eq("user_id", user.id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/integrations");
  return { ok: true };
}

export async function disconnectGmail(accountId: string): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { error } = await supabase
    .from("gmail_accounts")
    .delete()
    .eq("user_id", user.id)
    .eq("id", accountId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/integrations");
  return { ok: true };
}
