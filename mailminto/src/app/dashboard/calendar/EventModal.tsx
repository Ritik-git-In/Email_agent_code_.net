"use client";

import { useState, useTransition, useEffect } from "react";
import {
  X,
  Loader2,
  Trash2,
  MapPin,
  Users,
  Calendar as CalendarIcon,
  ExternalLink,
  Pencil,
  Save,
} from "lucide-react";
import { createEventAction, updateEventAction, deleteEventAction } from "./actions";

export type EventModalEvent = {
  id: string;
  calendarId: string;
  calendarName: string;
  calendarColor: string;
  summary: string;
  description: string;
  start: string; // ISO
  end: string; // ISO
  isAllDay: boolean;
  location: string;
  attendees: string[];
  htmlLink: string;
};

type Mode = "view" | "edit" | "create";

export function EventModal({
  event,
  initialDate,
  accounts,
  defaultAccountId,
  calendars,
  onClose,
}: {
  event: EventModalEvent | null;
  initialDate?: Date;
  accounts: { id: string; email: string }[];
  defaultAccountId: string;
  calendars: { id: string; summary: string; backgroundColor: string }[];
  onClose: () => void;
}) {
  const [mode, setMode] = useState<Mode>(event ? "view" : "create");
  const [accountId, setAccountId] = useState(defaultAccountId);
  const [calendarId, setCalendarId] = useState(event?.calendarId ?? "primary");
  const [summary, setSummary] = useState(event?.summary ?? "");
  const [description, setDescription] = useState(event?.description ?? "");
  const [location, setLocation] = useState(event?.location ?? "");
  const [attendees, setAttendees] = useState(event?.attendees.join(", ") ?? "");
  const [allDay, setAllDay] = useState(event?.isAllDay ?? false);
  const [start, setStart] = useState(
    event ? toLocalInput(new Date(event.start), event.isAllDay) : toLocalInput(initialDate ?? new Date(), false),
  );
  const [end, setEnd] = useState(
    event
      ? toLocalInput(new Date(event.end), event.isAllDay)
      : toLocalInput(new Date((initialDate ?? new Date()).getTime() + 60 * 60 * 1000), false),
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function toIso(local: string, isAllDay: boolean): string {
    if (isAllDay) {
      const [y, m, d] = local.split("-").map(Number);
      return new Date(y, m - 1, d).toISOString();
    }
    return new Date(local).toISOString();
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const fd = new FormData();
    fd.set("account_id", accountId);
    fd.set("calendar_id", calendarId);
    fd.set("summary", summary);
    fd.set("description", description);
    fd.set("location", location);
    fd.set("attendees", attendees);
    if (allDay) fd.set("all_day", "on");
    fd.set("start", toIso(start, allDay));
    fd.set("end", toIso(end, allDay));

    startTransition(async () => {
      let res;
      if (event && mode === "edit") {
        fd.set("event_id", event.id);
        res = await updateEventAction(fd);
      } else {
        res = await createEventAction(fd);
      }
      if (!res.ok) setError(res.error);
      else onClose();
    });
  }

  function onDelete() {
    if (!event) return;
    if (!confirm(`Delete "${event.summary}"?`)) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteEventAction(accountId, event.id, event.calendarId);
      if (!res.ok) setError(res.error);
      else onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl bg-white dark:bg-zinc-900 shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-5 py-3">
          <h2 className="font-semibold">
            {mode === "create" ? "New event" : mode === "edit" ? "Edit event" : event?.summary}
          </h2>
          <div className="flex items-center gap-1">
            {mode === "view" && event && (
              <>
                <button
                  onClick={() => setMode("edit")}
                  className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  aria-label="Edit"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={onDelete}
                  disabled={pending}
                  className="rounded-md p-1.5 text-zinc-500 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950 disabled:opacity-50"
                  aria-label="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {mode === "view" && event ? (
          <ViewBody event={event} />
        ) : (
          <form onSubmit={onSubmit} className="px-5 py-4 space-y-3">
            <div>
              <input
                type="text"
                required
                placeholder="Add title"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className="w-full bg-transparent text-lg font-medium placeholder:text-zinc-400 outline-none border-b border-transparent focus:border-zinc-400 pb-2"
                autoFocus
              />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />
              All day
            </label>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-zinc-500">Start</label>
                <input
                  type={allDay ? "date" : "datetime-local"}
                  required
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-500">End</label>
                <input
                  type={allDay ? "date" : "datetime-local"}
                  required
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
                />
              </div>
            </div>

            {accounts.length > 1 && (
              <div>
                <label className="text-xs font-medium text-zinc-500">Account</label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.email}</option>
                  ))}
                </select>
              </div>
            )}

            {calendars.length > 0 && (
              <div>
                <label className="text-xs font-medium text-zinc-500">Calendar</label>
                <select
                  value={calendarId}
                  onChange={(e) => setCalendarId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
                >
                  {calendars.map((c) => (
                    <option key={c.id} value={c.id}>{c.summary}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-zinc-500">Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Office, address, or video link"
                className="mt-1 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-500">Guests (comma-separated)</label>
              <input
                type="text"
                value={attendees}
                onChange={(e) => setAttendees(e.target.value)}
                placeholder="alice@example.com, bob@example.com"
                className="mt-1 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-500">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800 -mx-5 px-5">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending}
                className="inline-flex items-center gap-2 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
              >
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {mode === "edit" ? "Save changes" : "Create"}
              </button>
            </div>
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          </form>
        )}
      </div>
    </div>
  );
}

function ViewBody({ event }: { event: EventModalEvent }) {
  const start = new Date(event.start);
  const end = new Date(event.end);
  const timeStr = event.isAllDay
    ? `${start.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} · all day`
    : `${start.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} · ${start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} – ${end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;

  return (
    <div className="px-5 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <span
          className="inline-block h-3 w-3 rounded-full shrink-0"
          style={{ backgroundColor: event.calendarColor }}
        />
        <div>
          <div className="text-sm">{timeStr}</div>
          {event.calendarName && (
            <div className="text-xs text-zinc-500 mt-0.5">{event.calendarName}</div>
          )}
        </div>
      </div>

      {event.location && (
        <div className="flex items-start gap-3">
          <MapPin className="h-4 w-4 mt-0.5 text-zinc-500 shrink-0" />
          <span className="text-sm">{event.location}</span>
        </div>
      )}

      {event.attendees.length > 0 && (
        <div className="flex items-start gap-3">
          <Users className="h-4 w-4 mt-0.5 text-zinc-500 shrink-0" />
          <div className="text-sm space-y-0.5">
            {event.attendees.map((a) => (
              <div key={a}>{a}</div>
            ))}
          </div>
        </div>
      )}

      {event.description && (
        <div className="flex items-start gap-3">
          <CalendarIcon className="h-4 w-4 mt-0.5 text-zinc-500 shrink-0" />
          <div className="text-sm whitespace-pre-wrap">{event.description}</div>
        </div>
      )}

      {event.htmlLink && (
        <a
          href={event.htmlLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Open in Google Calendar
        </a>
      )}
    </div>
  );
}

function toLocalInput(d: Date, isAllDay: boolean): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  if (isAllDay) {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
