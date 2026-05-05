import { google } from "googleapis";
import { env } from "@/lib/env";

export const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
];

export type OAuthCreds = { clientId: string; clientSecret: string };

export function createOAuthClient(creds: OAuthCreds) {
  return new google.auth.OAuth2(
    creds.clientId,
    creds.clientSecret,
    env.googleRedirectUri,
  );
}

export function buildAuthUrl(creds: OAuthCreds, state: string): string {
  const oauth2Client = createOAuthClient(creds);
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GMAIL_SCOPES,
    state,
    include_granted_scopes: true,
  });
}
