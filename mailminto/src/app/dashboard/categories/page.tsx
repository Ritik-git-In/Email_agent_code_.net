import Link from "next/link";
import { Plus, Tag } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/user";
import { CategoryRow } from "./CategoryRow";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const user = await getCurrentUser();
  const supabase = await createClient();
  if (!user) return null;

  const { data: categories } = await supabase
    .from("categories")
    .select(
      "id, slug, name, description, color_bg, color_text, is_default, enabled, generate_draft, notify_telegram, draft_prompt, display_order",
    )
    .eq("user_id", user.id)
    .order("display_order");

  const list = categories ?? [];
  const limit = 15;

  return (
    <div className="px-8 py-10 max-w-4xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Tag className="h-7 w-7" />
            Categories
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400 max-w-2xl">
            Define how MailMinto routes your emails. Each category has a prompt that
            tells the AI which emails belong here, plus a Gmail label and optional actions.
          </p>
        </div>
        <Link
          href="/dashboard/categories/new"
          className="shrink-0 inline-flex items-center gap-2 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2 text-sm font-medium hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          New category
        </Link>
      </div>

      <div className="mt-3 text-xs text-zinc-500">
        {list.length} of {limit} categories used
        {list.length >= limit && (
          <span className="ml-2 text-amber-600 dark:text-amber-400">— limit reached</span>
        )}
      </div>

      {list.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 p-12 text-center">
          <Tag className="mx-auto h-8 w-8 text-zinc-400" />
          <p className="mt-3 text-zinc-500">
            No categories yet. Run the database migration to seed defaults, or create one.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {list.map((cat) => (
            <CategoryRow key={cat.id} category={cat} />
          ))}
        </div>
      )}

      <div className="mt-10 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-5 text-sm text-zinc-600 dark:text-zinc-400">
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">How classification works</h3>
        <ul className="mt-2 space-y-1.5 list-disc list-inside">
          <li>Each new email goes through ALL your enabled categories at once</li>
          <li>The AI picks the single best match based on your prompts</li>
          <li>Matched category&apos;s label is applied + configured actions run</li>
          <li>If nothing matches well, it falls back to the &quot;Internal&quot; bucket</li>
        </ul>
      </div>
    </div>
  );
}
