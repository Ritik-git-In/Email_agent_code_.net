"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/crypto";
import { gmailFromRefreshToken } from "@/lib/gmail/client";
import { getUserOAuthCreds } from "@/lib/gmail/creds";
import { getDraft, sendDraft, deleteDraft, listDraftsPage, type DraftSummary } from "@/lib/gmail/drafts";

type Result = { ok: true } | { ok: false; error: string };
type BodyResult = { ok: true; body: string } | { ok: false; error: string };
export type DraftsFetchResult =
  | {
      ok: true;
      drafts: DraftSummary[];
      nextPageToken: string | null;
    }
  | { ok: false; error: string };

export async function fetchDraftsPageAction(
  accountId: string,
  pageToken: string | null,
): Promise<DraftsFetchResult> {
  const ctx = await getGmailForAccount(accountId);
  if (!ctx.ok) return ctx;
  try {
    const page = await listDraftsPage(ctx.gmail, {
      maxResults: 50,
      pageToken: pageToken ?? undefined,
    });
    return { ok: true, drafts: page.drafts, nextPageToken: page.nextPageToken };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "fetch failed" };
  }
}

async function getGmailForAccount(accountId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not authenticated" };

  const { data } = await supabase
    .from("gmail_accounts")
    .select("refresh_token_encrypted")
    .eq("id", accountId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!data) return { ok: false as const, error: "Gmail account not found" };

  try {
    const oauthCreds = await getUserOAuthCreds(user.id, supabase);
    return {
      ok: true as const,
      gmail: gmailFromRefreshToken(decrypt(data.refresh_token_encrypted), oauthCreds),
    };
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : "creds_missing" };
  }
}

export async function fetchDraftBodyAction(
  accountId: string,
  draftId: string,
): Promise<BodyResult> {
  const ctx = await getGmailForAccount(accountId);
  if (!ctx.ok) return ctx;
  try {
    const draft = await getDraft(ctx.gmail, draftId);
    if (!draft) return { ok: false, error: "Draft not found" };
    return { ok: true, body: draft.body };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "fetch failed" };
  }
}

export async function sendDraftAction(
  accountId: string,
  draftId: string,
): Promise<Result> {
  const ctx = await getGmailForAccount(accountId);
  if (!ctx.ok) return ctx;
  try {
    await sendDraft(ctx.gmail, draftId);
    const supabase = await createClient();
    await supabase
      .from("emails_processed")
      .update({ action_taken: "draft_sent", draft_id: null })
      .eq("draft_id", draftId);
    revalidatePath("/dashboard/drafts");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "send failed" };
  }
}

export async function deleteDraftAction(
  accountId: string,
  draftId: string,
): Promise<Result> {
  const ctx = await getGmailForAccount(accountId);
  if (!ctx.ok) return ctx;
  try {
    await deleteDraft(ctx.gmail, draftId);
    const supabase = await createClient();
    await supabase
      .from("emails_processed")
      .update({ action_taken: "draft_deleted", draft_id: null })
      .eq("draft_id", draftId);
    revalidatePath("/dashboard/drafts");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "delete failed" };
  }
}
