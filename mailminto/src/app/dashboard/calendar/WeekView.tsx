"use client";

import { startOfWeek, addDays, isToday, isSameDay } from "./dateUtils";
import type { EventModalEvent } from "./EventModal";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HOUR_HEIGHT = 48; // px

export function WeekView({
  focal,
  events,
  onEventClick,
  onSlotClick,
}: {
  focal: Date;
  events: EventModalEvent[];
  onEventClick: (e: EventModalEvent) => void;
  onSlotClick: (d: Date) => void;
}) {
  const weekStart = startOfWeek(focal);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const allDayByDay: EventModalEvent[][] = days.map(() => []);
  const timedByDay: EventModalEvent[][] = days.map(() => []);
  const seenPerDay: Set<string>[] = days.map(() => new Set<string>());

  for (const ev of events) {
    const startD = new Date(ev.start);
    const endD = ev.isAllDay ? new Date(new Date(ev.end).getTime() - 1) : new Date(ev.end);
    const evKey = `${ev.calendarId}::${ev.id}`;
    days.forEach((day, i) => {
      const dayStart = new Date(day);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(day);
      dayEnd.setHours(23, 59, 59, 999);
      if (endD < dayStart || startD > dayEnd) return;
      if (seenPerDay[i].has(evKey)) return;
      seenPerDay[i].add(evKey);
      if (ev.isAllDay) allDayByDay[i].push(ev);
      else timedByDay[i].push(ev);
    });
  }

  const maxAllDayRows = Math.max(...allDayByDay.map((d) => d.length), 1);

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900">
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
        <div />
        {days.map((day) => {
          const today = isToday(day);
          return (
            <div key={day.toISOString()} className="px-2 py-2 text-center border-l border-zinc-200 dark:border-zinc-800">
              <div className="text-[10px] uppercase font-medium text-zinc-500">
                {day.toLocaleDateString("en-US", { weekday: "short" })}
              </div>
              <div
                className={`mt-0.5 inline-flex items-center justify-center text-sm font-semibold ${
                  today ? "h-7 w-7 rounded-full bg-blue-600 text-white" : "text-zinc-700 dark:text-zinc-300"
                }`}
              >
                {day.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      <div
        className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/20"
        style={{ minHeight: `${maxAllDayRows * 24 + 8}px` }}
      >
        <div className="text-[10px] text-zinc-500 px-2 py-1">all day</div>
        {allDayByDay.map((dayEvents, i) => (
          <div key={i} className="border-l border-zinc-200 dark:border-zinc-800 px-1 py-1 space-y-0.5">
            {dayEvents.map((ev, evIdx) => (
              <button
                key={`${i}-${evIdx}-${ev.id}`}
                onClick={() => onEventClick(ev)}
                className="w-full text-left truncate rounded px-1.5 py-0.5 text-[11px] font-medium text-white hover:opacity-90"
                style={{ backgroundColor: ev.calendarColor }}
                title={ev.summary}
              >
                {ev.summary}
              </button>
            ))}
          </div>
        ))}
      </div>

      <div className="relative grid grid-cols-[60px_repeat(7,1fr)]">
        <div>
          {HOURS.map((h) => (
            <div
              key={h}
              className="text-[10px] text-zinc-500 text-right pr-2 -mt-1.5"
              style={{ height: `${HOUR_HEIGHT}px` }}
            >
              {h === 0 ? "" : formatHour(h)}
            </div>
          ))}
        </div>
        {days.map((day, dayIdx) => (
          <div key={dayIdx} className="relative border-l border-zinc-200 dark:border-zinc-800">
            {HOURS.map((h) => (
              <div
                key={h}
                className="border-b border-zinc-100 dark:border-zinc-800/50 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/30"
                style={{ height: `${HOUR_HEIGHT}px` }}
                onClick={() => {
                  const d = new Date(day);
                  d.setHours(h, 0, 0, 0);
                  onSlotClick(d);
                }}
              />
            ))}
            {timedByDay[dayIdx].map((ev, evIdx) => {
              const start = new Date(ev.start);
              const end = new Date(ev.end);
              const dayStart = new Date(day);
              dayStart.setHours(0, 0, 0, 0);
              const dayEnd = new Date(day);
              dayEnd.setHours(23, 59, 59, 999);
              const eventStart = start < dayStart ? dayStart : start;
              const eventEnd = end > dayEnd ? dayEnd : end;
              const startMin = (eventStart.getTime() - dayStart.getTime()) / 60000;
              const durMin = Math.max(15, (eventEnd.getTime() - eventStart.getTime()) / 60000);
              const top = (startMin / 60) * HOUR_HEIGHT;
              const height = (durMin / 60) * HOUR_HEIGHT;
              return (
                <button
                  key={`${dayIdx}-${evIdx}-${ev.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEventClick(ev);
                  }}
                  className="absolute left-1 right-1 rounded px-1.5 py-1 text-left text-[11px] font-medium hover:opacity-95 overflow-hidden"
                  style={{
                    top: `${top}px`,
                    height: `${height}px`,
                    backgroundColor: ev.calendarColor,
                    color: "#ffffff",
                  }}
                  title={ev.summary}
                >
                  <div className="truncate font-semibold">{ev.summary}</div>
                  <div className="truncate text-[10px] opacity-90">
                    {start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function formatHour(h: number): string {
  if (h === 0) return "12 AM";
  if (h === 12) return "12 PM";
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}
