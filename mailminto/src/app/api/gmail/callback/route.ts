import { NextResponse, type NextRequest } from "next/server";
import { google } from "googleapis";
import { createClient } from "@/lib/supabase/server";
import { createOAuthClient } from "@/lib/gmail/oauth";
import { encrypt } from "@/lib/crypto";

const DASHBOARD = "/dashboard/integrations";

function redirectWithError(request: NextRequest, message: string) {
  const url = new URL(DASHBOARD, request.url);
  url.searchParams.set("error", message);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  if (oauthError) return redirectWithError(request, oauthError);
  if (!code || !state) return redirectWithError(request, "missing_code");

  const cookieState = request.cookies.get("gmail_oauth_state")?.value;
  if (!cookieState || cookieState !== state) {
    return redirectWithError(request, "invalid_state");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return redirectWithError(request, "not_authenticated");

  try {
    const oauth2Client = createOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);
    if (!tokens.refresh_token) {
      return redirectWithError(
        request,
        "no_refresh_token_revoke_and_retry",
      );
    }
    oauth2Client.setCredentials(tokens);

    const { data: profile } = await google
      .oauth2({ version: "v2", auth: oauth2Client })
      .userinfo.get();

    if (!profile.email) return redirectWithError(request, "no_email");

    const encryptedRefreshToken = encrypt(tokens.refresh_token);

    const { error: dbError } = await supabase.from("gmail_accounts").upsert(
      {
        user_id: user.id,
        email: profile.email,
        refresh_token_encrypted: encryptedRefreshToken,
      },
      { onConflict: "user_id,email" },
    );

    if (dbError) return redirectWithError(request, dbError.message);

    const success = new URL(DASHBOARD, request.url);
    success.searchParams.set("connected", profile.email);
    const response = NextResponse.redirect(success);
    response.cookies.delete("gmail_oauth_state");
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    return redirectWithError(request, message);
  }
}
