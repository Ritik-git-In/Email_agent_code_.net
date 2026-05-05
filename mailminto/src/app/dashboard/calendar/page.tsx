import Link from "next/link";
import { Calendar as CalendarIcon, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/user";
import { decrypt } from "@/lib/crypto";
import {
  calendarFromRefreshToken,
  listCalendars,
  listEventsRange,
  type CalendarEvent,
  type CalendarListEntry,
} from "@/lib/google/calendar";
import { getUserOAuthCreds } from "@/lib/gmail/creds";
import { CalendarShell } from "./CalendarShell";
import {
  isView,
  parseDateParam,
  getViewRange,
  type View,
} from "./dateUtils";
import type { EventModalEvent } from "./EventModal";

export const dynamic = "force-dynamic";

export default async function CalendarPage(props: {
  searchParams: Promise<{ view?: string; date?: string }>;
}) {
  const search = await props.searchParams;
  const view: View = isView(search.view) ? search.view : "month";
  const focal = parseDateParam(search.date);
  const range = getViewRange(view, focal);

  const user = await getCurrentUser();
  const supabase = await createClient();
  if (!user) return null;

  const { data: gmailAccounts } = await supabase
    .from("gmail_accounts")
    .select("id, email, refresh_token_encrypted")
    .eq("user_id", user.id);

  if (!gmailAccounts || gmailAccounts.length === 0) {
    return (
      <div className="px-8 py-10 max-w-4xl">
        <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
        <div className="mt-10 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 p-12 text-center">
          <CalendarIcon className="mx-auto h-8 w-8 text-zinc-400" />
          <p className="mt-3 text-zinc-500">
            Connect a Gmail account in <Link href="/dashboard/integrations" className="underline">Integrations</Link> first.
          </p>
        </div>
      </div>
    );
  }

  // Use first account (multi-account support TODO — pick from sidebar)
  const account = gmailAccounts[0];
  let calendars: CalendarListEntry[] = [];
  let events: CalendarEvent[] = [];
  let error: string | null = null;
  let needsReconnect = false;

  try {
    const oauthCreds = await getUserOAuthCreds(user.id, supabase);
    const cal = calendarFromRefreshToken(decrypt(account.refresh_token_encrypted), oauthCreds);
    calendars = await listCalendars(cal);
    events = await listEventsRange(cal, {
      timeMin: range.start,
      timeMax: range.end,
      calendarIds: calendars.filter((c) => c.selected).map((c) => c.id),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "fetch failed";
    error = message;
    needsReconnect =
      /insufficient/i.test(message) ||
      /scope/i.test(message) ||
      /unauthorized/i.test(message) ||
      /invalid_grant/i.test(message);
  }

  if (error) {
    return (
      <div className="px-8 py-10 max-w-4xl">
        <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
        <div className="mt-8 rounded-2xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950 p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <div>
              <h3 className="font-semibold text-amber-900 dark:text-amber-200">
                Calendar access required
              </h3>
              <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
                {needsReconnect ? (
                  <>
                    MailMinto needs Google Calendar permission. Disconnect this Gmail in{" "}
                    <Link href="/dashboard/integrations" className="underline font-medium">
                      Integrations
                    </Link>{" "}
                    and reconnect — the new flow asks for calendar access.
                  </>
                ) : (
                  error
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const modalEvents: EventModalEvent[] = events.map((ev) => ({
    id: ev.id,
    calendarId: ev.calendarId,
    calendarName: ev.calendarName,
    calendarColor: ev.calendarColor,
    summary: ev.summary,
    description: ev.description,
    start: ev.start.toISOString(),
    end: ev.end.toISOString(),
    isAllDay: ev.isAllDay,
    location: ev.location,
    attendees: ev.attendees,
    htmlLink: ev.htmlLink,
  }));

  return (
    <div className="px-6 py-6 max-w-[1400px]">
      <CalendarShell
        view={view}
        dateParam={search.date ?? ""}
        events={modalEvents}
        accounts={gmailAccounts.map((a) => ({ id: a.id, email: a.email }))}
        defaultAccountId={account.id}
        calendars={calendars.map((c) => ({
          id: c.id,
          summary: c.summary,
          primary: c.primary,
          backgroundColor: c.backgroundColor,
          selected: c.selected,
        }))}
      />
    </div>
  );
}
