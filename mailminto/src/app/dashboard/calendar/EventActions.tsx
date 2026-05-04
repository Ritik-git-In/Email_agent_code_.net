"use client";

import { useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { deleteEventAction } from "./actions";

export function DeleteEventButton({
  accountId,
  eventId,
}: {
  accountId: string;
  eventId: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onDelete() {
    if (!confirm("Delete this calendar event?")) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteEventAction(accountId, eventId);
      if (!res.ok) setError(res.error);
    });
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onDelete}
        disabled={pending}
        className="rounded-md p-1.5 text-zinc-500 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950 disabled:opacity-50"
        aria-label="Delete event"
      >
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
