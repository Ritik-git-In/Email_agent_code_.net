"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";

type Summary = {
  account: string;
  fetched: number;
  processed: number;
  skipped: number;
  errors: { gmail_msg_id: string; error: string }[];
};

type RunState =
  | { phase: "running" }
  | { phase: "done"; summaries: Summary[] }
  | { phase: "error"; message: string };

export function FirstRunProcessor({ connectedEmail }: { connectedEmail?: string }) {
  const router = useRouter();
  const fired = useRef(false);
  const [state, setState] = useState<RunState>({ phase: "running" });

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    (async () => {
      try {
        const res = await fetch("/api/process", { method: "POST" });
        const data = await res.json();
        if (data?.ok) {
          setState({ phase: "done", summaries: data.summaries });
          router.refresh();
        } else {
          setState({ phase: "error", message: data?.error ?? "Unknown error" });
        }
      } catch (err) {
        setState({
          phase: "error",
          message: err instanceof Error ? err.message : "Network error",
        });
      }
    })();
  }, [router]);

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
      <div className="flex items-center gap-3">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-semibold">
            {connectedEmail ? `${connectedEmail} connected!` : "Gmail connected!"}
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Processing your last unread emails — this takes ~30 seconds.
          </p>
        </div>
      </div>

      <div className="mt-5">
        {state.phase === "running" && (
          <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Classifying, labeling, and drafting replies...
          </div>
        )}

        {state.phase === "done" && (
          <div className="space-y-2">
            {state.summaries.map((s) => (
              <div
                key={s.account}
                className="flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-950 px-3 py-2 text-sm text-green-700 dark:text-green-400"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>
                  <strong>{s.account}</strong> — classified {s.processed}, labeled, drafts ready
                  {s.errors.length > 0 && `, errors ${s.errors.length}`}
                </span>
              </div>
            ))}
            <p className="text-sm text-zinc-500 mt-3">
              Check the <a href="/dashboard/inbox" className="underline">Inbox</a> or <a href="/dashboard/drafts" className="underline">Drafts</a> tab to see results.
            </p>
          </div>
        )}

        {state.phase === "error" && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-950 px-3 py-2 text-sm text-red-700 dark:text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {state.message}
          </div>
        )}
      </div>
    </div>
  );
}
