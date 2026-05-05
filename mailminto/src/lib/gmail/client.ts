import { google, type gmail_v1 } from "googleapis";
import { createOAuthClient, type OAuthCreds } from "./oauth";

export type GmailMessage = {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string;
  snippet: string;
  body: string;
  bodyHtml?: string;
  receivedAt: Date;
};

export function gmailFromRefreshToken(
  refreshToken: string,
  creds: OAuthCreds,
): gmail_v1.Gmail {
  const oauth = createOAuthClient(creds);
  oauth.setCredentials({ refresh_token: refreshToken });
  return google.gmail({ version: "v1", auth: oauth });
}

export async function listUnreadIds(
  gmail: gmail_v1.Gmail,
  maxResults = 25,
): Promise<string[]> {
  const res = await gmail.users.messages.list({
    userId: "me",
    q: "is:unread",
    maxResults,
  });
  return (res.data.messages ?? []).map((m) => m.id!).filter(Boolean);
}

export async function listInboxIds(
  gmail: gmail_v1.Gmail,
  maxResults = 50,
): Promise<string[]> {
  const res = await gmail.users.messages.list({
    userId: "me",
    q: "in:inbox -in:trash",
    maxResults,
  });
  return (res.data.messages ?? []).map((m) => m.id!).filter(Boolean);
}

export type InboxPage = {
  ids: string[];
  nextPageToken: string | null;
  resultSizeEstimate: number;
};

export async function listInboxPage(
  gmail: gmail_v1.Gmail,
  opts: { maxResults?: number; pageToken?: string } = {},
): Promise<InboxPage> {
  const res = await gmail.users.messages.list({
    userId: "me",
    q: "in:inbox -in:trash",
    maxResults: opts.maxResults ?? 50,
    pageToken: opts.pageToken,
  });
  return {
    ids: (res.data.messages ?? []).map((m) => m.id!).filter(Boolean),
    nextPageToken: res.data.nextPageToken ?? null,
    resultSizeEstimate: res.data.resultSizeEstimate ?? 0,
  };
}

// Thread-based listing — matches Gmail UI's count (it groups by conversation).
export type ThreadListPage = {
  threadIds: string[];
  nextPageToken: string | null;
  resultSizeEstimate: number;
};

export async function listInboxThreadsPage(
  gmail: gmail_v1.Gmail,
  opts: { maxResults?: number; pageToken?: string } = {},
): Promise<ThreadListPage> {
  // Match Gmail UI's default "Primary" tab — exclude Social, Promotions,
  // Updates, Forums. This is what users expect to see in their inbox.
  const res = await gmail.users.threads.list({
    userId: "me",
    q: "in:inbox -in:trash category:primary",
    maxResults: opts.maxResults ?? 50,
    pageToken: opts.pageToken,
  });
  return {
    threadIds: (res.data.threads ?? []).map((t) => t.id!).filter(Boolean),
    nextPageToken: res.data.nextPageToken ?? null,
    resultSizeEstimate: res.data.resultSizeEstimate ?? 0,
  };
}

// Exact thread count for a given Gmail query. Paginates through all threads
// (up to a safety cap of 20 pages × 500 = 10,000 threads). This matches what
// Gmail's UI shows in the "of N" indicator — neither resultSizeEstimate (per-
// page guess, unreliable) nor a single label's threadsTotal (doesn't account
// for category filters) gives the exact figure.
export async function countThreads(
  gmail: gmail_v1.Gmail,
  query: string,
): Promise<number> {
  let total = 0;
  let pageToken: string | null = null;
  for (let i = 0; i < 20; i++) {
    const params: gmail_v1.Params$Resource$Users$Threads$List = {
      userId: "me",
      q: query,
      maxResults: 500,
    };
    if (pageToken) params.pageToken = pageToken;
    const res = await gmail.users.threads.list(params);
    total += (res.data.threads ?? []).length;
    const next = res.data.nextPageToken;
    if (!next) break;
    pageToken = next;
  }
  return total;
}

// Returns the LATEST message of a thread as a GmailMessageMeta. The whole
// thread's read state (any message unread → thread is unread) matches Gmail UI.
export async function getThreadLatestMetadata(
  gmail: gmail_v1.Gmail,
  threadId: string,
): Promise<GmailMessageMeta | null> {
  try {
    const res = await gmail.users.threads.get({
      userId: "me",
      id: threadId,
      format: "metadata",
      metadataHeaders: ["Subject", "From", "To", "Date"],
    });
    const messages = res.data.messages ?? [];
    if (messages.length === 0) return null;
    const last = messages[messages.length - 1];
    const headers = last.payload?.headers;
    const anyUnread = messages.some((m) => (m.labelIds ?? []).includes("UNREAD"));
    return {
      id: last.id!,
      threadId: res.data.id!,
      subject: header(headers, "Subject"),
      from: header(headers, "From"),
      to: header(headers, "To"),
      snippet: last.snippet ?? "",
      date: new Date(Number(last.internalDate ?? Date.now())),
      labelIds: last.labelIds ?? [],
      isUnread: anyUnread,
    };
  } catch {
    return null;
  }
}

export async function listSentPage(
  gmail: gmail_v1.Gmail,
  opts: { maxResults?: number; pageToken?: string } = {},
): Promise<InboxPage> {
  const res = await gmail.users.messages.list({
    userId: "me",
    q: "in:sent -in:trash",
    maxResults: opts.maxResults ?? 50,
    pageToken: opts.pageToken,
  });
  return {
    ids: (res.data.messages ?? []).map((m) => m.id!).filter(Boolean),
    nextPageToken: res.data.nextPageToken ?? null,
    resultSizeEstimate: res.data.resultSizeEstimate ?? 0,
  };
}

export async function getLabelTotals(
  gmail: gmail_v1.Gmail,
  labelId: string,
): Promise<{ total: number; unread: number; threadsTotal: number; threadsUnread: number }> {
  try {
    const res = await gmail.users.labels.get({ userId: "me", id: labelId });
    return {
      total: res.data.messagesTotal ?? 0,
      unread: res.data.messagesUnread ?? 0,
      threadsTotal: res.data.threadsTotal ?? 0,
      threadsUnread: res.data.threadsUnread ?? 0,
    };
  } catch {
    return { total: 0, unread: 0, threadsTotal: 0, threadsUnread: 0 };
  }
}

export type GmailMessageMeta = {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string;
  snippet: string;
  date: Date;
  labelIds: string[];
  isUnread: boolean;
};

export async function getMessageMetadata(
  gmail: gmail_v1.Gmail,
  id: string,
): Promise<GmailMessageMeta> {
  const res = await gmail.users.messages.get({
    userId: "me",
    id,
    format: "metadata",
    metadataHeaders: ["Subject", "From", "To", "Date"],
  });
  const m = res.data;
  const headers = m.payload?.headers;
  const labelIds = m.labelIds ?? [];
  return {
    id: m.id!,
    threadId: m.threadId!,
    subject: header(headers, "Subject"),
    from: header(headers, "From"),
    to: header(headers, "To"),
    snippet: m.snippet ?? "",
    date: new Date(Number(m.internalDate ?? Date.now())),
    labelIds,
    isUnread: labelIds.includes("UNREAD"),
  };
}

function header(headers: gmail_v1.Schema$MessagePartHeader[] | undefined, name: string): string {
  return headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? "";
}

function decodeBase64Url(data: string): string {
  return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}

function extractBody(payload: gmail_v1.Schema$MessagePart | undefined): string {
  // Legacy plain-text-only extractor kept for callers that only need text
  // (e.g., the LLM classifier). For UI rendering use extractBodies below.
  return extractBodies(payload).text ?? "";
}

function extractBodies(
  payload: gmail_v1.Schema$MessagePart | undefined,
): { html?: string; text?: string } {
  if (!payload) return {};
  const result: { html?: string; text?: string } = {};

  function walk(part: gmail_v1.Schema$MessagePart | undefined): void {
    if (!part) return;
    const mime = part.mimeType ?? "";
    if (mime === "text/html" && part.body?.data && !result.html) {
      result.html = decodeBase64Url(part.body.data);
    } else if (mime === "text/plain" && part.body?.data && !result.text) {
      result.text = decodeBase64Url(part.body.data);
    }
    for (const sub of part.parts ?? []) walk(sub);
  }
  walk(payload);

  // Fallback for non-multipart messages (no parts, just root body)
  if (!result.html && !result.text && payload.body?.data) {
    const decoded = decodeBase64Url(payload.body.data);
    if ((payload.mimeType ?? "").startsWith("text/html")) result.html = decoded;
    else result.text = decoded;
  }
  return result;
}

export async function getMessage(
  gmail: gmail_v1.Gmail,
  id: string,
): Promise<GmailMessage> {
  const res = await gmail.users.messages.get({
    userId: "me",
    id,
    format: "full",
  });
  const m = res.data;
  const headers = m.payload?.headers;
  const bodies = extractBodies(m.payload);
  return {
    id: m.id!,
    threadId: m.threadId!,
    subject: header(headers, "Subject"),
    from: header(headers, "From"),
    to: header(headers, "To"),
    snippet: m.snippet ?? "",
    body: (bodies.text || stripHtml(bodies.html ?? "")).slice(0, 8000),
    bodyHtml: bodies.html,
    receivedAt: new Date(Number(m.internalDate ?? Date.now())),
  };
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export async function addLabel(
  gmail: gmail_v1.Gmail,
  messageId: string,
  labelId: string,
): Promise<void> {
  await gmail.users.messages.modify({
    userId: "me",
    id: messageId,
    requestBody: { addLabelIds: [labelId] },
  });
}

export async function markMessageAsRead(
  gmail: gmail_v1.Gmail,
  messageId: string,
): Promise<void> {
  await gmail.users.messages.modify({
    userId: "me",
    id: messageId,
    requestBody: { removeLabelIds: ["UNREAD"] },
  });
}

// Mark every message in a thread as read. Gmail's UI works at the thread
// level — opening one message in an inbox row clears the unread highlight
// for the whole conversation, so we mirror that behavior.
export async function markThreadAsRead(
  gmail: gmail_v1.Gmail,
  threadId: string,
): Promise<void> {
  await gmail.users.threads.modify({
    userId: "me",
    id: threadId,
    requestBody: { removeLabelIds: ["UNREAD"] },
  });
}

export async function createDraft(
  gmail: gmail_v1.Gmail,
  opts: { to: string; subject: string; body: string; threadId?: string },
): Promise<string> {
  const raw = [
    `To: ${opts.to}`,
    `Subject: ${opts.subject}`,
    `Content-Type: text/plain; charset=utf-8`,
    "",
    opts.body,
  ].join("\r\n");
  const encoded = Buffer.from(raw)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  const res = await gmail.users.drafts.create({
    userId: "me",
    requestBody: {
      message: {
        raw: encoded,
        threadId: opts.threadId,
      },
    },
  });
  return res.data.id!;
}

export type Attachment = {
  filename: string;
  mimeType: string;
  // base64 (raw, no data URL prefix)
  base64: string;
};

export async function sendMessage(
  gmail: gmail_v1.Gmail,
  opts: {
    to: string;
    subject: string;
    body: string;
    html?: boolean;
    threadId?: string;
    inReplyTo?: string;
    references?: string;
    attachments?: Attachment[];
  },
): Promise<string> {
  const hasAttachments = (opts.attachments?.length ?? 0) > 0;
  const bodyType = opts.html ? "text/html" : "text/plain";

  const baseHeaders = [
    `To: ${opts.to}`,
    `Subject: ${encodeSubjectIfNeeded(opts.subject)}`,
    `MIME-Version: 1.0`,
  ];
  if (opts.inReplyTo) baseHeaders.push(`In-Reply-To: ${opts.inReplyTo}`);
  if (opts.references) baseHeaders.push(`References: ${opts.references}`);

  let raw: string;
  if (!hasAttachments) {
    raw = [
      ...baseHeaders,
      `Content-Type: ${bodyType}; charset=utf-8`,
      `Content-Transfer-Encoding: 7bit`,
      "",
      opts.body,
    ].join("\r\n");
  } else {
    const boundary = `mm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    const parts: string[] = [];
    parts.push(`--${boundary}`);
    parts.push(`Content-Type: ${bodyType}; charset=utf-8`);
    parts.push(`Content-Transfer-Encoding: 7bit`);
    parts.push("");
    parts.push(opts.body);
    for (const att of opts.attachments!) {
      const safeName = att.filename.replace(/"/g, "");
      parts.push(`--${boundary}`);
      parts.push(`Content-Type: ${att.mimeType}; name="${safeName}"`);
      parts.push(`Content-Disposition: attachment; filename="${safeName}"`);
      parts.push(`Content-Transfer-Encoding: base64`);
      parts.push("");
      // Wrap base64 to 76 columns per RFC 2045
      parts.push(att.base64.replace(/(.{76})/g, "$1\r\n"));
    }
    parts.push(`--${boundary}--`);
    raw = [
      ...baseHeaders,
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      "",
      parts.join("\r\n"),
    ].join("\r\n");
  }

  const encoded = Buffer.from(raw, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  const res = await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw: encoded,
      threadId: opts.threadId,
    },
  });
  return res.data.id!;
}

function encodeSubjectIfNeeded(s: string): string {
  // RFC 2047 encode for non-ASCII subjects so emoji etc. survive the wire
  // eslint-disable-next-line no-control-regex
  if (/^[\x00-\x7F]*$/.test(s)) return s;
  return `=?UTF-8?B?${Buffer.from(s, "utf8").toString("base64")}?=`;
}

export async function getMessageHeader(
  gmail: gmail_v1.Gmail,
  id: string,
  name: string,
): Promise<string> {
  const res = await gmail.users.messages.get({
    userId: "me",
    id,
    format: "metadata",
    metadataHeaders: [name],
  });
  return header(res.data.payload?.headers, name);
}
