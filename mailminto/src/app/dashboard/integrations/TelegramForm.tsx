"use client";

import { useState, useTransition } from "react";
import { Loader2, Trash2, Send } from "lucide-react";
import { deleteTelegramConfig } from "./actions";

export function TelegramForm({ existing }: { existing: { chat_id: string } | null }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onDelete() {
    setError(null);
    startTransition(async () => {
      const res = await deleteTelegramConfig();
      if (!res.ok) setError(res.error);
    });
  }

  if (existing) {
    return (
      <div className="space-y-3">
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
    <div className="space-y-2">
      <a
        href="/api/telegram/link"
        className="inline-flex items-center gap-2 rounded-lg bg-[#229ED9] text-white px-4 py-2 text-sm font-medium hover:opacity-90"
      >
        <Send className="h-4 w-4" />
        Connect Telegram
      </a>
      <p className="text-xs text-zinc-500">
        We&apos;ll open Telegram and link your account in one tap. No bot setup needed.
      </p>
    </div>
  );
}
