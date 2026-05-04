import type { gmail_v1 } from "googleapis";

export const CATEGORY_LABELS: Record<string, { name: string; color?: { backgroundColor: string; textColor: string } }> = {
  high_priority: {
    name: "MailMinto/High Priority",
    color: { backgroundColor: "#fb4c2f", textColor: "#ffffff" },
  },
  finance: {
    name: "MailMinto/Finance",
    color: { backgroundColor: "#fad165", textColor: "#000000" },
  },
  customer_support: {
    name: "MailMinto/Customer Support",
    color: { backgroundColor: "#4986e7", textColor: "#ffffff" },
  },
  promotion: {
    name: "MailMinto/Promotion",
    color: { backgroundColor: "#a479e2", textColor: "#ffffff" },
  },
  internal: {
    name: "MailMinto/Internal",
    color: { backgroundColor: "#16a766", textColor: "#ffffff" },
  },
};

export async function ensureLabel(
  gmail: gmail_v1.Gmail,
  name: string,
  color?: { backgroundColor: string; textColor: string },
): Promise<string> {
  const list = await gmail.users.labels.list({ userId: "me" });
  const existing = list.data.labels?.find((l) => l.name === name);
  if (existing?.id) return existing.id;

  const res = await gmail.users.labels.create({
    userId: "me",
    requestBody: {
      name,
      labelListVisibility: "labelShow",
      messageListVisibility: "show",
      ...(color ? { color } : {}),
    },
  });
  return res.data.id!;
}

export async function ensureAllCategoryLabels(
  gmail: gmail_v1.Gmail,
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  for (const [category, def] of Object.entries(CATEGORY_LABELS)) {
    result[category] = await ensureLabel(gmail, def.name, def.color);
  }
  return result;
}

export type LabelInfo = {
  id: string;
  name: string;
  type: "user" | "system";
  messagesTotal: number;
  color: { backgroundColor: string; textColor: string } | null;
};

export async function listUserLabels(gmail: gmail_v1.Gmail): Promise<LabelInfo[]> {
  const res = await gmail.users.labels.list({ userId: "me" });
  const labels = res.data.labels ?? [];

  const detailed = await Promise.all(
    labels
      .filter((l) => l.type === "user")
      .map(async (l) => {
        const detail = await gmail.users.labels.get({ userId: "me", id: l.id! });
        return {
          id: detail.data.id!,
          name: detail.data.name ?? "",
          type: "user" as const,
          messagesTotal: detail.data.messagesTotal ?? 0,
          color: detail.data.color
            ? {
                backgroundColor: detail.data.color.backgroundColor ?? "#cccccc",
                textColor: detail.data.color.textColor ?? "#000000",
              }
            : null,
        };
      }),
  );

  return detailed.sort((a, b) => a.name.localeCompare(b.name));
}

export async function createLabel(
  gmail: gmail_v1.Gmail,
  name: string,
  color?: { backgroundColor: string; textColor: string },
): Promise<string> {
  const res = await gmail.users.labels.create({
    userId: "me",
    requestBody: {
      name,
      labelListVisibility: "labelShow",
      messageListVisibility: "show",
      ...(color ? { color } : {}),
    },
  });
  return res.data.id!;
}

export async function updateLabel(
  gmail: gmail_v1.Gmail,
  id: string,
  opts: { name?: string; color?: { backgroundColor: string; textColor: string } | null },
): Promise<void> {
  await gmail.users.labels.patch({
    userId: "me",
    id,
    requestBody: {
      ...(opts.name ? { name: opts.name } : {}),
      ...(opts.color === null ? { color: undefined } : opts.color ? { color: opts.color } : {}),
    },
  });
}

export async function deleteLabel(gmail: gmail_v1.Gmail, id: string): Promise<void> {
  await gmail.users.labels.delete({ userId: "me", id });
}

// Gmail-allowed color palette — full set of background+text pairs Gmail accepts.
// Anything outside this list will be rejected by the API.
export const LABEL_COLOR_PALETTE: { bg: string; text: string }[] = [
  // Grayscale
  { bg: "#ffffff", text: "#000000" },
  { bg: "#cccccc", text: "#000000" },
  { bg: "#efefef", text: "#000000" },
  { bg: "#999999", text: "#000000" },
  { bg: "#666666", text: "#ffffff" },
  { bg: "#434343", text: "#ffffff" },
  { bg: "#000000", text: "#ffffff" },
  // Pastels
  { bg: "#fcdee8", text: "#83334c" },
  { bg: "#fbd3e0", text: "#711a36" },
  { bg: "#fce8b3", text: "#594c05" },
  { bg: "#fef1d1", text: "#684e07" },
  { bg: "#fdedc1", text: "#684e07" },
  { bg: "#b3efd3", text: "#04502e" },
  { bg: "#a2dcc1", text: "#0b4f30" },
  { bg: "#c6f3de", text: "#0b804b" },
  { bg: "#b6cff5", text: "#0d3472" },
  { bg: "#98d7e4", text: "#0d3b44" },
  { bg: "#c9daf8", text: "#1c4587" },
  { bg: "#e3d7ff", text: "#3d188e" },
  { bg: "#e4d7f5", text: "#41236d" },
  // Lights
  { bg: "#f6c5be", text: "#cc3a21" },
  { bg: "#ffc8af", text: "#7a2e0b" },
  { bg: "#ffdeb5", text: "#7a4706" },
  { bg: "#fbc8d9", text: "#711a36" },
  { bg: "#f2b2a8", text: "#8a1c0a" },
  // Vivid
  { bg: "#fb4c2f", text: "#ffffff" },
  { bg: "#ffad47", text: "#ffffff" },
  { bg: "#fad165", text: "#000000" },
  { bg: "#16a766", text: "#ffffff" },
  { bg: "#43d692", text: "#000000" },
  { bg: "#4a86e8", text: "#ffffff" },
  { bg: "#2da2bb", text: "#ffffff" },
  { bg: "#a479e2", text: "#ffffff" },
  { bg: "#b99aff", text: "#000000" },
  { bg: "#f691b3", text: "#000000" },
  { bg: "#ff7537", text: "#ffffff" },
  // Mediums
  { bg: "#cc3a21", text: "#ffffff" },
  { bg: "#eaa041", text: "#ffffff" },
  { bg: "#f2c960", text: "#000000" },
  { bg: "#149e60", text: "#ffffff" },
  { bg: "#3dc789", text: "#000000" },
  { bg: "#3c78d8", text: "#ffffff" },
  { bg: "#8e63ce", text: "#ffffff" },
  { bg: "#e07798", text: "#ffffff" },
  // Darks
  { bg: "#ac2b16", text: "#ffffff" },
  { bg: "#cf8933", text: "#ffffff" },
  { bg: "#d5ae49", text: "#000000" },
  { bg: "#0b804b", text: "#ffffff" },
  { bg: "#2a9c68", text: "#ffffff" },
  { bg: "#285bac", text: "#ffffff" },
  { bg: "#653e9b", text: "#ffffff" },
  { bg: "#b65775", text: "#ffffff" },
  // Deepest
  { bg: "#822111", text: "#ffffff" },
  { bg: "#a46a21", text: "#ffffff" },
  { bg: "#aa8831", text: "#ffffff" },
  { bg: "#076239", text: "#ffffff" },
  { bg: "#1a764d", text: "#ffffff" },
  { bg: "#1c4587", text: "#ffffff" },
  { bg: "#41236d", text: "#ffffff" },
  { bg: "#83334c", text: "#ffffff" },
];

// Pick contrasting text color for a custom background using YIQ luminance.
export function pickTextColor(bgHex: string): string {
  const hex = bgHex.replace("#", "");
  if (hex.length !== 6) return "#000000";
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? "#000000" : "#ffffff";
}
