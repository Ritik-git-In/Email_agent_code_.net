import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/user";
import { decrypt } from "@/lib/crypto";
import { gmailFromRefreshToken, getLabelTotals } from "@/lib/gmail/client";
import { listDraftsPage, type DraftSummary } from "@/lib/gmail/drafts";
import { DraftsList } from "./DraftsList";
import { FileText, AlertCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DraftsPage() {
  const user = await getCurrentUser();
  const supabase = await createClient();
  if (!user) return null;

  const { data: gmailAccounts } = await supabase
    .from("gmail_accounts")
    .select("id, email, refresh_token_encrypted")
    .eq("user_id", user.id);

  if (!gmailAccounts || gmailAccounts.length === 0) {
    return (
      <div className="px-8 py-10 max-w-4xl">
        <h1 className="text-3xl font-bold tracking-tight">Drafts</h1>
        <div className="mt-10 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 p-12 text-center">
          <FileText className="mx-auto h-8 w-8 text-zinc-400" />
          <p className="mt-3 text-zinc-500">
            Connect a Gmail account in <Link href="/dashboard/integrations" className="underline">Integrations</Link> first.
          </p>
        </div>
      </div>
    );
  }

  const { data: mailmintoRows } = await supabase
    .from("emails_processed")
    .select("draft_id, category")
    .eq("user_id", user.id)
    .not("draft_id", "is", null);
  const classifiedMap: Record<string, string> = {};
  for (const r of mailmintoRows ?? []) {
    if (r.draft_id) classifiedMap[r.draft_id] = r.category ?? "";
  }

  type Group = {
    account: { id: string; email: string };
    initialDrafts: DraftSummary[];
    nextPageToken: string | null;
    total: number;
    error?: string;
  };

  const groups: Group[] = await Promise.all(
    gmailAccounts.map(async (a): Promise<Group> => {
      try {
        const gmail = gmailFromRefreshToken(decrypt(a.refresh_token_encrypted));
        const [page, totals] = await Promise.all([
          listDraftsPage(gmail, { maxResults: 50 }),
          getLabelTotals(gmail, "DRAFT"),
        ]);
        return {
          account: { id: a.id, email: a.email },
          initialDrafts: page.drafts,
          nextPageToken: page.nextPageToken,
          total: totals.total,
        };
      } catch (err) {
        return {
          account: { id: a.id, email: a.email },
          initialDrafts: [],
          nextPageToken: null,
          total: 0,
          error: err instanceof Error ? err.message : "fetch failed",
        };
      }
    }),
  );

  return (
    <div className="px-8 py-10 max-w-4xl">
      <h1 className="text-3xl font-bold tracking-tight">Drafts</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Every draft in your Gmail account. Click a draft to view, send, or delete.
      </p>

      <div className="mt-8 space-y-8">
        {groups.map((g) => (
          <section key={g.account.id}>
            {gmailAccounts.length > 1 && (
              <h2 className="text-sm font-semibold text-zinc-500 mb-2">{g.account.email}</h2>
            )}
            {g.error ? (
              <div className="rounded-2xl border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950 p-5 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                <p className="text-sm text-red-800 dark:text-red-300">{g.error}</p>
              </div>
            ) : (
              <DraftsList
                accountId={g.account.id}
                initialDrafts={g.initialDrafts.map((d) => ({
                  ...d,
                  date: d.date.toISOString(),
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
