"use client";

import { useState, useTransition } from "react";
import { Loader2, Send, Trash2 } from "lucide-react";
import { sendDraftAction, deleteDraftAction } from "./actions";

export function DraftActions({
  accountId,
  draftId,
}: {
  accountId: string;
  draftId: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSend() {
    if (!confirm("Send this draft email?")) return;
    setError(null);
    startTransition(async () => {
      const res = await sendDraftAction(accountId, draftId);
      if (!res.ok) setError(res.error);
    });
  }

  function onDelete() {
    if (!confirm("Delete this draft? This cannot be undone.")) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteDraftAction(accountId, draftId);
      if (!res.ok) setError(res.error);
    });
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onSend}
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-3 py-1.5 text-xs font-medium hover:opacity-90 disabled:opacity-50"
      >
        {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
        Send
      </button>
      <button
        onClick={onDelete}
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-full border border-zinc-300 dark:border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50"
      >
        <Trash2 className="h-3 w-3" />
        Delete
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
