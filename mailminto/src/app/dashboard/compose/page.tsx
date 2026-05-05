import Link from "next/link";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/user";
import { ComposeForm, type Contact } from "./ComposeForm";

export const dynamic = "force-dynamic";

function parseFrom(s: string): Contact | null {
  if (!s) return null;
  const angled = s.match(/^([^<]*)<([^>]+)>\s*$/);
  if (angled) {
    const name = angled[1].trim().replace(/^"|"$/g, "");
    const email = angled[2].trim();
    if (!email.includes("@")) return null;
    return { name: name || email, email };
  }
  const plain = s.trim();
  if (plain.includes("@")) return { name: plain, email: plain };
  return null;
}

export default async function ComposePage() {
  const user = await getCurrentUser();
  const supabase = await createClient();
  if (!user) return null;

  const { data: gmailAccounts } = await supabase
    .from("gmail_accounts")
    .select("id, email")
    .eq("user_id", user.id);

  if (!gmailAccounts || gmailAccounts.length === 0) {
    return (
      <div className="px-8 py-10 max-w-3xl">
        <Link
          href="/dashboard/inbox"
          className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to inbox
        </Link>
        <div className="mt-6 rounded-2xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950 p-5 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <div className="text-sm">
            Connect a Gmail account first in <Link href="/dashboard/setup" className="underline">Setup</Link>.
          </div>
        </div>
      </div>
    );
  }

  // Build recent-contact suggestions from previously processed senders
  const { data: senderRows } = await supabase
    .from("emails_processed")
    .select("from_email, processed_at")
    .eq("user_id", user.id)
    .order("processed_at", { ascending: false })
    .limit(500);

  const seen = new Set<string>();
  const contacts: Contact[] = [];
  for (const row of senderRows ?? []) {
    if (!row.from_email) continue;
    const parsed = parseFrom(row.from_email as string);
    if (!parsed) continue;
    const lower = parsed.email.toLowerCase();
    if (seen.has(lower)) continue;
    seen.add(lower);
    contacts.push(parsed);
    if (contacts.length >= 100) break;
  }

  return (
    <div className="px-8 py-10 max-w-4xl">
      <Link
        href="/dashboard/inbox"
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to inbox
      </Link>

      <h1 className="mt-3 text-3xl font-bold tracking-tight">Compose</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Write a new email. It&apos;ll be sent from your connected Gmail account.
      </p>

      <div className="mt-6">
        <ComposeForm accounts={gmailAccounts} contacts={contacts} />
      </div>
    </div>
  );
}
