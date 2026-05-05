"use client";

import { useEffect, useRef, useState } from "react";

// Renders an email's HTML body inside a sandboxed iframe so styles work
// (like Gmail) but no script can run. We add `allow-same-origin` so the
// parent can read scrollHeight to auto-fit, and `allow-popups` so links
// open in a new tab.
const SANDBOX = "allow-same-origin allow-popups allow-popups-to-escape-sandbox";

export function HtmlEmailBody({ html, dark = false }: { html: string; dark?: boolean }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(200);

  useEffect(() => {
    const iframe = ref.current;
    if (!iframe) return;

    function resize() {
      try {
        const doc = iframe?.contentDocument;
        if (!doc) return;
        const h = Math.max(
          doc.body?.scrollHeight ?? 0,
          doc.documentElement?.scrollHeight ?? 0,
          200,
        );
        setHeight(h + 24);
      } catch {
        // cross-origin or sandbox without same-origin
      }
    }

    iframe.addEventListener("load", resize);
    // Some content (images) loads after `load`; observe size changes too.
    let ro: ResizeObserver | null = null;
    try {
      const win = iframe.contentWindow;
      if (win) {
        const doc = iframe.contentDocument;
        if (doc?.body && "ResizeObserver" in win) {
          ro = new (win as unknown as { ResizeObserver: typeof ResizeObserver }).ResizeObserver(
            resize,
          );
          ro.observe(doc.body);
        }
      }
    } catch {
      // ignore
    }
    return () => {
      iframe.removeEventListener("load", resize);
      ro?.disconnect();
    };
  }, []);

  const wrapped = `<!DOCTYPE html>
<html>
<head>
<base target="_blank">
<meta charset="utf-8">
<style>
  body {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-size: 14px;
    line-height: 1.6;
    color: ${dark ? "#e4e4e7" : "#27272a"};
    background: transparent;
    word-wrap: break-word;
    overflow-wrap: anywhere;
  }
  img, table, video, iframe {
    max-width: 100% !important;
    height: auto;
  }
  pre, code {
    white-space: pre-wrap;
    word-break: break-word;
  }
  a {
    color: ${dark ? "#60a5fa" : "#2563eb"};
  }
  blockquote {
    border-left: 3px solid ${dark ? "#3f3f46" : "#d4d4d8"};
    margin: 0;
    padding-left: 12px;
    color: ${dark ? "#a1a1aa" : "#52525b"};
  }
  table {
    border-collapse: collapse;
  }
</style>
</head>
<body>${html}</body>
</html>`;

  return (
    <iframe
      ref={ref}
      sandbox={SANDBOX}
      srcDoc={wrapped}
      title="Email body"
      className="w-full border-0 block"
      style={{ height, minHeight: 200 }}
    />
  );
}
