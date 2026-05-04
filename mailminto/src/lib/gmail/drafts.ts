import type { gmail_v1 } from "googleapis";

export type DraftDetail = {
  id: string;
  messageId: string;
  threadId: string;
  to: string;
  subject: string;
  body: string;
};

export type DraftSummary = {
  id: string;
  messageId: string;
  threadId: string;
  to: string;
  subject: string;
  snippet: string;
  date: Date;
};

export async function listAllDrafts(
  gmail: gmail_v1.Gmail,
  maxResults = 50,
): Promise<DraftSummary[]> {
  const page = await listDraftsPage(gmail, { maxResults });
  return page.drafts;
}

export type DraftsPage = {
  drafts: DraftSummary[];
  nextPageToken: string | null;
  resultSizeEstimate: number;
};

export async function listDraftsPage(
  gmail: gmail_v1.Gmail,
  opts: { maxResults?: number; pageToken?: string } = {},
): Promise<DraftsPage> {
  const list = await gmail.users.drafts.list({
    userId: "me",
    maxResults: opts.maxResults ?? 50,
    pageToken: opts.pageToken,
  });
  const drafts = list.data.drafts ?? [];

  const details = await Promise.all(
    drafts.map(async (d) => {
      try {
        const res = await gmail.users.drafts.get({
          userId: "me",
          id: d.id!,
          format: "metadata",
        });
        const m = res.data.message;
        const headers = m?.payload?.headers;
        return {
          id: res.data.id!,
          messageId: m?.id ?? "",
          threadId: m?.threadId ?? "",
          to: header(headers, "To"),
          subject: header(headers, "Subject"),
          snippet: m?.snippet ?? "",
          date: new Date(Number(m?.internalDate ?? Date.now())),
        } as DraftSummary;
      } catch {
        return null;
      }
    }),
  );

  return {
    drafts: details
      .filter((d): d is DraftSummary => d !== null)
      .sort((a, b) => b.date.getTime() - a.date.getTime()),
    nextPageToken: list.data.nextPageToken ?? null,
    resultSizeEstimate: list.data.resultSizeEstimate ?? drafts.length,
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

export async function getDraft(
  gmail: gmail_v1.Gmail,
  draftId: string,
): Promise<DraftDetail | null> {
  try {
    const res = await gmail.users.drafts.get({
      userId: "me",
      id: draftId,
      format: "full",
    });
    const m = res.data.message;
    if (!m) return null;
    const headers = m.payload?.headers;
    return {
      id: res.data.id!,
      messageId: m.id!,
      threadId: m.threadId!,
      to: header(headers, "To"),
      subject: header(headers, "Subject"),
      body: extractBody(m.payload),
    };
  } catch {
    return null;
  }
}

export async function sendDraft(
  gmail: gmail_v1.Gmail,
  draftId: string,
): Promise<string> {
  const res = await gmail.users.drafts.send({
    userId: "me",
    requestBody: { id: draftId },
  });
  return res.data.id!;
}

export async function deleteDraft(
  gmail: gmail_v1.Gmail,
  draftId: string,
): Promise<void> {
  await gmail.users.drafts.delete({ userId: "me", id: draftId });
}
