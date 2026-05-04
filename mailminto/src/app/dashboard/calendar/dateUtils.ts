export type View = "month" | "week" | "day" | "agenda";

export const VIEWS: View[] = ["month", "week", "day", "agenda"];

export function isView(v: string | undefined): v is View {
  return v === "month" || v === "week" || v === "day" || v === "agenda";
}

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function startOfWeek(d: Date, weekStartsOn = 0): Date {
  const x = startOfDay(d);
  const day = x.getDay();
  const diff = (day - weekStartsOn + 7) % 7;
  x.setDate(x.getDate() - diff);
  return x;
}

export function endOfWeek(d: Date, weekStartsOn = 0): Date {
  const start = startOfWeek(d, weekStartsOn);
  return endOfDay(addDays(start, 6));
}

export function startOfMonth(d: Date): Date {
  const x = startOfDay(d);
  x.setDate(1);
  return x;
}

export function endOfMonth(d: Date): Date {
  const x = startOfMonth(d);
  x.setMonth(x.getMonth() + 1);
  x.setDate(0);
  return endOfDay(x);
}

export function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

export function addMonths(d: Date, months: number): Date {
  const x = new Date(d);
  x.setMonth(x.getMonth() + months);
  return x;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isToday(d: Date): boolean {
  return isSameDay(d, new Date());
}

export function getViewRange(view: View, focal: Date): { start: Date; end: Date } {
  switch (view) {
    case "month": {
      // Include leading/trailing days from prev/next months for full grid
      const monthStart = startOfMonth(focal);
      const monthEnd = endOfMonth(focal);
      return { start: startOfWeek(monthStart), end: endOfWeek(monthEnd) };
    }
    case "week":
      return { start: startOfWeek(focal), end: endOfWeek(focal) };
    case "day":
      return { start: startOfDay(focal), end: endOfDay(focal) };
    case "agenda":
      return { start: startOfDay(focal), end: endOfDay(addDays(focal, 30)) };
  }
}

export function navigateDate(view: View, focal: Date, direction: -1 | 1): Date {
  switch (view) {
    case "month":
      return addMonths(focal, direction);
    case "week":
      return addDays(focal, direction * 7);
    case "day":
      return addDays(focal, direction);
    case "agenda":
      return addDays(focal, direction * 30);
  }
}

export function viewLabel(view: View, focal: Date): string {
  switch (view) {
    case "month":
      return focal.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    case "week": {
      const start = startOfWeek(focal);
      const end = endOfWeek(focal);
      const sameMonth = start.getMonth() === end.getMonth();
      const sameYear = start.getFullYear() === end.getFullYear();
      const startFmt: Intl.DateTimeFormatOptions = sameMonth
        ? { day: "numeric" }
        : sameYear
          ? { month: "short", day: "numeric" }
          : { month: "short", day: "numeric", year: "numeric" };
      return (
        start.toLocaleDateString("en-US", startFmt) +
        " – " +
        end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      );
    }
    case "day":
      return focal.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    case "agenda":
      return "Next 30 days";
  }
}

export function parseDateParam(s: string | undefined | null): Date {
  if (!s) return new Date();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return new Date();
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export function dateToParam(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function eventsByDay(events: { start: Date; end: Date; isAllDay: boolean }[]): Map<string, number[]> {
  const map = new Map<string, number[]>();
  events.forEach((ev, idx) => {
    const start = startOfDay(ev.start);
    const end = ev.isAllDay ? startOfDay(new Date(ev.end.getTime() - 1)) : startOfDay(ev.end);
    let cursor = new Date(start);
    while (cursor <= end) {
      const key = dateToParam(cursor);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(idx);
      cursor = addDays(cursor, 1);
    }
  });
  return map;
}
