import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", env.appUrl));
  }

  if (!env.telegramBotUsername) {
    return NextResponse.redirect(
      new URL("/dashboard/integrations?error=telegram_bot_not_configured", env.appUrl),
    );
  }

  const token = randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  const admin = createAdminClient();
  const { error } = await admin.from("telegram_link_tokens").insert({
    token,
    user_id: user.id,
    expires_at: expiresAt,
  });
  if (error) {
    return NextResponse.redirect(
      new URL(`/dashboard/integrations?error=${encodeURIComponent(error.message)}`, env.appUrl),
    );
  }

  const deepLink = `https://t.me/${env.telegramBotUsername}?start=${token}`;
  return NextResponse.redirect(deepLink);
}
