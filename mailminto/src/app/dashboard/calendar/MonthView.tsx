"use client";

import { startOfMonth, startOfWeek, addDays, isToday, isSameDay } from "./dateUtils";
import type { EventModalEvent } from "./EventModal";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function MonthView({
  focal,
  events,
  onEventClick,
  onDayClick,
}: {
  focal: Date;
  events: EventModalEvent[];
  onEventClick: (e: EventModalEvent) => void;
  onDayClick: (d: Date) => void;
}) {
  const monthStart = startOfMonth(focal);
  const gridStart = startOfWeek(monthStart);
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) days.push(addDays(gridStart, i));

  const eventsByKey = new Map<string, EventModalEvent[]>();
  const seenPerDay = new Map<string, Set<string>>();
  for (const ev of events) {
    const start = new Date(ev.start);
    const end = ev.isAllDay ? new Date(new Date(ev.end).getTime() - 1) : new Date(ev.end);
    let cur = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    while (cur <= last) {
      const key = cur.toDateString();
      if (!seenPerDay.has(key)) seenPerDay.set(key, new Set());
      const seen = seenPerDay.get(key)!;
      const evKey = `${ev.calendarId}::${ev.id}`;
      if (!seen.has(evKey)) {
        seen.add(evKey);
        if (!eventsByKey.has(key)) eventsByKey.set(key, []);
        eventsByKey.get(key)!.push(ev);
      }
      cur = addDays(cur, 1);
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900">
      <div className="grid grid-cols-7 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
        {WEEKDAYS.map((d) => (
          <div key={d} className="px-2 py-2 text-xs font-medium text-zinc-500 text-center">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 grid-rows-6">
        {days.map((day, idx) => {
          const inMonth = day.getMonth() === focal.getMonth();
          const today = isToday(day);
          const dayEvents = eventsByKey.get(day.toDateString()) ?? [];
          return (
            <div
              key={idx}
              className={`min-h-[110px] border-r border-b border-zinc-200 dark:border-zinc-800 p-1.5 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/30 ${
                idx % 7 === 6 ? "border-r-0" : ""
              } ${idx >= 35 ? "border-b-0" : ""}`}
              onClick={() => onDayClick(day)}
            >
              <div className="flex justify-end">
                <span
                  className={`inline-flex items-center justify-center text-xs font-medium ${
                    today
                      ? "h-6 w-6 rounded-full bg-blue-600 text-white"
                      : inMonth
                        ? "text-zinc-700 dark:text-zinc-300"
                        : "text-zinc-400 dark:text-zinc-600"
                  }`}
                >
                  {day.getDate()}
                </span>
              </div>
              <div className="mt-1 space-y-0.5">
                {dayEvents.slice(0, 3).map((ev, evIdx) => (
                  <button
                    key={`${idx}-${evIdx}-${ev.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(ev);
                    }}
                    className="w-full text-left truncate rounded px-1.5 py-0.5 text-[11px] font-medium hover:opacity-90"
                    style={{
                      backgroundColor: ev.isAllDay ? ev.calendarColor : "transparent",
                      color: ev.isAllDay ? "#ffffff" : ev.calendarColor,
                    }}
                    title={ev.summary}
                  >
                    {!ev.isAllDay && (
                      <span
                        className="inline-block h-2 w-2 rounded-full mr-1.5 align-middle"
                        style={{ backgroundColor: ev.calendarColor }}
                      />
                    )}
                    {!ev.isAllDay && (
                      <span className="text-zinc-500 mr-1">
                        {new Date(ev.start).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
                    {ev.summary}
                  </button>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-[11px] text-zinc-500 px-1.5">
                    +{dayEvents.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
