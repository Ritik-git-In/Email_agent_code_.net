import { NextResponse } from "next/server";
import { processUserEmails } from "@/lib/pipeline";

export const maxDuration = 60;

export async function POST() {
  try {
    const summaries = await processUserEmails();
    return NextResponse.json({ ok: true, summaries });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
