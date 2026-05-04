import { google, type gmail_v1 } from "googleapis";
import { createOAuthClient } from "./oauth";

export type GmailMessage = {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string;
  snippet: string;
  body: string;
  receivedAt: Date;
};

export function gmailFromRefreshToken(refreshToken: string): gmail_v1.Gmail {
  const oauth = createOAuthClient();
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
  };
}

export async function getLabelTotals(
  gmail: gmail_v1.Gmail,
  labelId: string,
): Promise<{ total: number; unread: number }> {
  try {
    const res = await gmail.users.labels.get({ userId: "me", id: labelId });
    return {
      total: res.data.messagesTotal ?? 0,
      unread: res.data.messagesUnread ?? 0,
    };
  } catch {
    return { total: 0, unread: 0 };
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
  if (!payload) return "";
  if (payload.body?.data) return decodeBase64Url(payload.body.data);
  for (const part of payload.parts ?? []) {
    if (part.mimeType === "text/plain" && part.body?.data) {
      return decodeBase64Url(part.body.data);
    }
  }
  for (const part of payload.parts ?? []) {
    const nested = extractBody(part);
    if (nested) return nested;
  }
  return "";
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
  return {
    id: m.id!,
    threadId: m.threadId!,
    subject: header(headers, "Subject"),
    from: header(headers, "From"),
    to: header(headers, "To"),
    snippet: m.snippet ?? "",
    body: extractBody(m.payload).slice(0, 8000),
    receivedAt: new Date(Number(m.internalDate ?? Date.now())),
  };
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
