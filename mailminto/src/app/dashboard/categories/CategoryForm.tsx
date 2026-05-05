"use client";

import { useState, useTransition } from "react";
import {
  Loader2,
  Sparkles,
  CheckCircle2,
  XCircle,
  ChevronRight,
} from "lucide-react";
import { LABEL_COLOR_PALETTE } from "@/lib/gmail/labels";
import {
  createCategory,
  updateCategory,
  testClassificationAction,
  type TestSampleResult,
} from "./actions";

type Initial = {
  id?: string;
  slug?: string;
  name: string;
  description: string;
  color_bg: string;
  color_text: string;
  generate_draft: boolean;
  notify_telegram: boolean;
  draft_prompt: string | null;
};

const EMPTY_INITIAL: Initial = {
  name: "",
  description: "",
  color_bg: "#a479e2",
  color_text: "#ffffff",
  generate_draft: false,
  notify_telegram: false,
  draft_prompt: null,
};

export function CategoryForm({
  mode,
  initial,
  onDone,
}: {
  mode: "create" | "edit";
  initial?: Initial;
  onDone?: () => void;
}) {
  const init = initial ?? EMPTY_INITIAL;
  const [name, setName] = useState(init.name);
  const [description, setDescription] = useState(init.description);
  const [colorBg, setColorBg] = useState(init.color_bg);
  const [colorText, setColorText] = useState(init.color_text);
  const [generateDraft, setGenerateDraft] = useState(init.generate_draft);
  const [notifyTelegram, setNotifyTelegram] = useState(init.notify_telegram);
  const [draftPrompt, setDraftPrompt] = useState(init.draft_prompt ?? "");
  const [showDraftPrompt, setShowDraftPrompt] = useState(Boolean(init.draft_prompt));

  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [testing, startTest] = useTransition();
  const [testResult, setTestResult] = useState<
    | { ok: true; samples: TestSampleResult[] }
    | { ok: false; error: string }
    | null
  >(null);

  function pickColor(bg: string, text: string) {
    setColorBg(bg);
    setColorText(text);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const fd = new FormData();
    if (mode === "edit" && initial?.id) fd.set("id", initial.id);
    fd.set("name", name);
    fd.set("description", description);
    fd.set("color_bg", colorBg);
    fd.set("color_text", colorText);
    if (generateDraft) fd.set("generate_draft", "on");
    if (notifyTelegram) fd.set("notify_telegram", "on");
    if (showDraftPrompt && draftPrompt.trim()) fd.set("draft_prompt", draftPrompt);
    if (mode === "edit") fd.set("enabled", "on");

    startTransition(async () => {
      const res = mode === "create" ? await createCategory(fd) : await updateCategory(fd);
      if (!res.ok) setError(res.error);
      else {
        if (mode === "create") {
          setName("");
          setDescription("");
        }
        onDone?.();
      }
    });
  }

  function onTest() {
    setTestResult(null);
    startTest(async () => {
      const res = await testClassificationAction({
        name,
        slug: initial?.slug,
        description,
      });
      setTestResult(res);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {/* Name + Color */}
      <div className="grid gap-4 md:grid-cols-[1fr_auto]">
        <div>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
            Category name
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Family"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={50}
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
            Preview
          </label>
          <span
            className="inline-flex h-9 items-center rounded-full px-3 text-xs font-medium"
            style={{ backgroundColor: colorBg, color: colorText }}
          >
            {name || "Preview"}
          </span>
        </div>
      </div>

      {/* Color picker */}
      <div>
        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-2">
          Label color (Gmail palette)
        </label>
        <div className="flex flex-wrap gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 p-2">
          {LABEL_COLOR_PALETTE.map((c) => (
            <button
              type="button"
              key={c.bg}
              onClick={() => pickColor(c.bg, c.text)}
              className={`h-6 w-6 rounded-full border transition-transform hover:scale-110 ${
                colorBg === c.bg
                  ? "ring-2 ring-offset-2 ring-zinc-900 dark:ring-white dark:ring-offset-zinc-900"
                  : "border-zinc-200 dark:border-zinc-700"
              }`}
              style={{ backgroundColor: c.bg }}
              title={c.bg}
              aria-label={`Color ${c.bg}`}
            />
          ))}
        </div>
      </div>

      {/* Description / Prompt */}
      <div>
        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
          Classification prompt — what kind of emails go here?
        </label>
        <textarea
          required
          minLength={10}
          maxLength={1000}
          rows={5}
          placeholder='Describe specifically. Example: "Emails from family members like mom, dad, wife, kids about family events, gatherings, household finances, school updates, or utility bills."'
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm leading-relaxed"
        />
        <div className="mt-1 flex justify-between text-xs text-zinc-500">
          <span>The AI uses this to decide which emails match. Be specific.</span>
          <span>{description.length}/1000</span>
        </div>
      </div>

      {/* Actions */}
      <div>
        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-2">
          When an email matches, MailMinto will:
        </label>
        <div className="space-y-2">
          <label className="flex items-start gap-2 text-sm cursor-not-allowed opacity-60">
            <input type="checkbox" checked disabled className="mt-0.5" />
            <span>
              <strong>Apply this label</strong> to the email{" "}
              <span className="text-zinc-500">(always on)</span>
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={generateDraft}
              onChange={(e) => setGenerateDraft(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              <strong>Generate AI reply draft</strong> in Gmail Drafts
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={notifyTelegram}
              onChange={(e) => setNotifyTelegram(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              <strong>Send instant Telegram alert</strong> (requires Telegram setup)
            </span>
          </label>
        </div>
      </div>

      {/* Optional draft prompt customization */}
      {generateDraft && (
        <div>
          <button
            type="button"
            onClick={() => setShowDraftPrompt((v) => !v)}
            className="text-xs text-blue-600 dark:text-blue-400 underline"
          >
            {showDraftPrompt ? "Use default draft style" : "+ Customize draft style"}
          </button>
          {showDraftPrompt && (
            <textarea
              rows={3}
              placeholder="e.g. Reply in a warm, friendly tone. Keep it under 5 sentences. Sign off as 'Mack'."
              value={draftPrompt}
              onChange={(e) => setDraftPrompt(e.target.value)}
              className="mt-2 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
            />
          )}
        </div>
      )}

      {/* Test classification */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-medium text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Test on your recent emails
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              We&apos;ll classify your last 5 unread emails to verify your prompt works as expected.
            </p>
          </div>
          <button
            type="button"
            onClick={onTest}
            disabled={testing || description.length < 10 || !name}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-xs font-medium hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-50"
          >
            {testing && <Loader2 className="h-3 w-3 animate-spin" />}
            Test now
          </button>
        </div>

        {testResult && testResult.ok && (
          <div className="mt-4 space-y-1.5">
            {testResult.samples.map((s, i) => (
              <div
                key={i}
                className={`flex items-start gap-2 rounded-lg px-3 py-2 text-xs ${
                  s.matched
                    ? "bg-green-50 dark:bg-green-950/40 text-green-800 dark:text-green-300"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                }`}
              >
                {s.matched ? (
                  <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 mt-0.5 shrink-0 opacity-50" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{s.subject}</div>
                  <div className="opacity-75 truncate">
                    {s.matched
                      ? `Match (${s.confidence}%) — ${s.reason}`
                      : `No match — routed to ${s.matched_name ?? s.matched_slug ?? "?"}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {testResult && !testResult.ok && (
          <p className="mt-3 text-xs text-red-600 dark:text-red-400">{testResult.error}</p>
        )}
      </div>

      {/* Submit */}
      <div className="flex items-center gap-3 pt-2 border-t border-zinc-200 dark:border-zinc-800">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {mode === "create" ? "Create category" : "Save changes"}
          <ChevronRight className="h-4 w-4" />
        </button>
        {onDone && (
          <button
            type="button"
            onClick={() => onDone?.()}
            className="text-sm px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
        )}
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>
    </form>
  );
}
