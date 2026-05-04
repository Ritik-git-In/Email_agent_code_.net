import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/user";
import { decrypt } from "@/lib/crypto";
import {
  gmailFromRefreshToken,
  listInboxPage,
  getMessageMetadata,
  getLabelTotals,
  type GmailMessageMeta,
} from "@/lib/gmail/client";
import { Inbox, AlertCircle } from "lucide-react";
import { InboxList } from "./InboxList";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const user = await getCurrentUser();
  const supabase = await createClient();
  if (!user) return null;

  const { data: gmailAccounts } = await supabase
    .from("gmail_accounts")
    .select("id, email, refresh_token_encrypted")
    .eq("user_id", user.id);

  if (!gmailAccounts || gmailAccounts.length === 0) {
    return (
      <div className="px-8 py-10 max-w-5xl">
        <h1 className="text-3xl font-bold tracking-tight">Inbox</h1>
        <div className="mt-10 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 p-12 text-center">
          <Inbox className="mx-auto h-8 w-8 text-zinc-400" />
          <p className="mt-3 text-zinc-500">
            Connect a Gmail account in <Link href="/dashboard/integrations" className="underline">Integrations</Link> first.
          </p>
        </div>
      </div>
    );
  }

  const { data: classifiedRows } = await supabase
    .from("emails_processed")
    .select("gmail_msg_id, category")
    .eq("user_id", user.id);
  const classifiedMap: Record<string, string> = {};
  for (const r of classifiedRows ?? []) {
    if (r.gmail_msg_id) classifiedMap[r.gmail_msg_id] = r.category ?? "";
  }

  type Group = {
    account: { id: string; email: string };
    initialMessages: GmailMessageMeta[];
    nextPageToken: string | null;
    total: number;
    unread: number;
    error?: string;
  };

  const groups: Group[] = await Promise.all(
    gmailAccounts.map(async (a): Promise<Group> => {
      try {
        const gmail = gmailFromRefreshToken(decrypt(a.refresh_token_encrypted));
        const [page, totals] = await Promise.all([
          listInboxPage(gmail, { maxResults: 50 }),
          getLabelTotals(gmail, "INBOX"),
        ]);
        const messages = await Promise.all(
          page.ids.map((id) => getMessageMetadata(gmail, id).catch(() => null)),
        );
        return {
          account: { id: a.id, email: a.email },
          initialMessages: messages.filter((m): m is GmailMessageMeta => m !== null),
          nextPageToken: page.nextPageToken,
          total: totals.total,
          unread: totals.unread,
        };
      } catch (err) {
        return {
          account: { id: a.id, email: a.email },
          initialMessages: [],
          nextPageToken: null,
          total: 0,
          unread: 0,
          error: err instanceof Error ? err.message : "fetch failed",
        };
      }
    }),
  );

  return (
    <div className="px-8 py-10 max-w-5xl">
      <h1 className="text-3xl font-bold tracking-tight">Inbox</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Every email in your Gmail inbox, with classification badges from MailMinto.
      </p>

      <div className="mt-8 space-y-8">
        {groups.map((g) => (
          <section key={g.account.id}>
            {gmailAccounts.length > 1 && (
              <h2 className="text-sm font-semibold text-zinc-500 mb-2">
                {g.account.email} {g.unread > 0 && `· ${g.unread} unread`}
              </h2>
            )}
            {g.error ? (
              <div className="rounded-2xl border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950 p-5 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                <p className="text-sm text-red-800 dark:text-red-300">{g.error}</p>
              </div>
            ) : (
              <InboxList
                accountId={g.account.id}
                initialMessages={g.initialMessages.map((m) => ({
                  ...m,
                  date: m.date.toISOString(),
                }))}
                initialNextPageToken={g.nextPageToken}
                total={g.total}
                classifiedMap={classifiedMap}
              />
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
