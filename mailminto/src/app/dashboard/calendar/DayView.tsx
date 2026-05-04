"use client";

import { isToday } from "./dateUtils";
import type { EventModalEvent } from "./EventModal";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HOUR_HEIGHT = 56;

export function DayView({
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
  const dayStart = new Date(focal);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(focal);
  dayEnd.setHours(23, 59, 59, 999);

  const allDay: EventModalEvent[] = [];
  const timed: EventModalEvent[] = [];
  const seen = new Set<string>();
  for (const ev of events) {
    const start = new Date(ev.start);
    const end = ev.isAllDay ? new Date(new Date(ev.end).getTime() - 1) : new Date(ev.end);
    if (end < dayStart || start > dayEnd) continue;
    const key = `${ev.calendarId}::${ev.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (ev.isAllDay) allDay.push(ev);
    else timed.push(ev);
  }

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900">
      <div className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 px-5 py-3">
        <div className="flex items-baseline gap-3">
          <div className="text-xs uppercase font-medium text-zinc-500">
            {focal.toLocaleDateString("en-US", { weekday: "long" })}
          </div>
          <div
            className={`text-2xl font-semibold ${
              isToday(focal) ? "text-blue-600 dark:text-blue-400" : ""
            }`}
          >
            {focal.toLocaleDateString("en-US", { month: "long", day: "numeric" })}
          </div>
        </div>
      </div>

      {allDay.length > 0 && (
        <div className="border-b border-zinc-200 dark:border-zinc-800 px-5 py-2 bg-zinc-50/50 dark:bg-zinc-800/20 space-y-1">
          <div className="text-[10px] text-zinc-500 uppercase">all day</div>
          {allDay.map((ev, evIdx) => (
            <button
              key={`ad-${evIdx}-${ev.id}`}
              onClick={() => onEventClick(ev)}
              className="block w-full text-left rounded px-2 py-1 text-sm font-medium text-white hover:opacity-90"
              style={{ backgroundColor: ev.calendarColor }}
            >
              {ev.summary}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-[80px_1fr]">
        <div>
          {HOURS.map((h) => (
            <div
              key={h}
              className="text-xs text-zinc-500 text-right pr-3 -mt-2"
              style={{ height: `${HOUR_HEIGHT}px` }}
            >
              {h === 0 ? "" : formatHour(h)}
            </div>
          ))}
        </div>
        <div className="relative border-l border-zinc-200 dark:border-zinc-800">
          {HOURS.map((h) => (
            <div
              key={h}
              className="border-b border-zinc-100 dark:border-zinc-800/50 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/30"
              style={{ height: `${HOUR_HEIGHT}px` }}
              onClick={() => {
                const d = new Date(focal);
                d.setHours(h, 0, 0, 0);
                onSlotClick(d);
              }}
            />
          ))}
          {timed.map((ev, evIdx) => {
            const start = new Date(ev.start);
            const end = new Date(ev.end);
            const eventStart = start < dayStart ? dayStart : start;
            const eventEnd = end > dayEnd ? dayEnd : end;
            const startMin = (eventStart.getTime() - dayStart.getTime()) / 60000;
            const durMin = Math.max(20, (eventEnd.getTime() - eventStart.getTime()) / 60000);
            const top = (startMin / 60) * HOUR_HEIGHT;
            const height = (durMin / 60) * HOUR_HEIGHT;
            return (
              <button
                key={`tm-${evIdx}-${ev.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onEventClick(ev);
                }}
                className="absolute left-2 right-2 rounded-lg px-2 py-1.5 text-left text-sm font-medium hover:opacity-95 overflow-hidden shadow-sm"
                style={{
                  top: `${top}px`,
                  height: `${height}px`,
                  backgroundColor: ev.calendarColor,
                  color: "#ffffff",
                }}
              >
                <div className="truncate font-semibold">{ev.summary}</div>
                <div className="truncate text-xs opacity-90">
                  {start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                  {" – "}
                  {end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                </div>
                {ev.location && height >= HOUR_HEIGHT && (
                  <div className="truncate text-xs opacity-90 mt-0.5">📍 {ev.location}</div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function formatHour(h: number): string {
  if (h === 0) return "12 AM";
  if (h === 12) return "12 PM";
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}
