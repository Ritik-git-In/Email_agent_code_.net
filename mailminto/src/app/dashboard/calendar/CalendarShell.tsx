"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import {
  type View,
  VIEWS,
  navigateDate,
  viewLabel,
  parseDateParam,
  dateToParam,
  isToday,
  isSameDay,
  startOfMonth,
  startOfWeek,
  addDays,
} from "./dateUtils";
import { MonthView } from "./MonthView";
import { WeekView } from "./WeekView";
import { DayView } from "./DayView";
import { AgendaView } from "./AgendaView";
import { EventModal, type EventModalEvent } from "./EventModal";
import { UpcomingPanel } from "./UpcomingPanel";

type Calendar = {
  id: string;
  summary: string;
  primary: boolean;
  backgroundColor: string;
  selected: boolean;
};

export function CalendarShell({
  view,
  dateParam,
  events,
  accounts,
  defaultAccountId,
  calendars,
}: {
  view: View;
  dateParam: string;
  events: EventModalEvent[];
  accounts: { id: string; email: string }[];
  defaultAccountId: string;
  calendars: Calendar[];
}) {
  const router = useRouter();
  const focal = useMemo(() => parseDateParam(dateParam), [dateParam]);
  const [hiddenCalendars, setHiddenCalendars] = useState<Set<string>>(new Set());
  const [modal, setModal] = useState<
    | { kind: "view"; event: EventModalEvent }
    | { kind: "create"; date: Date }
    | null
  >(null);

  const filteredEvents = events.filter((ev) => !hiddenCalendars.has(ev.calendarId));

  function go(view: View, date: Date) {
    const params = new URLSearchParams();
    params.set("view", view);
    params.set("date", dateToParam(date));
    router.push(`/dashboard/calendar?${params.toString()}`);
  }

  function changeView(v: View) {
    go(v, focal);
  }

  function navigate(direction: -1 | 1) {
    go(view, navigateDate(view, focal, direction));
  }

  function goToday() {
    go(view, new Date());
  }

  function onEventClick(ev: EventModalEvent) {
    setModal({ kind: "view", event: ev });
  }

  function onSlotClick(d: Date) {
    setModal({ kind: "create", date: d });
  }

  function onDayClick(d: Date) {
    if (view === "month") {
      go("day", d);
    } else {
      const noon = new Date(d);
      noon.setHours(12, 0, 0, 0);
      setModal({ kind: "create", date: noon });
    }
  }

  function toggleCalendar(id: string) {
    setHiddenCalendars((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function closeModal() {
    setModal(null);
    router.refresh();
  }

  return (
    <div className="grid grid-cols-[260px_1fr] gap-6">
      <aside className="space-y-6">
        <button
          onClick={() => setModal({ kind: "create", date: new Date() })}
          className="inline-flex items-center gap-2 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-5 py-2.5 text-sm font-medium hover:opacity-90 shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Create
        </button>

        <MiniMonth focal={focal} onPick={(d) => go(view, d)} events={filteredEvents} />

        <UpcomingPanel events={filteredEvents} onEventClick={onEventClick} />

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-2">
            My calendars
          </h3>
          <ul className="space-y-1.5">
            {calendars.map((c) => {
              const hidden = hiddenCalendars.has(c.id);
              return (
                <li key={c.id}>
                  <button
                    onClick={() => toggleCalendar(c.id)}
                    className="flex items-center gap-2 w-full text-left text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md px-2 py-1"
                  >
                    <span
                      className="inline-block h-3 w-3 rounded-sm shrink-0 border border-zinc-300 dark:border-zinc-600"
                      style={{
                        backgroundColor: hidden ? "transparent" : c.backgroundColor,
                      }}
                    />
                    <span className="truncate">{c.summary}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </aside>

      <div className="min-w-0 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              onClick={goToday}
              className="rounded-full border border-zinc-300 dark:border-zinc-700 px-3 py-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Today
            </button>
            <div className="flex items-center">
              <button
                onClick={() => navigate(-1)}
                className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                aria-label="Previous"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => navigate(1)}
                className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                aria-label="Next"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <h2 className="text-xl font-semibold capitalize">{viewLabel(view, focal)}</h2>
          </div>

          <div className="flex items-center rounded-full border border-zinc-200 dark:border-zinc-800 p-0.5">
            {VIEWS.map((v) => (
              <button
                key={v}
                onClick={() => changeView(v)}
                className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
                  v === view
                    ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {view === "month" && (
          <MonthView
            focal={focal}
            events={filteredEvents}
            onEventClick={onEventClick}
            onDayClick={onDayClick}
          />
        )}
        {view === "week" && (
          <WeekView
            focal={focal}
            events={filteredEvents}
            onEventClick={onEventClick}
            onSlotClick={onSlotClick}
          />
        )}
        {view === "day" && (
          <DayView
            focal={focal}
            events={filteredEvents}
            onEventClick={onEventClick}
            onSlotClick={onSlotClick}
          />
        )}
        {view === "agenda" && (
          <AgendaView events={filteredEvents} onEventClick={onEventClick} />
        )}
      </div>

      {modal && (
        <EventModal
          event={modal.kind === "view" ? modal.event : null}
          initialDate={modal.kind === "create" ? modal.date : undefined}
          accounts={accounts}
          defaultAccountId={defaultAccountId}
          calendars={calendars.map((c) => ({
            id: c.id,
            summary: c.summary,
            backgroundColor: c.backgroundColor,
          }))}
          onClose={closeModal}
        />
      )}
    </div>
  );
}

function MiniMonth({
  focal,
  onPick,
  events,
}: {
  focal: Date;
  onPick: (d: Date) => void;
  events: EventModalEvent[];
}) {
  const start = startOfWeek(startOfMonth(focal));
  const days = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  const eventDays = new Set(
    events.map((e) => new Date(e.start).toDateString()),
  );

  return (
    <div>
      <div className="text-sm font-semibold mb-2">
        {focal.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] text-zinc-500 mb-1">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {days.map((d, i) => {
          const inMonth = d.getMonth() === focal.getMonth();
          const today = isToday(d);
          const selected = isSameDay(d, focal);
          const hasEvents = eventDays.has(d.toDateString());
          return (
            <button
              key={i}
              onClick={() => onPick(d)}
              className={`relative h-7 text-xs rounded-full ${
                today
                  ? "bg-blue-600 text-white"
                  : selected
                    ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
                    : inMonth
                      ? "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      : "text-zinc-400 dark:text-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              }`}
            >
              {d.getDate()}
              {hasEvents && !today && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-blue-500" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
