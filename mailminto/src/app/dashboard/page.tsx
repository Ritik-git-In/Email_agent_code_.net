import Link from "next/link";
import { Plug, Mail, Tag, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/user";
import { ProcessNowButton } from "./ProcessNowButton";

export const dynamic = "force-dynamic";

const CATEGORY_LABELS: Record<string, { name: string; tone: string }> = {
  high_priority: { name: "High Priority", tone: "bg-red-500/10 text-red-600 dark:text-red-400" },
  finance: { name: "Finance", tone: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  customer_support: { name: "Customer Support", tone: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  promotion: { name: "Promotion", tone: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
  internal: { name: "Internal", tone: "bg-green-500/10 text-green-600 dark:text-green-400" },
};

export default async function DashboardOverview() {
  const user = await getCurrentUser();
  const supabase = await createClient();
  if (!user) return null;

  const greeting =
    user.user_metadata?.full_name?.split(" ")[0] ??
    user.email?.split("@")[0] ??
    "there";

  const [
    { count: gmailCount },
    { count: keyCount },
    { count: telegramCount },
    { count: processedTotal },
    { data: recent },
  ] = await Promise.all([
    supabase.from("gmail_accounts").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("api_keys").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("telegram_configs").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("emails_processed").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    supabase
      .from("emails_processed")
      .select("id, subject, from_email, category, processed_at")
      .eq("user_id", user.id)
      .order("processed_at", { ascending: false })
      .limit(5),
  ]);

  const ready = (gmailCount ?? 0) > 0 && (keyCount ?? 0) > 0;

  return (
    <div className="px-8 py-10 max-w-5xl">
      <h1 className="text-3xl font-bold tracking-tight">
        Hey {greeting} 👋
      </h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Welcome to MailMinto. {ready ? "Click below to process your unread emails." : "Let's get your inbox automated."}
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-4">
        <Stat label="Gmail accounts" value={gmailCount ?? 0} />
        <Stat label="LLM keys" value={keyCount ?? 0} />
        <Stat label="Telegram" value={(telegramCount ?? 0) > 0 ? "On" : "Off"} />
        <Stat label="Processed total" value={processedTotal ?? 0} />
      </div>

      {ready ? (
        <div className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Run pipeline
          </h2>
          <div className="mt-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
              Fetches up to 25 unread emails, classifies them, applies labels, and creates drafts for High Priority + Customer Support.
            </p>
            <ProcessNowButton />
          </div>
        </div>
      ) : (
        <div className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Setup checklist
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <SetupCard
              step={1}
              title="Connect Gmail"
              desc="Authorize MailMinto to read and label your inbox."
              href="/dashboard/integrations"
              icon={<Mail className="h-5 w-5" />}
              done={(gmailCount ?? 0) > 0}
            />
            <SetupCard
              step={2}
              title="Add an LLM key"
              desc="Bring your own Groq, OpenAI, or Anthropic key."
              href="/dashboard/integrations"
              icon={<Plug className="h-5 w-5" />}
              done={(keyCount ?? 0) > 0}
            />
            <SetupCard
              step={3}
              title="Tune your rules"
              desc="Customize the prompts behind each of the 5 categories."
              href="/dashboard/rules"
              icon={<Tag className="h-5 w-5" />}
              done={false}
            />
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

function SetupCard({
  step,
  title,
  desc,
  href,
  icon,
  done,
}: {
  step: number;
  title: string;
  desc: string;
  href: string;
  icon: React.ReactNode;
  done: boolean;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors"
    >
      <div className="flex items-start justify-between">
        <div className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${done ? "bg-green-500/10 text-green-600 dark:text-green-400" : "bg-zinc-100 dark:bg-zinc-800"}`}>
          {icon}
        </div>
        <span className="text-xs font-mono text-zinc-400">{done ? "✓ Done" : `Step ${step}`}</span>
      </div>
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{desc}</p>
      <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-300 group-hover:gap-2 transition-all">
        Configure <ArrowRight className="h-3.5 w-3.5" />
      </div>
    </Link>
  );
}
