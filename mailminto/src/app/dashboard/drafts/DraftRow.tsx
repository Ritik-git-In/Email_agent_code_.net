"use client";

import { useState, useTransition } from "react";
import { FileText, Loader2, Sparkles } from "lucide-react";
import { DraftActions } from "./DraftActions";
import { fetchDraftBodyAction } from "./actions";

const CATEGORY_LABELS: Record<string, { name: string; tone: string }> = {
  high_priority: { name: "High Priority", tone: "bg-red-500/10 text-red-600 dark:text-red-400" },
  customer_support: { name: "Customer Support", tone: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
};

function formatDate(d: Date): string {
  const now = Date.now();
  const diff = now - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  if (days === 1) return "Yesterday";
  if (days < 7) return d.toLocaleDateString("en-US", { weekday: "short" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function DraftRow({
  accountId,
  draft,
  category,
}: {
  accountId: string;
  draft: {
    id: string;
    subject: string;
    to: string;
    snippet: string;
    date: string | Date;
  };
  category: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const cat = category ? CATEGORY_LABELS[category] : null;
  const isMailMinto = !!category;
  const date = typeof draft.date === "string" ? new Date(draft.date) : draft.date;

  function toggle() {
    if (!open && body === null) {
      setError(null);
      startTransition(async () => {
        const res = await fetchDraftBodyAction(accountId, draft.id);
        if (!res.ok) setError(res.error);
        else setBody(res.body);
      });
    }
    setOpen((o) => !o);
  }

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
      <button
        onClick={toggle}
        className="w-full flex items-start gap-3 px-5 py-3.5 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
      >
        <FileText className="h-4 w-4 mt-0.5 shrink-0 text-zinc-400" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium truncate">{draft.subject || "(no subject)"}</span>
            {isMailMinto && (
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 px-2 py-0.5 text-[10px] font-medium">
                <Sparkles className="h-3 w-3" />
                MailMinto
              </span>
            )}
            {cat && (
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${cat.tone}`}>
                {cat.name}
              </span>
            )}
          </div>
          <div className="mt-0.5 text-xs text-zinc-500 truncate">
            To: {draft.to || "(no recipient)"}
          </div>
          {!open && draft.snippet && (
            <div className="mt-1 text-xs text-zinc-500 truncate">{draft.snippet}</div>
          )}
        </div>
        <div className="text-xs text-zinc-400 shrink-0">{formatDate(date)}</div>
      </button>

      {open && (
        <div className="border-t border-zinc-200 dark:border-zinc-800 px-5 py-4 space-y-3">
          {pending && (
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          )}
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
          {body !== null && !pending && (
            <pre className="whitespace-pre-wrap font-sans text-sm text-zinc-700 dark:text-zinc-300">
              {body || "(empty draft)"}
            </pre>
          )}
          <DraftActions accountId={accountId} draftId={draft.id} />
        </div>
      )}
    </div>
  );
}
