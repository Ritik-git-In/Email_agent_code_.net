"use client";

import { Clock, MapPin } from "lucide-react";
import type { EventModalEvent } from "./EventModal";

function dayLabel(d: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const eventDay = new Date(d);
  eventDay.setHours(0, 0, 0, 0);
  const diff = (eventDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff > 0 && diff < 7) return d.toLocaleDateString("en-US", { weekday: "long" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatTime(ev: EventModalEvent): string {
  if (ev.isAllDay) return "all day";
  const s = new Date(ev.start);
  return s.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function UpcomingPanel({
  events,
  onEventClick,
}: {
  events: EventModalEvent[];
  onEventClick: (ev: EventModalEvent) => void;
}) {
  const now = Date.now();
  const upcoming = events
    .filter((ev) => new Date(ev.end).getTime() >= now)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    .slice(0, 6);

  // Group by day
  const groups = new Map<string, { date: Date; events: EventModalEvent[] }>();
  for (const ev of upcoming) {
    const start = new Date(ev.start);
    const key = start.toDateString();
    if (!groups.has(key)) groups.set(key, { date: start, events: [] });
    groups.get(key)!.events.push(ev);
  }

  if (upcoming.length === 0) {
    return (
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-2">
          Upcoming
        </h3>
        <p className="text-xs text-zinc-500 italic">Nothing scheduled. Click + Create to add an event.</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-2">
        Upcoming · {upcoming.length}
      </h3>
      <div className="space-y-3">
        {Array.from(groups.values()).map((group) => (
          <div key={group.date.toISOString()}>
            <div className="text-[10px] font-semibold uppercase text-zinc-400 mb-1">
              {dayLabel(group.date)}
            </div>
            <ul className="space-y-1">
              {group.events.map((ev, i) => (
                <li key={`${i}-${ev.id}`}>
                  <button
                    onClick={() => onEventClick(ev)}
                    className="group w-full text-left rounded-md px-2 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className="mt-1 inline-block h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: ev.calendarColor }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium truncate group-hover:text-zinc-900 dark:group-hover:text-zinc-100">
                          {ev.summary}
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-zinc-500">
                          <span className="inline-flex items-center gap-0.5">
                            <Clock className="h-2.5 w-2.5" />
                            {formatTime(ev)}
                          </span>
                          {ev.location && (
                            <span className="inline-flex items-center gap-0.5 truncate">
                              <MapPin className="h-2.5 w-2.5 shrink-0" />
                              <span className="truncate">{ev.location}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
