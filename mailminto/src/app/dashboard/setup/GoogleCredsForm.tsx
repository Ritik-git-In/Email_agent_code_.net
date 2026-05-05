"use client";

import { useState, useTransition } from "react";
import { Loader2, CheckCircle2, ExternalLink, Copy, Check, Pencil } from "lucide-react";
import { saveGoogleCreds, deleteGoogleCreds } from "./actions";

export function GoogleCredsForm({
  existing,
  redirectUri,
}: {
  existing: { client_id: string } | null;
  redirectUri: string;
}) {
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);

  function onReset() {
    setError(null);
    startTransition(async () => {
      const res = await deleteGoogleCreds();
      if (!res.ok) setError(res.error);
      else setEditing(true);
    });
  }

  function copyRedirectUri() {
    navigator.clipboard.writeText(redirectUri);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const fd = new FormData();
    fd.set("client_id", clientId);
    fd.set("client_secret", clientSecret);
    startTransition(async () => {
      const res = await saveGoogleCreds(fd);
      if (!res.ok) setError(res.error);
      else {
        setSuccess(true);
        setClientSecret("");
      }
    });
  }

  if (existing && !editing) {
    return (
      <div className="rounded-lg border border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-950/30 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-medium text-sm">
              <CheckCircle2 className="h-4 w-4" />
              Google credentials saved
            </div>
            <p className="mt-1 text-zinc-600 dark:text-zinc-400 font-mono text-xs break-all">
              {existing.client_id}
            </p>
          </div>
          <button
            onClick={onReset}
            disabled={pending}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50"
          >
            {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Pencil className="h-3 w-3" />}
            Edit / Reset
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Step-by-step guide */}
      <ol className="space-y-3 text-sm">
        <Step number={1}>
          Open{" "}
          <a
            href="https://console.cloud.google.com/projectcreate"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 underline font-medium text-blue-600 dark:text-blue-400"
          >
            Google Cloud Console <ExternalLink className="h-3 w-3" />
          </a>{" "}
          and create a new project named <code className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded">MailMinto</code>.
        </Step>
        <Step number={2}>
          Open{" "}
          <a
            href="https://console.cloud.google.com/apis/library/gmail.googleapis.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 underline font-medium text-blue-600 dark:text-blue-400"
          >
            Gmail API <ExternalLink className="h-3 w-3" />
          </a>{" "}
          and click <strong>Enable</strong>. Then enable{" "}
          <a
            href="https://console.cloud.google.com/apis/library/calendar-json.googleapis.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 underline font-medium text-blue-600 dark:text-blue-400"
          >
            Calendar API <ExternalLink className="h-3 w-3" />
          </a>{" "}
          too.
        </Step>
        <Step number={3}>
          Open{" "}
          <a
            href="https://console.cloud.google.com/apis/credentials/consent"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 underline font-medium text-blue-600 dark:text-blue-400"
          >
            OAuth consent screen <ExternalLink className="h-3 w-3" />
          </a>{" "}
          → choose <strong>External</strong> → fill app name <code className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded">MailMinto</code> + your email. Skip scopes/optional info. Add <strong>your own Gmail</strong> as a Test User.
        </Step>
        <Step number={4}>
          Open{" "}
          <a
            href="https://console.cloud.google.com/apis/credentials"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 underline font-medium text-blue-600 dark:text-blue-400"
          >
            Credentials <ExternalLink className="h-3 w-3" />
          </a>{" "}
          → <strong>Create Credentials</strong> → <strong>OAuth client ID</strong> → choose <strong>Web application</strong>. Add this Authorized redirect URI:
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 rounded text-xs font-mono break-all">
              {redirectUri}
            </code>
            <button
              type="button"
              onClick={copyRedirectUri}
              className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-3 py-1.5 text-xs font-medium hover:opacity-90"
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </Step>
        <Step number={5}>
          Click <strong>Create</strong>. Google will show your Client ID + Client Secret. Paste them below.
        </Step>
      </ol>

      <p className="text-xs text-zinc-500 dark:text-zinc-400 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-3">
        ⚠️ When you connect Gmail later, Google will show <strong>&quot;Google hasn&apos;t verified this app&quot;</strong>. Click <strong>Advanced → Go to MailMinto (unsafe)</strong>. This is normal — you&apos;re the developer of your own app, so it&apos;s safe.
      </p>

      {/* Form */}
      <form onSubmit={onSubmit} className="space-y-3 pt-2 border-t border-zinc-200 dark:border-zinc-800">
        <div>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
            Client ID
          </label>
          <input
            type="text"
            required
            placeholder="e.g. 123456789-abc...apps.googleusercontent.com"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm font-mono"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
            Client Secret
          </label>
          <input
            type="password"
            required
            placeholder="GOCSPX-..."
            value={clientSecret}
            onChange={(e) => setClientSecret(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm font-mono"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          Save & Continue
        </button>
        {success && (
          <p className="text-sm text-green-600 dark:text-green-400">
            ✓ Saved. Continue to Step 2.
          </p>
        )}
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </form>
    </div>
  );
}

function Step({ number, children }: { number: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="shrink-0 inline-flex h-6 w-6 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-800 text-xs font-mono">
        {number}
      </span>
      <div className="flex-1 leading-relaxed text-zinc-700 dark:text-zinc-300">
        {children}
      </div>
    </li>
  );
}
