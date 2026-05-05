"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { encrypt } from "@/lib/crypto";

type Result = { ok: true } | { ok: false; error: string };

export async function saveGoogleCreds(formData: FormData): Promise<Result> {
  const clientId = String(formData.get("client_id") ?? "").trim();
  const clientSecret = String(formData.get("client_secret") ?? "").trim();

  if (!clientId.endsWith(".apps.googleusercontent.com")) {
    return {
      ok: false,
      error: "Client ID looks wrong — should end with .apps.googleusercontent.com",
    };
  }
  if (clientSecret.length < 10) {
    return { ok: false, error: "Client Secret looks too short" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { error } = await supabase.from("google_oauth_creds").upsert(
    {
      user_id: user.id,
      client_id: clientId,
      client_secret_encrypted: encrypt(clientSecret),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/setup");
  return { ok: true };
}

export async function deleteGoogleCreds(): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { error } = await supabase
    .from("google_oauth_creds")
    .delete()
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/setup");
  return { ok: true };
}
