"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
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
  X,
} from "lucide-react";

export type Attachment = { filename: string; mimeType: string; base64: string };

export type RichBodyHandle = {
  getHtml: () => string;
  getText: () => string;
  getAttachments: () => Attachment[];
  clear: () => void;
};

type LocalAttachment = {
  id: string;
  filename: string;
  mimeType: string;
  base64: string;
  size: number;
};

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

const MAX_TOTAL_BYTES = 25 * 1024 * 1024;

type Props = {
  placeholder?: string;
  initialHtml?: string;
  onEmptyChange?: (empty: boolean) => void;
  sendButton: ReactNode;
  discardButton?: ReactNode;
  statusSlot?: ReactNode;
};

export const RichBodyComposer = forwardRef<RichBodyHandle, Props>(
  function RichBodyComposer(
    { placeholder, initialHtml, onEmptyChange, sendButton, discardButton, statusSlot },
    ref,
  ) {
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
    const containerRef = useRef<HTMLDivElement | null>(null);

    function refreshEmpty() {
      const txt = (editorRef.current?.innerText ?? "").trim();
      onEmptyChange?.(txt.length === 0);
    }

    useEffect(() => {
      if (initialHtml && editorRef.current && !editorRef.current.innerHTML) {
        editorRef.current.innerHTML = initialHtml;
        refreshEmpty();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialHtml]);

    function exec(command: string, value?: string) {
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

    function readFileAsBase64(file: File): Promise<string> {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
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

    useImperativeHandle(
      ref,
      () => ({
        getHtml: () => editorRef.current?.innerHTML ?? "",
        getText: () => editorRef.current?.innerText ?? "",
        getAttachments: () =>
          attachments.map((a) => ({
            filename: a.filename,
            mimeType: a.mimeType,
            base64: a.base64,
          })),
        clear: () => {
          if (editorRef.current) editorRef.current.innerHTML = "";
          setAttachments([]);
          setAttachError(null);
          onEmptyChange?.(true);
        },
      }),
      [attachments, onEmptyChange],
    );

    useEffect(() => {
      function onMouseDown(e: MouseEvent) {
        if (
          containerRef.current &&
          !containerRef.current.contains(e.target as Node)
        ) {
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
      <div ref={containerRef}>
        {/* Editor */}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={refreshEmpty}
          onKeyUp={refreshEmpty}
          className="min-h-[200px] px-4 py-3 text-sm leading-relaxed focus:outline-none"
          data-placeholder={placeholder ?? "Compose your message..."}
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
              <span className="text-xs text-red-600 dark:text-red-400">
                {attachError}
              </span>
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

            <Pop
              onClick={(e) => {
                stop(e);
                setShowFont((v) => !v);
                setShowSize(false);
                setShowColors(false);
                setShowAlign(false);
                setShowEmoji(false);
              }}
              label={<span className="flex items-center gap-1 text-xs px-2">Sans Serif</span>}
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

        {/* Bottom — Send + body actions + Discard */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <div className="flex items-center gap-2 flex-wrap">
            {sendButton}
            <span className="ml-1 flex items-center gap-0.5 text-zinc-700 dark:text-zinc-300">
              <BottomBtn
                onClick={() => setShowFormatting((v) => !v)}
                active={showFormatting}
                title={showFormatting ? "Hide formatting" : "Show formatting"}
              >
                <CaseSensitive className="h-4 w-4" />
              </BottomBtn>
              <BottomBtn onClick={() => fileInputRef.current?.click()} title="Attach files">
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
            {statusSlot && <span className="ml-2">{statusSlot}</span>}
          </div>
          {discardButton}
        </div>

        <style jsx>{`
          [contenteditable]:empty:before {
            content: attr(data-placeholder);
            color: rgb(161, 161, 170);
            pointer-events: none;
          }
        `}</style>
      </div>
    );
  },
);

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
