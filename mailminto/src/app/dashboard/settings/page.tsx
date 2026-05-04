import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/user";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  const supabase = await createClient();

  return (
    <div className="px-8 py-10 max-w-3xl">
      <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Manage your account and subscription.
      </p>

      <div className="mt-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
        <h2 className="font-semibold">Account</h2>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-zinc-500">Email</dt>
            <dd className="font-medium">{user?.email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-zinc-500">Name</dt>
            <dd className="font-medium">
              {user?.user_metadata?.full_name ?? "—"}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-zinc-500">Plan</dt>
            <dd className="font-medium">Free</dd>
          </div>
        </dl>
      </div>

      <div className="mt-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
        <h2 className="font-semibold">Subscription</h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Upgrade to Pro for unlimited emails, custom rules, and priority support.
        </p>
        <button
          disabled
          className="mt-4 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-5 py-2 text-sm font-medium opacity-50 cursor-not-allowed"
        >
          Upgrade to Pro (₹299/mo) — coming soon
        </button>
      </div>
    </div>
  );
}
