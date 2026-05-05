"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Send,
  Trash2,
  X,
  CheckCircle2,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Link as LinkIcon,
  Smile,
  Undo2,
  Redo2,
  Type,
  Palette,
  Paperclip,
  Image as ImageIcon,
  Triangle,
  Lock,
  Pencil,
  CaseSensitive,
} from "lucide-react";
import { sendComposeAction } from "./actions";

type Account = { id: string; email: string };

export type Contact = { name: string; email: string };

type LocalAttachment = {
  id: string;
  filename: string;
  mimeType: string;
  base64: string;
  size: number;
};

const MAX_TOTAL_BYTES = 25 * 1024 * 1024;

const TEXT_COLORS = [
  "#000000", "#5f6368", "#e8eaed", "#ffffff",
  "#d93025", "#e8710a", "#f9ab00", "#188038",
  "#1a73e8", "#1967d2", "#5e35b1", "#a142f4",
];

const FONT_SIZES = [
  { label: "Small", value: "1" },
  { label: "Normal", value: "3" },
  { label: "Large", value: "5" },
  { label: "Huge", value: "7" },
];

const FONTS = [
  { label: "Sans Serif", value: "Arial, sans-serif" },
  { label: "Serif", value: "Georgia, serif" },
  { label: "Monospace", value: "Menlo, monospace" },
];

const QUICK_EMOJIS = [
  "😀", "😂", "😍", "😊", "🙏", "👍", "👏", "🎉",
  "🔥", "✨", "💯", "❤️", "🚀", "⭐", "✅", "❌",
  "📌", "📎", "📝", "💡", "⚡", "⏰", "📅", "🎯",
];

export function ComposeForm({
  accounts,
  contacts = [],
}: {
  accounts: Account[];
  contacts?: Contact[];
}) {
  const router = useRouter();
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [to, setTo] = useState("");
  const [showContacts, setShowContacts] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(0);
  const [subject, setSubject] = useState("");
  const [bodyEmpty, setBodyEmpty] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();
  const [showColors, setShowColors] = useState(false);
  const [showSize, setShowSize] = useState(false);
  const [showFont, setShowFont] = useState(false);
  const [showAlign, setShowAlign] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showFormatting, setShowFormatting] = useState(true);
  const [attachments, setAttachments] = useState<LocalAttachment[]>([]);
  const [attachError, setAttachError] = useState<string | null>(null);

  const editorRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  function getHtml(): string {
    return editorRef.current?.innerHTML ?? "";
  }

  function getText(): string {
    return editorRef.current?.innerText ?? "";
  }

  function exec(command: string, value?: string) {
    // execCommand operates on the current selection inside the contentEditable.
    // If the editor isn't focused (e.g., user clicked a toolbar button before
    // ever clicking into the editor), focus it and put a cursor at the end so
    // commands like insertOrderedList/foreColor have something to act on.
    const ed = editorRef.current;
    if (ed && document.activeElement !== ed) {
      ed.focus();
      const sel = window.getSelection();
      if (sel) {
        const range = document.createRange();
        range.selectNodeContents(ed);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
    document.execCommand(command, false, value);
    refreshEmpty();
  }

  function refreshEmpty() {
    const txt = (editorRef.current?.innerText ?? "").trim();
    setBodyEmpty(txt.length === 0);
  }

  function onInsertLink() {
    const url = prompt("Enter URL");
    if (!url) return;
    exec("createLink", url);
  }

  function onInsertEmoji(emoji: string) {
    setShowEmoji(false);
    editorRef.current?.focus();
    document.execCommand("insertText", false, emoji);
    refreshEmpty();
  }

  function onDiscard() {
    setTo("");
    setSubject("");
    if (editorRef.current) editorRef.current.innerHTML = "";
    setBodyEmpty(true);
    setAttachments([]);
    setAttachError(null);
    setError(null);
    setSuccess(false);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const html = getHtml();
    const text = getText();
    if (!text.trim()) {
      setError("Message body is empty");
      return;
    }
    startTransition(async () => {
      const res = await sendComposeAction({
        accountId,
        to,
        subject,
        body: html,
        attachments: attachments.map((a) => ({
          filename: a.filename,
          mimeType: a.mimeType,
          base64: a.base64,
        })),
      });
      if (!res.ok) setError(res.error);
      else {
        setSuccess(true);
        onDiscard();
        setTimeout(() => router.push("/dashboard/inbox"), 800);
      }
    });
  }

  function readFileAsBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // strip data URL prefix
        const idx = result.indexOf(",");
        resolve(idx >= 0 ? result.slice(idx + 1) : result);
      };
      reader.onerror = () => reject(reader.error ?? new Error("read failed"));
      reader.readAsDataURL(file);
    });
  }

  async function onFilesPicked(files: FileList | null) {
    if (!files || files.length === 0) return;
    setAttachError(null);
    const currentBytes = attachments.reduce((s, a) => s + a.size, 0);
    let bytesAfter = currentBytes;
    const newOnes: LocalAttachment[] = [];
    for (const f of Array.from(files)) {
      bytesAfter += f.size;
      if (bytesAfter > MAX_TOTAL_BYTES) {
        setAttachError("Total attachments exceed 25 MB");
        break;
      }
      try {
        const base64 = await readFileAsBase64(f);
        newOnes.push({
          id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          filename: f.name,
          mimeType: f.type || "application/octet-stream",
          base64,
          size: f.size,
        });
      } catch (err) {
        setAttachError(err instanceof Error ? err.message : "Failed to read file");
      }
    }
    setAttachments((prev) => [...prev, ...newOnes]);
  }

  function removeAttachment(id: string) {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }

  function comingSoon(feature: string) {
    alert(`${feature} — coming soon. Drop me a request to prioritize.`);
  }

  // Close popovers when clicking OUTSIDE the form. Inside-form clicks are
  // handled by each button's own onClick (which toggles state), so the global
  // listener should not fire there — otherwise the popover that the user just
  // opened would close on the very same click that opened it.
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (formRef.current && !formRef.current.contains(e.target as Node)) {
        setShowColors(false);
        setShowSize(false);
        setShowFont(false);
        setShowAlign(false);
        setShowEmoji(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  function stop(e: React.MouseEvent) {
    e.stopPropagation();
  }

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-800">
        <div className="font-medium text-sm">New Message</div>
        <button
          type="button"
          onClick={() => router.push("/dashboard/inbox")}
          className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* From */}
      {accounts.length > 1 && (
        <div className="flex items-center gap-3 px-4 py-2 border-b border-zinc-200 dark:border-zinc-800">
          <label className="text-xs text-zinc-500 w-16 shrink-0">From</label>
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="flex-1 bg-transparent text-sm focus:outline-none"
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.email}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* To */}
      <div className="relative flex items-center gap-3 px-4 py-2 border-b border-zinc-200 dark:border-zinc-800">
        <label className="text-xs text-zinc-500 w-16 shrink-0">To</label>
        <input
          type="text"
          required
          placeholder="Recipients"
          value={to}
          onChange={(e) => {
            setTo(e.target.value);
            setShowContacts(true);
            setHighlightIdx(0);
          }}
          onFocus={() => setShowContacts(true)}
          onBlur={() => setTimeout(() => setShowContacts(false), 150)}
          onKeyDown={(e) => {
            const matches = filterContacts(contacts, to);
            if (!showContacts || matches.length === 0) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setHighlightIdx((i) => Math.min(i + 1, matches.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlightIdx((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter" || e.key === "Tab") {
              const pick = matches[highlightIdx];
              if (pick) {
                e.preventDefault();
                setTo(pick.email);
                setShowContacts(false);
              }
            } else if (e.key === "Escape") {
              setShowContacts(false);
            }
          }}
          autoComplete="off"
          className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-zinc-400"
        />

        {/* Autocomplete dropdown */}
        {showContacts && (() => {
          const matches = filterContacts(contacts, to);
          if (matches.length === 0) return null;
          return (
            <div className="absolute left-20 right-4 top-full mt-1 z-20 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg overflow-hidden">
              {matches.map((c, i) => (
                <button
                  key={c.email}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setTo(c.email);
                    setShowContacts(false);
                  }}
                  onMouseEnter={() => setHighlightIdx(i)}
                  className={`flex items-center gap-3 w-full text-left px-3 py-2 text-sm ${
                    i === highlightIdx
                      ? "bg-blue-50 dark:bg-blue-950/40"
                      : "hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  }`}
                >
                  <ContactAvatar email={c.email} />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate text-zinc-900 dark:text-zinc-100">
                      {c.name || c.email}
                    </div>
                    {c.name && c.name !== c.email && (
                      <div className="text-xs text-zinc-500 truncate">{c.email}</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          );
        })()}
      </div>

      {/* Subject */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-zinc-200 dark:border-zinc-800">
        <label className="text-xs text-zinc-500 w-16 shrink-0">Subject</label>
        <input
          type="text"
          required
          placeholder="Subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-zinc-400"
        />
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={refreshEmpty}
        onKeyUp={refreshEmpty}
        className="min-h-[260px] px-4 py-3 text-sm leading-relaxed focus:outline-none"
        data-placeholder="Compose your message..."
        style={{ fontFamily: "Arial, sans-serif" }}
      />

      {/* Attachment chips */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 px-4 py-2 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
          {attachments.map((a) => (
            <span
              key={a.id}
              className="inline-flex items-center gap-1.5 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-3 py-1 text-xs"
            >
              <Paperclip className="h-3 w-3 text-zinc-500" />
              <span className="font-medium truncate max-w-[180px]">{a.filename}</span>
              <span className="text-zinc-400">{(a.size / 1024).toFixed(0)} KB</span>
              <button
                type="button"
                onClick={() => removeAttachment(a.id)}
                className="ml-1 text-zinc-400 hover:text-red-600"
                aria-label="Remove attachment"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          {attachError && (
            <span className="text-xs text-red-600 dark:text-red-400">{attachError}</span>
          )}
        </div>
      )}

      {/* Top formatting toolbar */}
      {showFormatting && (
      <div className="flex flex-wrap items-center gap-0.5 px-3 py-2 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 text-zinc-700 dark:text-zinc-300">
        <ToolBtn onClick={() => exec("undo")} title="Undo (Ctrl+Z)">
          <Undo2 className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => exec("redo")} title="Redo (Ctrl+Y)">
          <Redo2 className="h-3.5 w-3.5" />
        </ToolBtn>
        <Sep />

        {/* Font family */}
        <Pop
          onClick={(e) => {
            stop(e);
            setShowFont((v) => !v);
            setShowSize(false);
            setShowColors(false);
            setShowAlign(false);
            setShowEmoji(false);
          }}
          label={
            <span className="flex items-center gap-1 text-xs px-2">
              Sans Serif
            </span>
          }
        >
          {showFont && (
            <Popover>
              {FONTS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => {
                    exec("fontName", f.value);
                    setShowFont(false);
                  }}
                  className="block w-full text-left px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  style={{ fontFamily: f.value }}
                >
                  {f.label}
                </button>
              ))}
            </Popover>
          )}
        </Pop>

        {/* Font size */}
        <Pop
          onClick={(e) => {
            stop(e);
            setShowSize((v) => !v);
            setShowFont(false);
            setShowColors(false);
            setShowAlign(false);
            setShowEmoji(false);
          }}
          label={<Type className="h-3.5 w-3.5" />}
        >
          {showSize && (
            <Popover>
              {FONT_SIZES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => {
                    exec("fontSize", s.value);
                    setShowSize(false);
                  }}
                  className="block w-full text-left px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  {s.label}
                </button>
              ))}
            </Popover>
          )}
        </Pop>

        <Sep />
        <ToolBtn onClick={() => exec("bold")} title="Bold (Ctrl+B)">
          <Bold className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => exec("italic")} title="Italic (Ctrl+I)">
          <Italic className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => exec("underline")} title="Underline (Ctrl+U)">
          <Underline className="h-3.5 w-3.5" />
        </ToolBtn>

        {/* Text color */}
        <Pop
          onClick={(e) => {
            stop(e);
            setShowColors((v) => !v);
            setShowFont(false);
            setShowSize(false);
            setShowAlign(false);
            setShowEmoji(false);
          }}
          label={<Palette className="h-3.5 w-3.5" />}
        >
          {showColors && (
            <Popover>
              <div className="grid grid-cols-4 gap-1 p-2">
                {TEXT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      exec("foreColor", c);
                      setShowColors(false);
                    }}
                    className="h-6 w-6 rounded border border-zinc-200 dark:border-zinc-700 hover:scale-110 transition"
                    style={{ backgroundColor: c }}
                    aria-label={`Color ${c}`}
                  />
                ))}
              </div>
            </Popover>
          )}
        </Pop>

        <Sep />
        {/* Alignment */}
        <Pop
          onClick={(e) => {
            stop(e);
            setShowAlign((v) => !v);
            setShowColors(false);
            setShowSize(false);
            setShowFont(false);
            setShowEmoji(false);
          }}
          label={<AlignLeft className="h-3.5 w-3.5" />}
        >
          {showAlign && (
            <Popover>
              <button
                type="button"
                onClick={() => {
                  exec("justifyLeft");
                  setShowAlign(false);
                }}
                className="flex items-center gap-2 w-full text-left px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <AlignLeft className="h-3.5 w-3.5" /> Left
              </button>
              <button
                type="button"
                onClick={() => {
                  exec("justifyCenter");
                  setShowAlign(false);
                }}
                className="flex items-center gap-2 w-full text-left px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <AlignCenter className="h-3.5 w-3.5" /> Center
              </button>
              <button
                type="button"
                onClick={() => {
                  exec("justifyRight");
                  setShowAlign(false);
                }}
                className="flex items-center gap-2 w-full text-left px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <AlignRight className="h-3.5 w-3.5" /> Right
              </button>
              <button
                type="button"
                onClick={() => {
                  exec("justifyFull");
                  setShowAlign(false);
                }}
                className="flex items-center gap-2 w-full text-left px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <AlignJustify className="h-3.5 w-3.5" /> Justify
              </button>
            </Popover>
          )}
        </Pop>

        <ToolBtn onClick={() => exec("insertOrderedList")} title="Numbered list">
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => exec("insertUnorderedList")} title="Bulleted list">
          <List className="h-3.5 w-3.5" />
        </ToolBtn>
        <Sep />
        <ToolBtn onClick={onInsertLink} title="Insert link">
          <LinkIcon className="h-3.5 w-3.5" />
        </ToolBtn>

        {/* Emoji */}
        <Pop
          onClick={(e) => {
            stop(e);
            setShowEmoji((v) => !v);
            setShowColors(false);
            setShowSize(false);
            setShowFont(false);
            setShowAlign(false);
          }}
          label={<Smile className="h-3.5 w-3.5" />}
        >
          {showEmoji && (
            <Popover>
              <div className="grid grid-cols-8 gap-0.5 p-2 w-64">
                {QUICK_EMOJIS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => onInsertEmoji(e)}
                    className="h-7 w-7 text-base hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded"
                  >
                    {e}
                  </button>
                ))}
              </div>
            </Popover>
          )}
        </Pop>
      </div>
      )}

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          onFilesPicked(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          onFilesPicked(e.target.files);
          e.target.value = "";
        }}
      />

      {/* Footer — Send + bottom action toolbar */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="submit"
            disabled={pending || !to.trim() || !subject.trim() || bodyEmpty}
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
                Send
              </>
            )}
          </button>

          <span className="ml-1 flex items-center gap-0.5 text-zinc-700 dark:text-zinc-300">
            <BottomBtn
              onClick={() => setShowFormatting((v) => !v)}
              active={showFormatting}
              title={showFormatting ? "Hide formatting" : "Show formatting"}
            >
              <CaseSensitive className="h-4 w-4" />
            </BottomBtn>
            <BottomBtn
              onClick={() => fileInputRef.current?.click()}
              title="Attach files"
            >
              <Paperclip className="h-4 w-4" />
            </BottomBtn>
            <BottomBtn onClick={onInsertLink} title="Insert link">
              <LinkIcon className="h-4 w-4" />
            </BottomBtn>
            <Pop
              onClick={(e) => {
                stop(e);
                setShowEmoji((v) => !v);
                setShowColors(false);
                setShowSize(false);
                setShowFont(false);
                setShowAlign(false);
              }}
              label={<Smile className="h-4 w-4" />}
            >
              {showEmoji && (
                <div className="absolute bottom-full left-0 mb-1 z-10 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg">
                  <div className="grid grid-cols-8 gap-0.5 p-2 w-64">
                    {QUICK_EMOJIS.map((e) => (
                      <button
                        key={e}
                        type="button"
                        onClick={() => onInsertEmoji(e)}
                        className="h-7 w-7 text-base hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded"
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </Pop>
            <BottomBtn
              onClick={() => comingSoon("Insert from Drive")}
              title="Insert from Drive (coming soon)"
            >
              <Triangle className="h-4 w-4" />
            </BottomBtn>
            <BottomBtn
              onClick={() => imageInputRef.current?.click()}
              title="Insert image"
            >
              <ImageIcon className="h-4 w-4" />
            </BottomBtn>
            <BottomBtn
              onClick={() => comingSoon("Confidential mode")}
              title="Confidential mode (coming soon)"
            >
              <Lock className="h-4 w-4" />
            </BottomBtn>
            <BottomBtn
              onClick={() => comingSoon("Signature")}
              title="Signature (coming soon)"
            >
              <Pencil className="h-4 w-4" />
            </BottomBtn>
          </span>

          {success && (
            <span className="inline-flex items-center gap-1 text-sm text-green-600 dark:text-green-400 ml-2">
              <CheckCircle2 className="h-4 w-4" />
              Sent
            </span>
          )}
          {error && <span className="text-sm text-red-600 dark:text-red-400 ml-2">{error}</span>}
        </div>
        <button
          type="button"
          onClick={onDiscard}
          disabled={pending}
          className="p-2 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-red-600 disabled:opacity-50"
          aria-label="Discard"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Placeholder for empty editor */}
      <style jsx>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: rgb(161, 161, 170);
          pointer-events: none;
        }
      `}</style>
    </form>
  );
}

function filterContacts(contacts: Contact[], query: string): Contact[] {
  const q = query.trim().toLowerCase();
  if (!q) return contacts.slice(0, 5);
  const matches = contacts.filter(
    (c) =>
      c.email.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q),
  );
  return matches.slice(0, 5);
}

const AVATAR_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899",
];

function ContactAvatar({ email }: { email: string }) {
  const initial = (email[0] ?? "?").toUpperCase();
  let hash = 0;
  for (let i = 0; i < email.length; i++) hash = (hash * 31 + email.charCodeAt(i)) >>> 0;
  const bg = AVATAR_COLORS[hash % AVATAR_COLORS.length];
  return (
    <div
      className="shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-full text-white text-sm font-semibold"
      style={{ backgroundColor: bg }}
    >
      {initial}
    </div>
  );
}

function BottomBtn({
  onClick,
  title,
  active,
  children,
}: {
  onClick: () => void;
  title: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title={title}
      className={`p-2 rounded-full transition ${
        active
          ? "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
          : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
      }`}
    >
      {children}
    </button>
  );
}

function ToolBtn({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title={title}
      className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700"
    >
      {children}
    </button>
  );
}

function Sep() {
  return <span className="mx-1 h-5 w-px bg-zinc-300 dark:bg-zinc-700" />;
}

function Pop({
  onClick,
  label,
  children,
}: {
  onClick: (e: React.MouseEvent) => void;
  label: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <span className="relative">
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={onClick}
        className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700"
      >
        {label}
      </button>
      {children}
    </span>
  );
}

function Popover({ children }: { children: React.ReactNode }) {
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="absolute bottom-full left-0 mb-1 z-10 min-w-[140px] rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg py-1"
    >
      {children}
    </div>
  );
}
