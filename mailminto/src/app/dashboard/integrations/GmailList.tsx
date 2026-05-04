"use client";

import { useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { disconnectGmail } from "./actions";

type Account = { id: string; email: string };

export function GmailList({ accounts }: { accounts: Account[] }) {
  const [pending, startTransition] = useTransition();

  function onDisconnect(id: string) {
    startTransition(async () => {
      await disconnectGmail(id);
    });
  }

  return (
    <ul className="space-y-2">
      {accounts.map((a) => (
        <li
          key={a.id}
          className="flex items-center justify-between rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 px-4 py-2 text-sm"
        >
          <span className="font-mono">{a.email}</span>
          <button
            onClick={() => onDisconnect(a.id)}
            disabled={pending}
            className="text-zinc-500 hover:text-red-500 disabled:opacity-50"
            aria-label="Disconnect"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}
