"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Loader2, Sparkles } from "lucide-react";
import { fetchInboxPageAction } from "./actions";
import type { GmailMessageMeta } from "@/lib/gmail/client";

const PAGE_SIZE = 50;

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
  // pageStartTokens[i] is the pageToken used to fetch page index i.
  // Page 0 (first page) starts with no token (null).
  const [pageStartTokens, setPageStartTokens] = useState<(string | null)[]>([null]);
  const [currentPage, setCurrentPage] = useState(0);
  const [nextPageToken, setNextPageToken] = useState<string | null>(initialNextPageToken);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const startIndex = currentPage * PAGE_SIZE + 1;
  const endIndex = currentPage * PAGE_SIZE + messages.length;

  function gotoNext() {
    if (!nextPageToken || pending) return;
    setError(null);
    startTransition(async () => {
      const res = await fetchInboxPageAction(accountId, nextPageToken);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      const newPageIndex = currentPage + 1;
      setPageStartTokens((prev) => {
        if (newPageIndex < prev.length) return prev;
        return [...prev, nextPageToken];
      });
      setCurrentPage(newPageIndex);
      setMessages(res.messages.map((m) => ({ ...m, date: m.date.toISOString() })));
      setNextPageToken(res.nextPageToken);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  function gotoPrev() {
    if (currentPage === 0 || pending) return;
    setError(null);
    const prevIndex = currentPage - 1;
    const prevToken = pageStartTokens[prevIndex];
    startTransition(async () => {
      const res = await fetchInboxPageAction(accountId, prevToken);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setCurrentPage(prevIndex);
      setMessages(res.messages.map((m) => ({ ...m, date: m.date.toISOString() })));
      setNextPageToken(res.nextPageToken);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  return (
    <div>
      {/* Pagination header — Gmail style */}
      <div className="flex items-center justify-end gap-3 mb-3 text-sm text-zinc-500">
        <span>
          {messages.length === 0
            ? "0"
            : `${startIndex.toLocaleString()}–${endIndex.toLocaleString()}`}{" "}
          of {total.toLocaleString()}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={gotoPrev}
            disabled={currentPage === 0 || pending}
            className="p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Previous page"
          >
            {pending && currentPage > 0 ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
          <button
            onClick={gotoNext}
            disabled={!nextPageToken || pending}
            className="p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Next page"
          >
            {pending && nextPageToken ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        </div>
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
              <Link
                key={msg.id}
                href={`/dashboard/inbox/${msg.id}?account=${accountId}`}
                className={`flex items-start gap-4 px-5 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer ${
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
              </Link>
            );
          })}
        </div>
      )}

      {error && (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400 text-center">{error}</p>
      )}
    </div>
  );
}
