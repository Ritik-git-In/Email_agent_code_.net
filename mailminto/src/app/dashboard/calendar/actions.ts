"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/crypto";
import {
  calendarFromRefreshToken,
  createEvent,
  updateEvent,
  deleteEvent,
} from "@/lib/google/calendar";
import { getUserOAuthCreds } from "@/lib/gmail/creds";

type Result = { ok: true; eventId?: string } | { ok: false; error: string };

async function getCalendar(accountId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not authenticated" };

  const { data } = await supabase
    .from("gmail_accounts")
    .select("refresh_token_encrypted")
    .eq("id", accountId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!data) return { ok: false as const, error: "Calendar account not found" };

  try {
    const oauthCreds = await getUserOAuthCreds(user.id, supabase);
    return {
      ok: true as const,
      cal: calendarFromRefreshToken(decrypt(data.refresh_token_encrypted), oauthCreds),
    };
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : "creds_missing" };
  }
}

function parseAttendees(s: string): string[] {
  return s
    ? s.split(/[,\s]+/).map((e) => e.trim()).filter(Boolean)
    : [];
}

export async function createEventAction(formData: FormData): Promise<Result> {
  const accountId = String(formData.get("account_id") ?? "");
  const calendarId = String(formData.get("calendar_id") ?? "primary");
  const summary = String(formData.get("summary") ?? "").trim();
  const description = String(formData.get("description") ?? "");
  const isAllDay = formData.get("all_day") === "on";
  const startStr = String(formData.get("start") ?? "");
  const endStr = String(formData.get("end") ?? "");
  const location = String(formData.get("location") ?? "");
  const attendeesStr = String(formData.get("attendees") ?? "");

  if (!summary) return { ok: false, error: "Title is required" };
  if (!startStr || !endStr) return { ok: false, error: "Start and end times required" };

  const start = new Date(startStr);
  const end = new Date(endStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { ok: false, error: "Invalid date format" };
  }
  if (end <= start) return { ok: false, error: "End must be after start" };

  const ctx = await getCalendar(accountId);
  if (!ctx.ok) return ctx;

  try {
    const eventId = await createEvent(ctx.cal, {
      calendarId,
      summary,
      description,
      start,
      end,
      isAllDay,
      location: location || undefined,
      attendees: parseAttendees(attendeesStr),
    });
    revalidatePath("/dashboard/calendar");
    return { ok: true, eventId };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "create failed" };
  }
}

export async function updateEventAction(formData: FormData): Promise<Result> {
  const accountId = String(formData.get("account_id") ?? "");
  const calendarId = String(formData.get("calendar_id") ?? "primary");
  const eventId = String(formData.get("event_id") ?? "");
  const summary = String(formData.get("summary") ?? "").trim();
  const description = String(formData.get("description") ?? "");
  const isAllDay = formData.get("all_day") === "on";
  const startStr = String(formData.get("start") ?? "");
  const endStr = String(formData.get("end") ?? "");
  const location = String(formData.get("location") ?? "");
  const attendeesStr = String(formData.get("attendees") ?? "");

  if (!eventId) return { ok: false, error: "Event ID missing" };
  if (!summary) return { ok: false, error: "Title is required" };

  const start = new Date(startStr);
  const end = new Date(endStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { ok: false, error: "Invalid date format" };
  }

  const ctx = await getCalendar(accountId);
  if (!ctx.ok) return ctx;

  try {
    await updateEvent(ctx.cal, {
      calendarId,
      eventId,
      summary,
      description,
      start,
      end,
      isAllDay,
      location: location || undefined,
      attendees: parseAttendees(attendeesStr),
    });
    revalidatePath("/dashboard/calendar");
    return { ok: true, eventId };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "update failed" };
  }
}

export async function deleteEventAction(
  accountId: string,
  eventId: string,
  calendarId = "primary",
): Promise<Result> {
  const ctx = await getCalendar(accountId);
  if (!ctx.ok) return ctx;
  try {
    await deleteEvent(ctx.cal, eventId, calendarId);
    revalidatePath("/dashboard/calendar");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "delete failed" };
  }
}
