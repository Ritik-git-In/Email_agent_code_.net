import type { SupabaseClient } from "@supabase/supabase-js";
import { decrypt } from "@/lib/crypto";
import type { OAuthCreds } from "./oauth";

export async function getUserOAuthCreds(
  userId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, "public", any>,
): Promise<OAuthCreds> {
  const { data, error } = await supabase
    .from("google_oauth_creds")
    .select("client_id, client_secret_encrypted")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`Failed to load Google credentials: ${error.message}`);
  if (!data) {
    throw new Error(
      "Google OAuth credentials not configured. Complete Step 1 of setup first.",
    );
  }
  return {
    clientId: data.client_id,
    clientSecret: decrypt(data.client_secret_encrypted),
  };
}
