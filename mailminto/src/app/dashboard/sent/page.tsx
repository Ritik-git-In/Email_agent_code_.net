import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/user";
import { decrypt } from "@/lib/crypto";
import {
  gmailFromRefreshToken,
  listSentPage,
  getMessageMetadata,
  type GmailMessageMeta,
} from "@/lib/gmail/client";
import { getUserOAuthCreds } from "@/lib/gmail/creds";
import { Send, AlertCircle } from "lucide-react";
import { SentList } from "./SentList";

export const dynamic = "force-dynamic";

export default async function SentPage() {
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
        <h1 className="text-3xl font-bold tracking-tight">Sent</h1>
        <div className="mt-10 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 p-12 text-center">
          <Send className="mx-auto h-8 w-8 text-zinc-400" />
          <p className="mt-3 text-zinc-500">
            Connect a Gmail account in <Link href="/dashboard/setup" className="underline">Setup</Link> first.
          </p>
        </div>
      </div>
    );
  }

  type Group = {
    account: { id: string; email: string };
    initialMessages: GmailMessageMeta[];
    nextPageToken: string | null;
    total: number;
    error?: string;
  };

  const oauthCreds = await getUserOAuthCreds(user.id, supabase);

  const groups: Group[] = await Promise.all(
    gmailAccounts.map(async (a): Promise<Group> => {
      try {
        const gmail = gmailFromRefreshToken(decrypt(a.refresh_token_encrypted), oauthCreds);
        const page = await listSentPage(gmail, { maxResults: 50 });
        const messages = await Promise.all(
          page.ids.map((id) => getMessageMetadata(gmail, id).catch(() => null)),
        );
        return {
          account: { id: a.id, email: a.email },
          initialMessages: messages.filter((m): m is GmailMessageMeta => m !== null),
          nextPageToken: page.nextPageToken,
          total: page.resultSizeEstimate,
        };
      } catch (err) {
        return {
          account: { id: a.id, email: a.email },
          initialMessages: [],
          nextPageToken: null,
          total: 0,
          error: err instanceof Error ? err.message : "fetch failed",
        };
      }
    }),
  );

  return (
    <div className="px-8 py-10 max-w-5xl">
      <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
        <Send className="h-7 w-7" />
        Sent
      </h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Emails you&apos;ve sent from MailMinto and Gmail.
      </p>

      <div className="mt-8 space-y-8">
        {groups.map((g) => (
          <section key={g.account.id}>
            {gmailAccounts.length > 1 && (
              <h2 className="text-sm font-semibold mb-3 text-zinc-700 dark:text-zinc-300">
                {g.account.email}
              </h2>
            )}
            {g.error ? (
              <div className="rounded-2xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950 p-5 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <div className="text-sm">{g.error}</div>
              </div>
            ) : (
              <SentList
                accountId={g.account.id}
                initialMessages={g.initialMessages.map((m) => ({
                  ...m,
                  date: m.date.toISOString(),
                }))}
                initialNextPageToken={g.nextPageToken}
                total={g.total}
              />
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
