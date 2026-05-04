"use client";

import { useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
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
    startTransition(async () => {
      const res = await deleteTelegramConfig();
      if (!res.ok) setError(res.error);
    });
  }

  if (existing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 px-4 py-2 text-sm">
          <span>
            Connected — chat <span className="font-mono text-zinc-500">{existing.chat_id}</span>
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
    <form onSubmit={onSave} className="space-y-3">
      <input
        type="password"
        required
        placeholder="Bot token (from @BotFather)"
        value={botToken}
        onChange={(e) => setBotToken(e.target.value)}
        className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm font-mono"
      />
      <input
        type="text"
        required
        placeholder="Chat ID (from @userinfobot)"
        value={chatId}
        onChange={(e) => setChatId(e.target.value)}
        className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm font-mono"
      />
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
  );
}
