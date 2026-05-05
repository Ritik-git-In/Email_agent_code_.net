"use server";

import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/crypto";
import {
  gmailFromRefreshToken,
  listInboxPage,
  getMessageMetadata,
  type GmailMessageMeta,
} from "@/lib/gmail/client";
import { getUserOAuthCreds } from "@/lib/gmail/creds";

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
    const page = await listInboxPage(gmail, {
      maxResults: 50,
      pageToken: pageToken ?? undefined,
    });
    const messages = await Promise.all(
      page.ids.map((id) => getMessageMetadata(gmail, id).catch(() => null)),
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
