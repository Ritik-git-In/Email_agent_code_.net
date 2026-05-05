"use client";

import { useState, useTransition } from "react";
import { Loader2, Pencil, Trash2, ChevronDown } from "lucide-react";
import { deleteCategory, updateCategory } from "./actions";
import { CategoryForm } from "./CategoryForm";

type Category = {
  id: string;
  slug: string;
  name: string;
  description: string;
  color_bg: string;
  color_text: string;
  is_default: boolean;
  enabled: boolean;
  generate_draft: boolean;
  notify_telegram: boolean;
  draft_prompt: string | null;
};

export function CategoryRow({ category }: { category: Category }) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onToggleEnabled() {
    setError(null);
    const fd = new FormData();
    fd.set("id", category.id);
    fd.set("name", category.name);
    fd.set("description", category.description);
    fd.set("color_bg", category.color_bg);
    fd.set("color_text", category.color_text);
    fd.set("enabled", category.enabled ? "off" : "on");
    if (category.generate_draft) fd.set("generate_draft", "on");
    if (category.notify_telegram) fd.set("notify_telegram", "on");
    if (category.draft_prompt) fd.set("draft_prompt", category.draft_prompt);
    startTransition(async () => {
      const res = await updateCategory(fd);
      if (!res.ok) setError(res.error);
    });
  }

  function onDelete() {
    setError(null);
    startTransition(async () => {
      const res = await deleteCategory(category.id);
      if (!res.ok) setError(res.error);
      else setConfirmDelete(false);
    });
  }

  return (
    <div
      className={`rounded-2xl border bg-white dark:bg-zinc-900 ${
        category.enabled
          ? "border-zinc-200 dark:border-zinc-800"
          : "border-zinc-200 dark:border-zinc-800 opacity-60"
      }`}
    >
      <div className="p-5">
        <div className="flex items-start gap-4">
          <span
            className="shrink-0 inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
            style={{ backgroundColor: category.color_bg, color: category.color_text }}
          >
            {category.name}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
              {category.is_default && (
                <span className="rounded bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5">default</span>
              )}
              {!category.enabled && (
                <span className="rounded bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 px-1.5 py-0.5">
                  disabled
                </span>
              )}
              <span className="font-mono">{category.slug}</span>
            </div>
            <p className="mt-1.5 text-sm text-zinc-700 dark:text-zinc-300 line-clamp-2">
              {category.description}
            </p>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-500">
              <span>📌 Label</span>
              {category.generate_draft && <span>📝 Draft reply</span>}
              {category.notify_telegram && <span>📱 Telegram alert</span>}
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-1">
            <button
              onClick={onToggleEnabled}
              disabled={pending}
              className="text-xs px-2 py-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50"
              title={category.enabled ? "Disable" : "Enable"}
            >
              {pending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : category.enabled ? (
                "Disable"
              ) : (
                "Enable"
              )}
            </button>
            <button
              onClick={() => setEditing((v) => !v)}
              className="p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
              title={editing ? "Close editor" : "Edit"}
            >
              {editing ? <ChevronDown className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
            </button>
            {!category.is_default && (
              <button
                onClick={() => setConfirmDelete(true)}
                className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950 text-zinc-500 hover:text-red-600"
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>

      {confirmDelete && (
        <div className="border-t border-zinc-200 dark:border-zinc-800 p-4 bg-red-50 dark:bg-red-950/30 flex items-center justify-between">
          <span className="text-sm text-red-700 dark:text-red-300">
            Delete <strong>{category.name}</strong>? Gmail labels are kept; only the routing rule is removed.
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-sm px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-white dark:hover:bg-zinc-900"
            >
              Cancel
            </button>
            <button
              onClick={onDelete}
              disabled={pending}
              className="text-sm px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
            >
              {pending && <Loader2 className="inline h-3.5 w-3.5 animate-spin mr-1" />}
              Delete
            </button>
          </div>
        </div>
      )}

      {editing && (
        <div className="border-t border-zinc-200 dark:border-zinc-800 p-5">
          <CategoryForm
            mode="edit"
            initial={category}
            onDone={() => setEditing(false)}
          />
        </div>
      )}
    </div>
  );
}
