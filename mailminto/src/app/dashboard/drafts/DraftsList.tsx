"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { fetchDraftsPageAction } from "./actions";
import { DraftRow } from "./DraftRow";
import type { DraftSummary } from "@/lib/gmail/drafts";

type SerializedDraft = Omit<DraftSummary, "date"> & { date: string };

export function DraftsList({
  accountId,
  initialDrafts,
  initialNextPageToken,
  total,
  classifiedMap,
}: {
  accountId: string;
  initialDrafts: SerializedDraft[];
  initialNextPageToken: string | null;
  total: number;
  classifiedMap: Record<string, string>;
}) {
  const [drafts, setDrafts] = useState<SerializedDraft[]>(initialDrafts);
  const [pageToken, setPageToken] = useState<string | null>(initialNextPageToken);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  function loadMore() {
    if (!pageToken || pending) return;
    setError(null);
    startTransition(async () => {
      const res = await fetchDraftsPageAction(accountId, pageToken);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setDrafts((prev) => [
        ...prev,
        ...res.drafts.map((d) => ({ ...d, date: d.date.toISOString() })),
      ]);
      setPageToken(res.nextPageToken);
    });
  }

  useEffect(() => {
    if (!sentinelRef.current || !pageToken) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "200px" },
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageToken, pending]);

  return (
    <div>
      <div className="text-sm text-zinc-500 mb-3">
        Showing {drafts.length} of {total.toLocaleString()} drafts
      </div>

      {drafts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 p-12 text-center">
          <p className="text-zinc-500">No drafts in this account.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {drafts.map((draft) => (
            <DraftRow
              key={draft.id}
              accountId={accountId}
              draft={draft}
              category={classifiedMap[draft.id] ?? null}
            />
          ))}
        </div>
      )}

      <div ref={sentinelRef} className="h-1" />

      {pageToken && (
        <div className="mt-4 flex items-center justify-center">
          <button
            onClick={loadMore}
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50"
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            {pending ? "Loading…" : "Load more"}
          </button>
        </div>
      )}

      {!pageToken && drafts.length > 0 && (
        <div className="mt-4 text-center text-xs text-zinc-500">
          End of drafts · {drafts.length} loaded
        </div>
      )}

      {error && (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400 text-center">{error}</p>
      )}
    </div>
  );
}
