import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/user";
import { decrypt } from "@/lib/crypto";
import { gmailFromRefreshToken } from "@/lib/gmail/client";
import { listUserLabels, type LabelInfo } from "@/lib/gmail/labels";
import { CreateLabelForm } from "./CreateLabelForm";
import { LabelRow } from "./LabelRow";
import { Tag } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function LabelsPage() {
  const user = await getCurrentUser();
  const supabase = await createClient();
  if (!user) return null;

  const { data: gmailAccounts } = await supabase
    .from("gmail_accounts")
    .select("id, email, refresh_token_encrypted")
    .eq("user_id", user.id);

  if (!gmailAccounts || gmailAccounts.length === 0) {
    return (
      <div className="px-8 py-10 max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight">Labels</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Manage Gmail labels — create, rename, recolor, delete.
        </p>
        <div className="mt-10 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 p-12 text-center">
          <Tag className="mx-auto h-8 w-8 text-zinc-400" />
          <p className="mt-3 text-zinc-500">
            Connect a Gmail account in Integrations first.
          </p>
        </div>
      </div>
    );
  }

  const groups: { account: { id: string; email: string }; labels: LabelInfo[]; error?: string }[] =
    await Promise.all(
      gmailAccounts.map(async (a) => {
        try {
          const gmail = gmailFromRefreshToken(decrypt(a.refresh_token_encrypted));
          const labels = await listUserLabels(gmail);
          return { account: { id: a.id, email: a.email }, labels };
        } catch (err) {
          return {
            account: { id: a.id, email: a.email },
            labels: [],
            error: err instanceof Error ? err.message : "fetch failed",
          };
        }
      }),
    );

  return (
    <div className="px-8 py-10 max-w-3xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Labels</h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Manage Gmail labels — create, rename, recolor, delete.
          </p>
        </div>
        <CreateLabelForm
          accounts={groups.map((g) => g.account)}
        />
      </div>

      <div className="mt-8 space-y-6">
        {groups.map(({ account, labels, error }) => (
          <section key={account.id}>
            <h2 className="text-sm font-semibold text-zinc-500 mb-2">{account.email}</h2>
            {error ? (
              <div className="rounded-lg bg-red-50 dark:bg-red-950 px-4 py-3 text-sm text-red-700 dark:text-red-400">
                {error}
              </div>
            ) : labels.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 p-8 text-center text-sm text-zinc-500">
                No labels yet. Click <strong>New label</strong> to create one.
              </div>
            ) : (
              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-200 dark:divide-zinc-800 overflow-hidden bg-white dark:bg-zinc-900">
                {labels.map((label) => (
                  <LabelRow key={label.id} label={label} accountId={account.id} />
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
