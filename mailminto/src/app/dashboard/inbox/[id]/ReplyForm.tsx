"use client";

import { useState, useTransition, useRef } from "react";
import { Loader2, Send, CheckCircle2 } from "lucide-react";
import { sendReplyAction } from "../actions";
import {
  RichBodyComposer,
  type RichBodyHandle,
} from "@/components/RichBodyComposer";

export function ReplyForm({
  accountId,
  messageId,
  threadId,
  to,
  subject,
}: {
  accountId: string;
  messageId: string;
  threadId: string;
  to: string;
  subject: string;
}) {
  const composerRef = useRef<RichBodyHandle>(null);
  const [bodyEmpty, setBodyEmpty] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const composer = composerRef.current;
    if (!composer) return;
    const html = composer.getHtml();
    const text = composer.getText().trim();
    if (!text) {
      setError("Reply body is empty");
      return;
    }
    startTransition(async () => {
      const res = await sendReplyAction({
        accountId,
        messageId,
        threadId,
        to,
        subject,
        body: html,
        attachments: composer.getAttachments(),
      });
      if (!res.ok) setError(res.error);
      else {
        setSuccess(true);
        composer.clear();
      }
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden"
    >
      <div className="px-4 py-2 text-xs text-zinc-500 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
        Replying to <span className="font-mono text-zinc-700 dark:text-zinc-300">{to}</span>
      </div>

      <RichBodyComposer
        ref={composerRef}
        placeholder="Write your reply..."
        onEmptyChange={setBodyEmpty}
        sendButton={
          <button
            type="submit"
            disabled={pending || bodyEmpty}
            className="inline-flex items-center gap-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 text-sm font-medium disabled:opacity-50"
          >
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Send reply
              </>
            )}
          </button>
        }
        statusSlot={
          <>
            {success && (
              <span className="inline-flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                Reply sent
              </span>
            )}
            {error && <span className="text-sm text-red-600 dark:text-red-400">{error}</span>}
          </>
        }
      />
    </form>
  );
}
