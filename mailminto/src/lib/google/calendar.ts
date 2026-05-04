import { google, type calendar_v3 } from "googleapis";
import { createOAuthClient } from "@/lib/gmail/oauth";

export type CalendarEvent = {
  id: string;
  calendarId: string;
  calendarName: string;
  calendarColor: string;
  summary: string;
  description: string;
  start: Date;
  end: Date;
  isAllDay: boolean;
  location: string;
  attendees: string[];
  htmlLink: string;
  organizer: string;
  status: string;
};

export type CalendarListEntry = {
  id: string;
  summary: string;
  primary: boolean;
  accessRole: string;
  backgroundColor: string;
  foregroundColor: string;
  selected: boolean;
};

export function calendarFromRefreshToken(refreshToken: string): calendar_v3.Calendar {
  const oauth = createOAuthClient();
  oauth.setCredentials({ refresh_token: refreshToken });
  return google.calendar({ version: "v3", auth: oauth });
}

function parseEventTime(t?: calendar_v3.Schema$EventDateTime): { date: Date; isAllDay: boolean } {
  if (t?.dateTime) return { date: new Date(t.dateTime), isAllDay: false };
  if (t?.date) return { date: new Date(t.date), isAllDay: true };
  return { date: new Date(0), isAllDay: false };
}

export async function listCalendars(cal: calendar_v3.Calendar): Promise<CalendarListEntry[]> {
  const res = await cal.calendarList.list({ minAccessRole: "reader" });
  return (res.data.items ?? []).map((c) => ({
    id: c.id ?? "",
    summary: c.summaryOverride || c.summary || c.id || "(no name)",
    primary: !!c.primary,
    accessRole: c.accessRole ?? "reader",
    backgroundColor: c.backgroundColor ?? "#9fc6e7",
    foregroundColor: c.foregroundColor ?? "#000000",
    selected: c.selected !== false,
  }));
}

export async function listUpcomingEvents(
  cal: calendar_v3.Calendar,
  opts: { calendarId?: string; timeMin?: Date; timeMax?: Date; maxResults?: number } = {},
): Promise<CalendarEvent[]> {
  const calendarId = opts.calendarId ?? "primary";
  const res = await cal.events.list({
    calendarId,
    timeMin: (opts.timeMin ?? new Date()).toISOString(),
    timeMax: (opts.timeMax ?? new Date(Date.now() + 30 * 24 * 3600 * 1000)).toISOString(),
    maxResults: opts.maxResults ?? 50,
    singleEvents: true,
    orderBy: "startTime",
  });

  return (res.data.items ?? []).map((ev) =>
    mapEvent(ev, { id: calendarId, summary: "", color: "#9fc6e7" }),
  );
}

function mapEvent(
  ev: calendar_v3.Schema$Event,
  cal: { id: string; summary: string; color: string },
): CalendarEvent {
  const start = parseEventTime(ev.start ?? undefined);
  const end = parseEventTime(ev.end ?? undefined);
  return {
    id: ev.id ?? "",
    calendarId: cal.id,
    calendarName: cal.summary,
    calendarColor: cal.color,
    summary: ev.summary ?? "(no title)",
    description: ev.description ?? "",
    start: start.date,
    end: end.date,
    isAllDay: start.isAllDay,
    location: ev.location ?? "",
    attendees: (ev.attendees ?? []).map((a) => a.email ?? "").filter(Boolean),
    htmlLink: ev.htmlLink ?? "",
    organizer: ev.organizer?.email ?? "",
    status: ev.status ?? "confirmed",
  };
}

export async function listEventsRange(
  cal: calendar_v3.Calendar,
  opts: { timeMin: Date; timeMax: Date; calendarIds?: string[] },
): Promise<CalendarEvent[]> {
  const calendars = opts.calendarIds
    ? opts.calendarIds.map((id) => ({
        id,
        summary: "",
        color: "#9fc6e7",
      }))
    : (await listCalendars(cal))
        .filter((c) => c.selected)
        .map((c) => ({ id: c.id, summary: c.summary, color: c.backgroundColor }));

  const all = await Promise.all(
    calendars.map(async (c) => {
      try {
        const res = await cal.events.list({
          calendarId: c.id,
          timeMin: opts.timeMin.toISOString(),
          timeMax: opts.timeMax.toISOString(),
          maxResults: 250,
          singleEvents: true,
          orderBy: "startTime",
        });
        return (res.data.items ?? []).map((ev) => mapEvent(ev, c));
      } catch {
        return [];
      }
    }),
  );

  // Dedupe by calendarId::id — Google can return the same event under both
  // "primary" and the actual email-as-id when both are listed.
  const seen = new Set<string>();
  const deduped: CalendarEvent[] = [];
  for (const ev of all.flat()) {
    const key = `${ev.calendarId}::${ev.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(ev);
  }
  return deduped.sort((a, b) => a.start.getTime() - b.start.getTime());
}

export async function createEvent(
  cal: calendar_v3.Calendar,
  opts: {
    calendarId?: string;
    summary: string;
    description?: string;
    start: Date;
    end: Date;
    isAllDay?: boolean;
    location?: string;
    attendees?: string[];
  },
): Promise<string> {
  const dateField = (d: Date) =>
    opts.isAllDay
      ? { date: d.toISOString().slice(0, 10) }
      : { dateTime: d.toISOString() };

  const res = await cal.events.insert({
    calendarId: opts.calendarId ?? "primary",
    requestBody: {
      summary: opts.summary,
      description: opts.description,
      location: opts.location,
      start: dateField(opts.start),
      end: dateField(opts.end),
      attendees: opts.attendees?.map((email) => ({ email })),
    },
  });
  return res.data.id!;
}

export async function updateEvent(
  cal: calendar_v3.Calendar,
  opts: {
    calendarId: string;
    eventId: string;
    summary: string;
    description?: string;
    start: Date;
    end: Date;
    isAllDay?: boolean;
    location?: string;
    attendees?: string[];
  },
): Promise<void> {
  const dateField = (d: Date) =>
    opts.isAllDay
      ? { date: d.toISOString().slice(0, 10) }
      : { dateTime: d.toISOString() };

  await cal.events.patch({
    calendarId: opts.calendarId,
    eventId: opts.eventId,
    requestBody: {
      summary: opts.summary,
      description: opts.description,
      location: opts.location,
      start: dateField(opts.start),
      end: dateField(opts.end),
      attendees: opts.attendees?.map((email) => ({ email })),
    },
  });
}

export async function deleteEvent(
  cal: calendar_v3.Calendar,
  eventId: string,
  calendarId = "primary",
): Promise<void> {
  await cal.events.delete({ calendarId, eventId });
}
