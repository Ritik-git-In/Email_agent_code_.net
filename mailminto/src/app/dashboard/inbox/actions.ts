"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/crypto";
import {
  gmailFromRefreshToken,
  listInboxThreadsPage,
  getThreadLatestMetadata,
  getMessageHeader,
  sendMessage,
  type GmailMessageMeta,
  type Attachment,
} from "@/lib/gmail/client";
import { getUserOAuthCreds } from "@/lib/gmail/creds";

const MAX_TOTAL_ATTACHMENTS_BYTES = 25 * 1024 * 1024;

export type InboxFetchResult =
  | {
      ok: true;
      messages: GmailMessageMeta[];
      nextPageToken: string | null;
    }
  | { ok: false; error: string };

export async function fetchInboxPageAction(
  accountId: string,
  pageToken: string | null,
): Promise<InboxFetchResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { data } = await supabase
    .from("gmail_accounts")
    .select("refresh_token_encrypted")
    .eq("id", accountId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!data) return { ok: false, error: "Gmail account not found" };

  try {
    const oauthCreds = await getUserOAuthCreds(user.id, supabase);
    const gmail = gmailFromRefreshToken(decrypt(data.refresh_token_encrypted), oauthCreds);
    const page = await listInboxThreadsPage(gmail, {
      maxResults: 50,
      pageToken: pageToken ?? undefined,
    });
    const messages = await Promise.all(
      page.threadIds.map((tid) => getThreadLatestMetadata(gmail, tid).catch(() => null)),
    );
    return {
      ok: true,
      messages: messages.filter((m): m is GmailMessageMeta => m !== null),
      nextPageToken: page.nextPageToken,
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "fetch failed" };
  }
}

export type SendReplyResult = { ok: true; sentId: string } | { ok: false; error: string };

export async function sendReplyAction(input: {
  accountId: string;
  messageId: string;
  threadId: string;
  to: string;
  subject: string;
  body: string;
  attachments?: Attachment[];
}): Promise<SendReplyResult> {
  const body = input.body.trim();
  if (!body) return { ok: false, error: "Reply body is empty" };
  const to = input.to.trim();
  if (!to) return { ok: false, error: "Missing recipient" };

  const attachments = input.attachments ?? [];
  let totalBytes = 0;
  for (const att of attachments) {
    if (!att.filename || !att.mimeType || !att.base64) {
      return { ok: false, error: "Invalid attachment payload" };
    }
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
    const originalMessageId = await getMessageHeader(gmail, input.messageId, "Message-ID").catch(() => "");
    const subject = input.subject.toLowerCase().startsWith("re:")
      ? input.subject
      : `Re: ${input.subject}`;
    const sentId = await sendMessage(gmail, {
      to,
      subject,
      body,
      html: true,
      threadId: input.threadId,
      inReplyTo: originalMessageId || undefined,
      references: originalMessageId || undefined,
      attachments: attachments.length > 0 ? attachments : undefined,
    });
    revalidatePath(`/dashboard/inbox/${input.messageId}`);
    revalidatePath("/dashboard/inbox");
    return { ok: true, sentId };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "send failed" };
  }
}
