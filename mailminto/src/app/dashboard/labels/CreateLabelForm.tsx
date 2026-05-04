"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus } from "lucide-react";
import { createLabelAction } from "./actions";
import { LABEL_COLOR_PALETTE } from "@/lib/gmail/labels";
import { ColorPicker, type ColorChoice } from "./ColorPicker";

export function CreateLabelForm({
  accounts,
}: {
  accounts: { id: string; email: string }[];
}) {
  const [name, setName] = useState("");
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [color, setColor] = useState<ColorChoice>(LABEL_COLOR_PALETTE[7]);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const fd = new FormData();
    fd.set("account_id", accountId);
    fd.set("name", name);
    fd.set("bg", color.bg);
    fd.set("text", color.text);
    startTransition(async () => {
      const res = await createLabelAction(fd);
      if (!res.ok) setError(res.error);
      else {
        setName("");
        setOpen(false);
      }
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2 text-sm font-medium hover:opacity-90"
      >
        <Plus className="h-4 w-4" />
        New label
      </button>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-4 w-full max-w-md"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">New label</h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          Cancel
        </button>
      </div>

      {accounts.length > 1 && (
        <div>
          <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Gmail account
          </label>
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.email}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
          Label name
        </label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Newsletter or Work/Clients"
          className="mt-1 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
        />
        <p className="mt-1 text-xs text-zinc-500">
          Use <code>Parent/Child</code> for nested labels.
        </p>
      </div>

      <div>
        <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
          Color
        </label>
        <div className="mt-2">
          <ColorPicker value={color} onChange={setColor} />
        </div>
      </div>

      {name && (
        <div>
          <span
            className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
            style={{ backgroundColor: color.bg, color: color.text }}
          >
            {name}
          </span>
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        Create label
      </button>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </form>
  );
}
