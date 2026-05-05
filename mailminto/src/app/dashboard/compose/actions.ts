"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/crypto";
import { gmailFromRefreshToken, sendMessage, type Attachment } from "@/lib/gmail/client";
import { getUserOAuthCreds } from "@/lib/gmail/creds";

export type SendComposeResult = { ok: true; sentId: string } | { ok: false; error: string };

const MAX_TOTAL_ATTACHMENTS_BYTES = 25 * 1024 * 1024; // Gmail per-message cap

export async function sendComposeAction(input: {
  accountId: string;
  to: string;
  subject: string;
  body: string;
  attachments?: Attachment[];
}): Promise<SendComposeResult> {
  const to = input.to.trim();
  const subject = input.subject.trim();
  const body = input.body.trim();

  if (!to) return { ok: false, error: "Recipient is required" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to.split(",")[0].trim())) {
    return { ok: false, error: "Recipient is not a valid email address" };
  }
  if (!subject) return { ok: false, error: "Subject is required" };
  if (!body) return { ok: false, error: "Message body is empty" };

  const attachments = input.attachments ?? [];
  let totalBytes = 0;
  for (const att of attachments) {
    if (!att.filename || !att.mimeType || !att.base64) {
      return { ok: false, error: "Invalid attachment payload" };
    }
    // Approx decoded size = base64.length * 3 / 4
    totalBytes += Math.ceil((att.base64.length * 3) / 4);
  }
  if (totalBytes > MAX_TOTAL_ATTACHMENTS_BYTES) {
    return { ok: false, error: "Attachments exceed 25 MB limit" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { data } = await supabase
    .from("gmail_accounts")
    .select("refresh_token_encrypted")
    .eq("id", input.accountId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!data) return { ok: false, error: "Gmail account not found" };

  try {
    const oauthCreds = await getUserOAuthCreds(user.id, supabase);
    const gmail = gmailFromRefreshToken(decrypt(data.refresh_token_encrypted), oauthCreds);
    const sentId = await sendMessage(gmail, {
      to,
      subject,
      body,
      html: true,
      attachments: attachments.length > 0 ? attachments : undefined,
    });
    revalidatePath("/dashboard/inbox");
    return { ok: true, sentId };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "send failed" };
  }
}
