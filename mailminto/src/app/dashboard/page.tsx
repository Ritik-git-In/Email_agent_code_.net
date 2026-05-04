import Link from "next/link";
import { Mail, Send, ArrowRight, CheckCircle2 } from "lucide-react";
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
    { count: telegramCount },
    { count: processedTotal },
    { data: recent },
  ] = await Promise.all([
    supabase.from("gmail_accounts").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("telegram_configs").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("emails_processed").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    supabase
      .from("emails_processed")
      .select("id, subject, from_email, category, processed_at")
      .eq("user_id", user.id)
      .order("processed_at", { ascending: false })
      .limit(5),
  ]);

  const gmailConnected = (gmailCount ?? 0) > 0;
  const telegramConnected = (telegramCount ?? 0) > 0;

  if (!gmailConnected) {
    return <OnboardingWizard greeting={greeting} telegramConnected={telegramConnected} />;
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
              One tap — no bot setup. We&apos;ll ping you when high-priority emails arrive.
            </p>
          </div>
          <a
            href="/api/telegram/link"
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#229ED9] text-white px-4 py-2 text-sm font-medium hover:opacity-90"
          >
            <Send className="h-4 w-4" />
            Connect Telegram
          </a>
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

function OnboardingWizard({
  greeting,
  telegramConnected,
}: {
  greeting: string;
  telegramConnected: boolean;
}) {
  return (
    <div className="px-8 py-16 max-w-3xl mx-auto">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">
          Welcome, {greeting} 👋
        </h1>
        <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-400">
          Get your inbox automated in 2 quick steps.
        </p>
      </div>

      <div className="mt-12 space-y-4">
        <WizardStep
          number={1}
          title="Connect Gmail"
          desc="Authorize MailMinto to read, label, and draft replies. We never store email content — just metadata."
          actionLabel="Connect Gmail"
          actionHref="/api/gmail/connect"
          icon={<Mail className="h-6 w-6" />}
          done={false}
          primary
        />

        <WizardStep
          number={2}
          title="Get alerts on Telegram"
          desc="One-tap connect. We'll ping you instantly when a high-priority email lands."
          actionLabel={telegramConnected ? "Connected" : "Connect Telegram"}
          actionHref={telegramConnected ? undefined : "/api/telegram/link"}
          icon={<Send className="h-6 w-6" />}
          done={telegramConnected}
          optional
        />
      </div>

      <p className="mt-10 text-center text-sm text-zinc-500">
        Step 2 is optional — you can do it later from the dashboard.
      </p>
    </div>
  );
}

function WizardStep({
  number,
  title,
  desc,
  actionLabel,
  actionHref,
  icon,
  done,
  primary,
  optional,
}: {
  number: number;
  title: string;
  desc: string;
  actionLabel: string;
  actionHref?: string;
  icon: React.ReactNode;
  done: boolean;
  primary?: boolean;
  optional?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-6 flex items-start gap-5 ${
        done
          ? "border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-950/30"
          : primary
            ? "border-zinc-900 dark:border-zinc-100 bg-white dark:bg-zinc-900"
            : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
      }`}
    >
      <div
        className={`shrink-0 inline-flex h-12 w-12 items-center justify-center rounded-xl ${
          done
            ? "bg-green-500/10 text-green-600 dark:text-green-400"
            : "bg-zinc-100 dark:bg-zinc-800"
        }`}
      >
        {done ? <CheckCircle2 className="h-6 w-6" /> : icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-zinc-400">STEP {number}</span>
          {optional && (
            <span className="text-xs uppercase tracking-wide text-zinc-400">Optional</span>
          )}
        </div>
        <h3 className="mt-1 text-lg font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{desc}</p>
      </div>
      {actionHref && !done && (
        <a
          href={actionHref}
          className={`shrink-0 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ${
            primary
              ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90"
              : "bg-[#229ED9] text-white hover:opacity-90"
          }`}
        >
          {actionLabel}
          <ArrowRight className="h-4 w-4" />
        </a>
      )}
      {done && (
        <span className="shrink-0 text-sm font-medium text-green-600 dark:text-green-400">
          ✓ Done
        </span>
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
