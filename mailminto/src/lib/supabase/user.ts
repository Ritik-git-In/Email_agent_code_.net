import { cache } from "react";
import { createClient } from "./server";

// Multiple pages/layouts call getUser() per request (e.g., layout + page).
// React.cache dedupes the call so Supabase only validates once per render.
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
