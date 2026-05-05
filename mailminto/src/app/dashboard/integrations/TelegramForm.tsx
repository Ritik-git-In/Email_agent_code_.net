"use client";

import { useState, useTransition } from "react";
import { Loader2, Trash2, ExternalLink, CheckCircle2 } from "lucide-react";
import { saveTelegramConfig, deleteTelegramConfig } from "./actions";

export function TelegramForm({ existing }: { existing: { chat_id: string } | null }) {
  const [botToken, setBotToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const fd = new FormData();
    fd.set("bot_token", botToken);
    fd.set("chat_id", chatId);
    startTransition(async () => {
      const res = await saveTelegramConfig(fd);
      if (!res.ok) setError(res.error);
      else {
        setBotToken("");
        setChatId("");
      }
    });
  }

  function onDelete() {
    setError(null);
    startTransition(async () => {
      const res = await deleteTelegramConfig();
      if (!res.ok) setError(res.error);
    });
  }

  if (existing) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between rounded-lg border border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-950/30 px-4 py-2 text-sm">
          <span className="flex items-center gap-2 text-green-700 dark:text-green-400 font-medium">
            <CheckCircle2 className="h-4 w-4" />
            Connected — chat <span className="font-mono text-xs">{existing.chat_id}</span>
          </span>
          <button
            onClick={onDelete}
            disabled={pending}
            className="text-zinc-500 hover:text-red-500 disabled:opacity-50"
            aria-label="Disconnect Telegram"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <ol className="space-y-3 text-sm">
        <Step number={1}>
          Open{" "}
          <a
            href="https://t.me/BotFather"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 underline font-medium text-blue-600 dark:text-blue-400"
          >
            @BotFather <ExternalLink className="h-3 w-3" />
          </a>{" "}
          on Telegram and send <code className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded">/newbot</code>.
        </Step>
        <Step number={2}>
          Pick a name (e.g., <code className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded">My Inbox Alerts</code>) and a username ending in <code className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded">_bot</code>.
        </Step>
        <Step number={3}>
          BotFather will reply with your <strong>Bot Token</strong> (looks like <code className="px-1 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-xs">123456:ABC-...</code>). Copy it.
        </Step>
        <Step number={4}>
          On Telegram, search and start{" "}
          <a
            href="https://t.me/userinfobot"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 underline font-medium text-blue-600 dark:text-blue-400"
          >
            @userinfobot <ExternalLink className="h-3 w-3" />
          </a>{" "}
          — it will reply with your <strong>Chat ID</strong> (a number).
        </Step>
        <Step number={5}>
          Open your new bot (search the username from step 2) and click <strong>Start</strong> so it can message you.
        </Step>
      </ol>

      <form onSubmit={onSave} className="space-y-3 pt-2 border-t border-zinc-200 dark:border-zinc-800">
        <div>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
            Bot Token
          </label>
          <input
            type="password"
            required
            placeholder="123456:ABC-DEF..."
            value={botToken}
            onChange={(e) => setBotToken(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm font-mono"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
            Chat ID
          </label>
          <input
            type="text"
            required
            placeholder="123456789"
            value={chatId}
            onChange={(e) => setChatId(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm font-mono"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          Save Telegram
        </button>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </form>
    </div>
  );
}

function Step({ number, children }: { number: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="shrink-0 inline-flex h-6 w-6 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-800 text-xs font-mono">
        {number}
      </span>
      <div className="flex-1 leading-relaxed text-zinc-700 dark:text-zinc-300">
        {children}
      </div>
    </li>
  );
}
