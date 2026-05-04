import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { processForUserId } from "@/lib/pipeline";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data: users, error: usersError } = await supabase
    .from("gmail_accounts")
    .select("user_id")
    .order("user_id");
  if (usersError) {
    return NextResponse.json({ ok: false, error: usersError.message }, { status: 500 });
  }

  const uniqueUserIds = Array.from(new Set((users ?? []).map((u) => u.user_id)));

  const results: { user_id: string; ok: boolean; summary?: unknown; error?: string }[] = [];
  for (const userId of uniqueUserIds) {
    try {
      const summary = await processForUserId(userId, supabase);
      results.push({ user_id: userId, ok: true, summary });
    } catch (err) {
      results.push({
        user_id: userId,
        ok: false,
        error: err instanceof Error ? err.message : "unknown",
      });
    }
  }

  return NextResponse.json({
    ok: true,
    users_processed: results.length,
    results,
    ran_at: new Date().toISOString(),
  });
}
