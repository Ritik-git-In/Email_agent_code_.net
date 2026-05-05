import Link from "next/link";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/user";
import { decrypt } from "@/lib/crypto";
import { gmailFromRefreshToken, getMessage, markThreadAsRead } from "@/lib/gmail/client";
import { getUserOAuthCreds } from "@/lib/gmail/creds";
import { ReplyForm } from "./ReplyForm";
import { HtmlEmailBody } from "./HtmlEmailBody";

export const dynamic = "force-dynamic";

function extractEmailAddress(from: string): string {
  const match = from.match(/<([^>]+)>/);
  return match ? match[1] : from.trim();
}

function senderName(from: string): string {
  const match = from.match(/^([^<]+)<.+>$/);
  return match ? match[1].trim().replace(/^"|"$/g, "") : from;
}

// Plain-text emails are usually hard-wrapped at ~70 chars by the sender's mail
// client. Re-flow long-wrapped lines into single paragraphs while preserving
// genuinely short lines (signatures, lists) as separate lines.
function unwrapEmailBody(body: string): string {
  const lines = body.split(/\r?\n/);
  if (lines.length === 0) return body;
  let out = lines[0] ?? "";
  for (let i = 1; i < lines.length; i++) {
    const prev = lines[i - 1];
    const curr = lines[i];
    if (prev.length >= 60 && curr.length > 0) {
      out += " " + curr;
    } else {
      out += "\n" + curr;
    }
  }
  return out;
}

function formatFullDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function EmailDetailPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ account?: string }>;
}) {
  const [{ id }, { account: accountIdParam }] = await Promise.all([
    props.params,
    props.searchParams,
  ]);
  const user = await getCurrentUser();
  const supabase = await createClient();
  if (!user) return null;

  const { data: gmailAccounts } = await supabase
    .from("gmail_accounts")
    .select("id, email, refresh_token_encrypted")
    .eq("user_id", user.id);

  const account =
    (accountIdParam && gmailAccounts?.find((a) => a.id === accountIdParam)) ||
    gmailAccounts?.[0];

  if (!account) {
    return (
      <div className="px-8 py-10 max-w-6xl">
        <Link
          href="/dashboard/inbox"
          className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to inbox
        </Link>
        <div className="mt-6 rounded-2xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950 p-5 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <div className="text-sm">No Gmail account found.</div>
        </div>
      </div>
    );
  }

  let body = "";
  let bodyHtml: string | undefined;
  let subject = "";
  let from = "";
  let to = "";
  let receivedAt: Date | null = null;
  let threadId = "";
  let error: string | null = null;

  try {
    const oauthCreds = await getUserOAuthCreds(user.id, supabase);
    const gmail = gmailFromRefreshToken(decrypt(account.refresh_token_encrypted), oauthCreds);
    const msg = await getMessage(gmail, id);
    body = msg.body;
    bodyHtml = msg.bodyHtml;
    subject = msg.subject;
    from = msg.from;
    to = msg.to;
    receivedAt = msg.receivedAt;
    threadId = msg.threadId;

    // Silently mark the entire THREAD as read in Gmail (matches Gmail UI:
    // opening one row clears the blue highlight for the whole conversation,
    // not just the most-recent message). Idempotent — no-op if already read.
    markThreadAsRead(gmail, msg.threadId).catch(() => {
      // best-effort; failures shouldn't block rendering the email
    });
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load email";
  }

  return (
    <div className="px-8 py-10 max-w-6xl">
      <Link
        href="/dashboard/inbox"
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to inbox
      </Link>

      {error ? (
        <div className="mt-6 rounded-2xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950 p-5 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <div className="text-sm">{error}</div>
        </div>
      ) : (
        <>
          <div className="mt-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
            <h1 className="text-2xl font-bold tracking-tight">
              {subject || "(no subject)"}
            </h1>
            <div className="mt-3 flex items-start justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
              <div className="min-w-0">
                <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {senderName(from)}
                </div>
                <div className="text-xs text-zinc-500 font-mono truncate">
                  {extractEmailAddress(from)}
                </div>
                {to && (
                  <div className="mt-1 text-xs text-zinc-500">
                    to <span className="font-mono">{to}</span>
                  </div>
                )}
              </div>
              {receivedAt && (
                <div className="text-xs text-zinc-400 shrink-0 whitespace-nowrap">
                  {formatFullDate(receivedAt)}
                </div>
              )}
            </div>
            <div className="mt-5">
              {bodyHtml ? (
                <HtmlEmailBody html={bodyHtml} />
              ) : (
                <div className="whitespace-pre-wrap break-words text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
                  {body ? unwrapEmailBody(body) : "(empty body)"}
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 mb-3">
              Reply
            </h2>
            <ReplyForm
              accountId={account.id}
              messageId={id}
              threadId={threadId}
              to={
                extractEmailAddress(from).toLowerCase() === account.email.toLowerCase()
                  ? extractEmailAddress(to)
                  : extractEmailAddress(from)
              }
              subject={subject}
            />
          </div>
        </>
      )}
    </div>
  );
}
