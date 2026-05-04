"use client";

import { MapPin, Users, ExternalLink } from "lucide-react";
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
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function formatEventTime(ev: EventModalEvent): string {
  const s = new Date(ev.start);
  const e = new Date(ev.end);
  if (ev.isAllDay) return "all day";
  return `${s.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} – ${e.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
}

export function AgendaView({
  events,
  onEventClick,
}: {
  events: EventModalEvent[];
  onEventClick: (e: EventModalEvent) => void;
}) {
  if (events.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 p-12 text-center text-sm text-zinc-500">
        No upcoming events.
      </div>
    );
  }

  const groups = new Map<string, { date: Date; events: EventModalEvent[] }>();
  for (const ev of events) {
    const key = new Date(ev.start).toDateString();
    if (!groups.has(key)) groups.set(key, { date: new Date(ev.start), events: [] });
    groups.get(key)!.events.push(ev);
  }
  const sorted = Array.from(groups.values()).sort((a, b) => a.date.getTime() - b.date.getTime());

  return (
    <div className="space-y-4">
      {sorted.map((group) => (
        <div key={group.date.toISOString()}>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-2">
            {dayLabel(group.date)}
          </h3>
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-200 dark:divide-zinc-800 overflow-hidden bg-white dark:bg-zinc-900">
            {group.events.map((ev, evIdx) => (
              <button
                key={`${evIdx}-${ev.id}`}
                onClick={() => onEventClick(ev)}
                className="w-full text-left px-5 py-3 flex items-start gap-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              >
                <span
                  className="mt-1.5 inline-block h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: ev.calendarColor }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{ev.summary}</span>
                    {ev.htmlLink && (
                      <ExternalLink className="h-3 w-3 text-zinc-400 shrink-0" />
                    )}
                  </div>
                  <div className="mt-0.5 text-xs text-zinc-500">{formatEventTime(ev)}</div>
                  <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-zinc-500">
                    {ev.location && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {ev.location}
                      </span>
                    )}
                    {ev.attendees.length > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {ev.attendees.length}{" "}
                        {ev.attendees.length === 1 ? "guest" : "guests"}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
