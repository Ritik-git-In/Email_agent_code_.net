import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CategoryForm } from "../CategoryForm";

export const dynamic = "force-dynamic";

export default function NewCategoryPage() {
  return (
    <div className="px-8 py-10 max-w-3xl">
      <Link
        href="/dashboard/categories"
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to categories
      </Link>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">New category</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Tell MailMinto what kind of emails go here. Be specific — the AI uses your prompt to decide matches.
      </p>

      <div className="mt-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
        <CategoryForm mode="create" />
      </div>
    </div>
  );
}
