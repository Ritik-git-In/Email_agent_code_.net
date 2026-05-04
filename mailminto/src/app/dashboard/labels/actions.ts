"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/crypto";
import { gmailFromRefreshToken } from "@/lib/gmail/client";
import {
  createLabel as gmailCreateLabel,
  updateLabel as gmailUpdateLabel,
  deleteLabel as gmailDeleteLabel,
} from "@/lib/gmail/labels";

type Result = { ok: true } | { ok: false; error: string };

async function getGmail(accountId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not authenticated" };

  const { data, error } = await supabase
    .from("gmail_accounts")
    .select("refresh_token_encrypted")
    .eq("id", accountId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (error || !data) return { ok: false as const, error: "Gmail account not found" };

  return {
    ok: true as const,
    gmail: gmailFromRefreshToken(decrypt(data.refresh_token_encrypted)),
  };
}

export async function createLabelAction(formData: FormData): Promise<Result> {
  const accountId = String(formData.get("account_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const bg = String(formData.get("bg") ?? "");
  const text = String(formData.get("text") ?? "");

  if (!accountId) return { ok: false, error: "Pick a Gmail account" };
  if (!name) return { ok: false, error: "Name is required" };
  if (name.length > 100) return { ok: false, error: "Name too long" };

  const ctx = await getGmail(accountId);
  if (!ctx.ok) return ctx;

  try {
    const color = bg && text ? { backgroundColor: bg, textColor: text } : undefined;
    await gmailCreateLabel(ctx.gmail, name, color);
    revalidatePath("/dashboard/labels");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "create failed" };
  }
}

export async function updateLabelAction(formData: FormData): Promise<Result> {
  const accountId = String(formData.get("account_id") ?? "");
  const labelId = String(formData.get("label_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const bg = String(formData.get("bg") ?? "");
  const text = String(formData.get("text") ?? "");

  if (!accountId || !labelId) return { ok: false, error: "Missing inputs" };
  if (!name) return { ok: false, error: "Name is required" };

  const ctx = await getGmail(accountId);
  if (!ctx.ok) return ctx;

  try {
    const color = bg && text ? { backgroundColor: bg, textColor: text } : null;
    await gmailUpdateLabel(ctx.gmail, labelId, { name, color });
    revalidatePath("/dashboard/labels");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "update failed" };
  }
}

export async function deleteLabelAction(
  accountId: string,
  labelId: string,
): Promise<Result> {
  const ctx = await getGmail(accountId);
  if (!ctx.ok) return ctx;

  try {
    await gmailDeleteLabel(ctx.gmail, labelId);
    revalidatePath("/dashboard/labels");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "delete failed" };
  }
}
