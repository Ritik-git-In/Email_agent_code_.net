import Link from "next/link";
import { Mail, Plug, Send, CheckCircle2, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/user";
import { decrypt, maskKey } from "@/lib/crypto";
import { ApiKeyForm } from "./ApiKeyForm";
import { TelegramForm } from "./TelegramForm";
import { GmailList } from "./GmailList";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage(props: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const searchParams = await props.searchParams;
  const user = await getCurrentUser();
  const supabase = await createClient();
  if (!user) return null;

  const [{ data: gmailAccounts }, { data: apiKeys }, { data: telegramConfig }] =
    await Promise.all([
      supabase.from("gmail_accounts").select("id, email").eq("user_id", user.id),
      supabase.from("api_keys").select("provider, key_encrypted").eq("user_id", user.id),
      supabase
        .from("telegram_configs")
        .select("chat_id")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

  const maskedKeys =
    apiKeys?.map((k) => {
      try {
        return { provider: k.provider, masked: maskKey(decrypt(k.key_encrypted)) };
      } catch {
        return { provider: k.provider, masked: "••••" };
      }
    }) ?? [];

  return (
    <div className="px-8 py-10 max-w-4xl">
      <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Connect your accounts. Tokens are encrypted at rest with AES-256-GCM.
      </p>

      {searchParams.connected && (
        <div className="mt-6 flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-950 px-4 py-3 text-sm text-green-700 dark:text-green-400">
          <CheckCircle2 className="h-4 w-4" />
          Connected <strong>{searchParams.connected}</strong>
        </div>
      )}
      {searchParams.error && (
        <div className="mt-6 flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-950 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          <AlertCircle className="h-4 w-4" />
          {searchParams.error.replaceAll("_", " ")}
        </div>
      )}

      <div className="mt-8 space-y-4">
        <Card
          icon={<Mail className="h-5 w-5" />}
          title="Gmail"
          desc="Authorize MailMinto to read, label, and draft replies in your inbox."
          right={
            <Link
              href="/api/gmail/connect"
              className="inline-flex items-center rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-1.5 text-sm font-medium hover:opacity-90"
            >
              + Connect Gmail
            </Link>
          }
        >
          {gmailAccounts && gmailAccounts.length > 0 ? (
            <GmailList accounts={gmailAccounts} />
          ) : (
            <p className="text-sm text-zinc-500">No Gmail account connected yet.</p>
          )}
        </Card>

        <Card
          icon={<Plug className="h-5 w-5" />}
          title="LLM API key"
          desc="Bring your own OpenAI or Groq key. Used for classification and reply drafting."
        >
          <ApiKeyForm existing={maskedKeys} />
        </Card>

        <Card
          icon={<Send className="h-5 w-5" />}
          title="Telegram"
          desc="Get instant alerts when high-priority emails arrive."
        >
          <TelegramForm existing={telegramConfig ?? null} />
        </Card>
      </div>
    </div>
  );
}

function Card({
  icon,
  title,
  desc,
  right,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
            {icon}
          </div>
          <div>
            <h3 className="font-semibold">{title}</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{desc}</p>
          </div>
        </div>
        {right}
      </div>
      <div className="mt-5">{children}</div>
    </div>
  );
}
