"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";

type Summary = {
  account: string;
  fetched: number;
  processed: number;
  skipped: number;
  errors: { gmail_msg_id: string; error: string }[];
  details?: { gmail_msg_id: string; subject: string; category: string; actionTaken: string }[];
};

export function ProcessNowButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<
    | { ok: true; summaries: Summary[] }
    | { ok: false; error: string }
    | null
  >(null);

  function run() {
    setResult(null);
    startTransition(async () => {
      const res = await fetch("/api/process", { method: "POST" });
      const data = await res.json();
      setResult(data);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <button
        onClick={run}
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-5 py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50"
      >
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Process inbox now
          </>
        )}
      </button>

      {result?.ok === true && (
        <div className="space-y-2 text-sm">
          {result.summaries.map((s) => (
            <div key={s.account} className="space-y-1">
              <div
                className={`flex items-center gap-2 rounded-lg px-3 py-2 ${
                  s.errors.length > 0
                    ? "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400"
                    : "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400"
                }`}
              >
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>
                  <strong>{s.account}</strong> — fetched {s.fetched}, classified{" "}
                  {s.processed}, skipped {s.skipped}
                  {s.errors.length > 0 && `, errors ${s.errors.length}`}
                </span>
              </div>
              {s.errors.length > 0 && (
                <details className="ml-6 text-xs">
                  <summary className="cursor-pointer text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
                    Show {s.errors.length} error{s.errors.length === 1 ? "" : "s"}
                  </summary>
                  <ul className="mt-2 space-y-1 rounded-lg border border-zinc-200 dark:border-zinc-800 p-2 max-h-60 overflow-auto">
                    {s.errors.map((e, i) => (
                      <li key={i} className="font-mono text-zinc-600 dark:text-zinc-400 break-all">
                        <span className="text-zinc-400">{e.gmail_msg_id.slice(0, 8)}:</span>{" "}
                        {e.error}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
              {s.details && s.details.length > 0 && (
                <details className="ml-6 text-xs">
                  <summary className="cursor-pointer text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
                    Show {s.details.length} processed
                  </summary>
                  <ul className="mt-2 space-y-1 rounded-lg border border-zinc-200 dark:border-zinc-800 p-2 max-h-60 overflow-auto">
                    {s.details.map((d, i) => (
                      <li key={i} className="text-zinc-600 dark:text-zinc-400">
                        <span className="font-medium">[{d.category}]</span> {d.subject}
                        <span className="text-zinc-400"> — {d.actionTaken}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          ))}
        </div>
      )}
      {result?.ok === false && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-950 px-3 py-2 text-sm text-red-700 dark:text-red-400">
          <AlertCircle className="h-4 w-4" />
          {result.error}
        </div>
      )}
    </div>
  );
}
