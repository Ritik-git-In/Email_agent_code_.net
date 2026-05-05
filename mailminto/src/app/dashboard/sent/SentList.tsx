"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { fetchSentPageAction } from "./actions";
import type { GmailMessageMeta } from "@/lib/gmail/client";

function formatDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const now = Date.now();
  const diff = now - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  if (days === 1) return "Yesterday";
  if (days < 7) return date.toLocaleDateString("en-US", { weekday: "short" });
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: days > 365 ? "numeric" : undefined,
  });
}

function recipientLabel(to: string): string {
  if (!to) return "(no recipient)";
  const match = to.match(/^([^<]+)<.+>$/);
  return match ? match[1].trim().replace(/^"|"$/g, "") : to;
}

type SerializedMessage = Omit<GmailMessageMeta, "date"> & { date: string };

export function SentList({
  accountId,
  initialMessages,
  initialNextPageToken,
  total,
}: {
  accountId: string;
  initialMessages: SerializedMessage[];
  initialNextPageToken: string | null;
  total: number;
}) {
  const [messages, setMessages] = useState<SerializedMessage[]>(initialMessages);
  const [pageToken, setPageToken] = useState<string | null>(initialNextPageToken);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  function loadMore() {
    if (!pageToken || pending) return;
    setError(null);
    startTransition(async () => {
      const res = await fetchSentPageAction(accountId, pageToken);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setMessages((prev) => [
        ...prev,
        ...res.messages.map((m) => ({ ...m, date: m.date.toISOString() })),
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
        Showing {messages.length} of {total.toLocaleString()} sent emails
      </div>

      {messages.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 p-12 text-center">
          <p className="text-zinc-500">
            No sent emails yet. Compose one to get started.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-200 dark:divide-zinc-800 overflow-hidden bg-white dark:bg-zinc-900">
          {messages.map((msg) => (
            <Link
              key={msg.id}
              href={`/dashboard/inbox/${msg.id}?account=${accountId}`}
              className="flex items-start gap-4 px-5 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-400 shrink-0">To:</span>
                  <span className="text-sm truncate text-zinc-700 dark:text-zinc-300">
                    {recipientLabel(msg.to)}
                  </span>
                </div>
                <div className="text-sm truncate font-medium">
                  {msg.subject || "(no subject)"}
                </div>
                {msg.snippet && (
                  <div className="text-xs text-zinc-500 truncate mt-0.5">{msg.snippet}</div>
                )}
              </div>
              <div className="text-xs text-zinc-400 shrink-0 whitespace-nowrap">
                {formatDate(msg.date)}
              </div>
            </Link>
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

      {!pageToken && messages.length > 0 && (
        <div className="mt-4 text-center text-xs text-zinc-500">
          End of sent · {messages.length} loaded
        </div>
      )}

      {error && (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400 text-center">{error}</p>
      )}
    </div>
  );
}
