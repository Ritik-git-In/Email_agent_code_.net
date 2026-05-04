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
        <div className="space-y-1 text-sm">
          {result.summaries.map((s) => (
            <div
              key={s.account}
              className="flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-950 px-3 py-2 text-green-700 dark:text-green-400"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>
                <strong>{s.account}</strong> — fetched {s.fetched}, classified{" "}
                {s.processed}, skipped {s.skipped}
                {s.errors.length > 0 && `, errors ${s.errors.length}`}
              </span>
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
