import Link from "next/link";
import { Cloud, Mail, Send, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/user";
import { env } from "@/lib/env";
import { GoogleCredsForm } from "./GoogleCredsForm";
import { TelegramForm } from "../integrations/TelegramForm";

export const dynamic = "force-dynamic";

export default async function SetupPage(props: {
  searchParams: Promise<{ error?: string; connected?: string }>;
}) {
  const sp = await props.searchParams;
  const user = await getCurrentUser();
  const supabase = await createClient();
  if (!user) return null;

  const [{ data: googleCreds }, { data: gmailAccounts }, { data: telegramConfig }] =
    await Promise.all([
      supabase
        .from("google_oauth_creds")
        .select("client_id")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("gmail_accounts")
        .select("id, email")
        .eq("user_id", user.id),
      supabase
        .from("telegram_configs")
        .select("chat_id")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

  const step1Done = Boolean(googleCreds);
  const step2Done = (gmailAccounts?.length ?? 0) > 0;
  const step3Done = Boolean(telegramConfig?.chat_id);

  return (
    <div className="px-8 py-10 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Set up MailMinto</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Three quick steps. You&apos;ll provide your own Google Cloud credentials so MailMinto
          accesses only <strong>your</strong> Gmail — no Google verification needed.
        </p>
      </div>

      {sp.error && (
        <div className="mt-6 flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-950 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{decodeURIComponent(sp.error).replaceAll("_", " ")}</span>
        </div>
      )}
      {sp.connected && (
        <div className="mt-6 flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-950 px-4 py-3 text-sm text-green-700 dark:text-green-400">
          <CheckCircle2 className="h-4 w-4" />
          Connected <strong>{sp.connected}</strong>
        </div>
      )}

      <div className="mt-8 space-y-4">
        {/* Step 1: Google Cloud creds */}
        <SetupCard
          number={1}
          title="Add your Google Cloud credentials"
          desc="Create a free Google Cloud project and OAuth client. We'll guide you."
          icon={<Cloud className="h-6 w-6" />}
          done={step1Done}
          locked={false}
        >
          <GoogleCredsForm
            existing={googleCreds ?? null}
            redirectUri={env.googleRedirectUri}
          />
        </SetupCard>

        {/* Step 2: Connect Gmail */}
        <SetupCard
          number={2}
          title="Connect your Gmail account"
          desc="Authorize MailMinto with the OAuth client you just created."
          icon={<Mail className="h-6 w-6" />}
          done={step2Done}
          locked={!step1Done}
        >
          {step2Done ? (
            <div className="rounded-lg border border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-950/30 p-4 text-sm">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-medium">
                <CheckCircle2 className="h-4 w-4" />
                {gmailAccounts?.length ?? 0} Gmail account{(gmailAccounts?.length ?? 0) > 1 ? "s" : ""} connected
              </div>
              <ul className="mt-2 space-y-1 text-zinc-600 dark:text-zinc-400 text-xs">
                {gmailAccounts?.map((a) => (
                  <li key={a.id} className="font-mono">{a.email}</li>
                ))}
              </ul>
              <a
                href="/api/gmail/connect"
                className="mt-3 inline-flex items-center gap-1 text-xs underline text-blue-600 dark:text-blue-400"
              >
                + Add another account
              </a>
            </div>
          ) : step1Done ? (
            <div className="space-y-3">
              <div className="text-sm text-zinc-600 dark:text-zinc-400 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-3">
                <strong>Note:</strong> Google will warn{" "}
                <em>&quot;Google hasn&apos;t verified this app&quot;</em>. Click{" "}
                <strong>Advanced → Go to MailMinto (unsafe)</strong>. This is normal because
                you are the developer of your own Cloud project.
              </div>
              <a
                href="/api/gmail/connect"
                className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2 text-sm font-medium hover:opacity-90"
              >
                <Mail className="h-4 w-4" />
                Connect Gmail
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">Complete Step 1 first.</p>
          )}
        </SetupCard>

        {/* Step 3: Telegram */}
        <SetupCard
          number={3}
          title="Set up Telegram alerts (optional)"
          desc="Get pushed instantly when high-priority emails arrive."
          icon={<Send className="h-6 w-6" />}
          done={step3Done}
          locked={false}
          optional
        >
          <TelegramForm existing={telegramConfig ?? null} />
        </SetupCard>
      </div>

      {step1Done && step2Done && (
        <div className="mt-8 text-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-full bg-green-600 text-white px-6 py-3 font-medium hover:bg-green-700"
          >
            <CheckCircle2 className="h-5 w-5" />
            Setup complete — Go to dashboard
          </Link>
        </div>
      )}
    </div>
  );
}

function SetupCard({
  number,
  title,
  desc,
  icon,
  done,
  locked,
  optional,
  children,
}: {
  number: number;
  title: string;
  desc: string;
  icon: React.ReactNode;
  done: boolean;
  locked: boolean;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-2xl border bg-white dark:bg-zinc-900 ${
        done
          ? "border-green-300 dark:border-green-800"
          : locked
            ? "border-zinc-200 dark:border-zinc-800 opacity-60"
            : "border-zinc-300 dark:border-zinc-700"
      }`}
    >
      <div className="p-6 flex items-start gap-4">
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
            {done && (
              <span className="text-xs font-medium text-green-600 dark:text-green-400">
                ✓ Done
              </span>
            )}
          </div>
          <h3 className="mt-1 text-lg font-semibold">{title}</h3>
          <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">{desc}</p>
        </div>
      </div>
      {!locked && (
        <div className="px-6 pb-6 border-t border-zinc-100 dark:border-zinc-800 pt-5">
          {children}
        </div>
      )}
    </div>
  );
}
