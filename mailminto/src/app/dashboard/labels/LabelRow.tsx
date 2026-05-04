"use client";

import { useState, useTransition } from "react";
import { Loader2, Pencil, Trash2, Check, X } from "lucide-react";
import { updateLabelAction, deleteLabelAction } from "./actions";
import { LABEL_COLOR_PALETTE, type LabelInfo } from "@/lib/gmail/labels";
import { ColorPicker, type ColorChoice } from "./ColorPicker";

export function LabelRow({
  label,
  accountId,
}: {
  label: LabelInfo;
  accountId: string;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(label.name);
  const initial: ColorChoice = label.color
    ? { bg: label.color.backgroundColor, text: label.color.textColor }
    : LABEL_COLOR_PALETTE[1];
  const [color, setColor] = useState<ColorChoice>(initial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSave() {
    setError(null);
    const fd = new FormData();
    fd.set("account_id", accountId);
    fd.set("label_id", label.id);
    fd.set("name", name);
    fd.set("bg", color.bg);
    fd.set("text", color.text);
    startTransition(async () => {
      const res = await updateLabelAction(fd);
      if (!res.ok) setError(res.error);
      else setEditing(false);
    });
  }

  function onDelete() {
    if (!confirm(`Delete label "${label.name}"? Emails will lose this label.`)) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteLabelAction(accountId, label.id);
      if (!res.ok) setError(res.error);
    });
  }

  if (editing) {
    return (
      <div className="px-5 py-4 bg-zinc-50 dark:bg-zinc-800/50 space-y-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
        />
        <ColorPicker value={color} onChange={setColor} />
        <span
          className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
          style={{ backgroundColor: color.bg, color: color.text }}
        >
          {name || "Preview"}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={onSave}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-3 py-1.5 text-xs font-medium hover:opacity-90 disabled:opacity-50"
          >
            {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
            Save
          </button>
          <button
            onClick={() => {
              setEditing(false);
              setColor(initial);
              setName(label.name);
            }}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-full border border-zinc-300 dark:border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="h-3 w-3" />
            Cancel
          </button>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="px-5 py-3 flex items-center gap-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
      <span
        className="inline-flex shrink-0 items-center rounded-full px-3 py-1 text-xs font-medium"
        style={{
          backgroundColor: label.color?.backgroundColor ?? "#cccccc",
          color: label.color?.textColor ?? "#000000",
        }}
      >
        {label.name}
      </span>
      <span className="text-xs text-zinc-500 shrink-0">
        {label.messagesTotal} {label.messagesTotal === 1 ? "email" : "emails"}
      </span>
      <div className="ml-auto flex items-center gap-1">
        <button
          onClick={() => setEditing(true)}
          disabled={pending}
          className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50"
          aria-label="Edit"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onDelete}
          disabled={pending}
          className="rounded-md p-1.5 text-zinc-500 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950 disabled:opacity-50"
          aria-label="Delete"
        >
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        </button>
      </div>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
