import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { buildAuthUrl } from "@/lib/gmail/oauth";
import { getUserOAuthCreds } from "@/lib/gmail/creds";
import { env } from "@/lib/env";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", env.appUrl));
  }

  let creds;
  try {
    creds = await getUserOAuthCreds(user.id, supabase);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "missing_credentials";
    return NextResponse.redirect(
      new URL(`/dashboard?error=${encodeURIComponent(msg)}`, env.appUrl),
    );
  }

  const state = randomBytes(16).toString("hex");
  const authUrl = buildAuthUrl(creds, state);

  const response = NextResponse.redirect(authUrl);
  response.cookies.set("gmail_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return response;
}
