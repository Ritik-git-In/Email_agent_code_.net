"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { fetchInboxPageAction } from "./actions";
import type { GmailMessageMeta } from "@/lib/gmail/client";

const CATEGORY_LABELS: Record<string, { name: string; tone: string }> = {
  high_priority: { name: "High Priority", tone: "bg-red-500/10 text-red-600 dark:text-red-400" },
  finance: { name: "Finance", tone: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  customer_support: { name: "Customer Support", tone: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  promotion: { name: "Promotion", tone: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
  internal: { name: "Internal", tone: "bg-green-500/10 text-green-600 dark:text-green-400" },
};

function formatDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const now = Date.now();
  const diff = now - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  if (days === 1) return "Yesterday";
  if (days < 7) return date.toLocaleDateString("en-US", { weekday: "short" });
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: days > 365 ? "numeric" : undefined });
}

function senderName(from: string): string {
  const match = from.match(/^([^<]+)<.+>$/);
  return match ? match[1].trim().replace(/^"|"$/g, "") : from;
}

type SerializedMessage = Omit<GmailMessageMeta, "date"> & { date: string };

export function InboxList({
  accountId,
  initialMessages,
  initialNextPageToken,
  total,
  classifiedMap,
}: {
  accountId: string;
  initialMessages: SerializedMessage[];
  initialNextPageToken: string | null;
  total: number;
  classifiedMap: Record<string, string>;
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
      const res = await fetchInboxPageAction(accountId, pageToken);
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

  // Auto-load on scroll near bottom
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
        Showing {messages.length} of {total.toLocaleString()} emails
      </div>

      {messages.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 p-12 text-center">
          <p className="text-zinc-500">No emails in inbox.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-200 dark:divide-zinc-800 overflow-hidden bg-white dark:bg-zinc-900">
          {messages.map((msg) => {
            const category = classifiedMap[msg.id];
            const cat = category ? CATEGORY_LABELS[category] : null;
            return (
              <div
                key={msg.id}
                className={`flex items-start gap-4 px-5 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors ${
                  msg.isUnread ? "bg-blue-50/40 dark:bg-blue-950/20" : ""
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-sm truncate ${
                        msg.isUnread ? "font-semibold text-zinc-900 dark:text-zinc-50" : "text-zinc-700 dark:text-zinc-300"
                      }`}
                    >
                      {senderName(msg.from)}
                    </span>
                    {category && (
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
                  <div className={`text-sm truncate ${msg.isUnread ? "font-medium" : ""}`}>
                    {msg.subject || "(no subject)"}
                  </div>
                  {msg.snippet && (
                    <div className="text-xs text-zinc-500 truncate mt-0.5">{msg.snippet}</div>
                  )}
                </div>
                <div className="text-xs text-zinc-400 shrink-0 whitespace-nowrap">
                  {formatDate(msg.date)}
                </div>
              </div>
            );
          })}
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
          End of inbox · {messages.length} loaded
        </div>
      )}

      {error && (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400 text-center">{error}</p>
      )}
    </div>
  );
}
