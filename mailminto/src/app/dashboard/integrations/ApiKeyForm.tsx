"use client";

import { useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { saveApiKey, deleteApiKey } from "./actions";

type ApiKey = { provider: string; masked: string };

export function ApiKeyForm({ existing }: { existing: ApiKey[] }) {
  const [provider, setProvider] = useState("groq");
  const [key, setKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const fd = new FormData();
    fd.set("provider", provider);
    fd.set("key", key);
    startTransition(async () => {
      const res = await saveApiKey(fd);
      if (!res.ok) setError(res.error);
      else setKey("");
    });
  }

  function onDelete(p: string) {
    startTransition(async () => {
      const res = await deleteApiKey(p);
      if (!res.ok) setError(res.error);
    });
  }

  return (
    <div className="space-y-4">
      {existing.length > 0 && (
        <ul className="space-y-2">
          {existing.map((k) => (
            <li
              key={k.provider}
              className="flex items-center justify-between rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 px-4 py-2 text-sm"
            >
              <span>
                <span className="font-medium capitalize">{k.provider}</span>{" "}
                <span className="font-mono text-zinc-500">{k.masked}</span>
              </span>
              <button
                onClick={() => onDelete(k.provider)}
                disabled={pending}
                className="text-zinc-500 hover:text-red-500 disabled:opacity-50"
                aria-label="Remove key"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={onSave} className="grid grid-cols-[120px_1fr_auto] gap-2">
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
        >
          <option value="groq">Groq</option>
          <option value="openai">OpenAI</option>
          <option value="anthropic">Anthropic</option>
        </select>
        <input
          type="password"
          required
          placeholder="sk-... or gsk_..."
          value={key}
          onChange={(e) => setKey(e.target.value)}
          className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm font-mono"
        />
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          Save
        </button>
      </form>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
