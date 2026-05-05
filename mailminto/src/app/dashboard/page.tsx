import Link from "next/link";
import { redirect } from "next/navigation";
import { Send } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/user";
import { ProcessNowButton } from "./ProcessNowButton";
import { FirstRunProcessor } from "./FirstRunProcessor";

export const dynamic = "force-dynamic";

const CATEGORY_LABELS: Record<string, { name: string; tone: string }> = {
  high_priority: { name: "High Priority", tone: "bg-red-500/10 text-red-600 dark:text-red-400" },
  finance: { name: "Finance", tone: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  customer_support: { name: "Customer Support", tone: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  promotion: { name: "Promotion", tone: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
  internal: { name: "Internal", tone: "bg-green-500/10 text-green-600 dark:text-green-400" },
};

export default async function DashboardOverview(props: {
  searchParams: Promise<{ first_run?: string; connected?: string }>;
}) {
  const searchParams = await props.searchParams;
  const user = await getCurrentUser();
  const supabase = await createClient();
  if (!user) return null;

  const greeting =
    user.user_metadata?.full_name?.split(" ")[0] ??
    user.email?.split("@")[0] ??
    "there";

  const [
    { count: gmailCount },
    { data: googleCreds },
    { data: telegramRow },
    { count: processedTotal },
    { data: recent },
  ] = await Promise.all([
    supabase.from("gmail_accounts").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    supabase
      .from("google_oauth_creds")
      .select("client_id")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("telegram_configs")
      .select("chat_id")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase.from("emails_processed").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    supabase
      .from("emails_processed")
      .select("id, subject, from_email, category, processed_at")
      .eq("user_id", user.id)
      .order("processed_at", { ascending: false })
      .limit(5),
  ]);

  const credsConfigured = Boolean(googleCreds);
  const gmailConnected = (gmailCount ?? 0) > 0;
  const telegramConnected = Boolean(telegramRow?.chat_id);

  // If user hasn't completed Step 1 (creds) or Step 2 (Gmail connect), send them to setup.
  if (!credsConfigured || !gmailConnected) {
    redirect("/dashboard/setup");
  }

  return (
    <div className="px-8 py-10 max-w-5xl">
      <h1 className="text-3xl font-bold tracking-tight">
        Hey {greeting} 👋
      </h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Welcome back. Process your unread emails or check what&apos;s landed in your inbox.
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <Stat label="Gmail accounts" value={gmailCount ?? 0} />
        <Stat label="Telegram alerts" value={telegramConnected ? "On" : "Off"} />
        <Stat label="Processed total" value={processedTotal ?? 0} />
      </div>

      {!telegramConnected && (
        <div className="mt-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-blue-50 dark:bg-blue-950/30 p-5 flex items-center justify-between gap-4">
          <div>
            <div className="font-medium text-sm">Get instant alerts on Telegram</div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              We&apos;ll ping your Telegram bot when a high-priority email arrives.
            </p>
          </div>
          <Link
            href="/dashboard/setup"
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#229ED9] text-white px-4 py-2 text-sm font-medium hover:opacity-90"
          >
            <Send className="h-4 w-4" />
            Set up Telegram
          </Link>
        </div>
      )}

      {searchParams.first_run === "1" ? (
        <div className="mt-8">
          <FirstRunProcessor connectedEmail={searchParams.connected} />
        </div>
      ) : (
        <div className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Run pipeline
          </h2>
          <div className="mt-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
              Fetches your unread emails (up to your daily limit), classifies them, applies labels, and drafts replies for High Priority + Customer Support.
            </p>
            <ProcessNowButton />
          </div>
        </div>
      )}

      {recent && recent.length > 0 && (
        <div className="mt-12">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Recently processed
          </h2>
          <div className="mt-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-200 dark:divide-zinc-800 overflow-hidden">
            {recent.map((email) => {
              const cat = CATEGORY_LABELS[email.category ?? ""];
              return (
                <div
                  key={email.id}
                  className="flex items-center gap-4 px-5 py-3 bg-white dark:bg-zinc-900"
                >
                  {cat && (
                    <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cat.tone}`}>
                      {cat.name}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm truncate">{email.subject || "(no subject)"}</div>
                    <div className="text-xs text-zinc-500 truncate">{email.from_email}</div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 text-right">
            <Link href="/dashboard/inbox" className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
              View all →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}
