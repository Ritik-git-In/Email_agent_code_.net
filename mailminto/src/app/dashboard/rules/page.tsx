const CATEGORIES = [
  { name: "High Priority", desc: "Urgent, VIP, or escalation emails", color: "bg-red-500/10 text-red-600 dark:text-red-400" },
  { name: "Finance & Billing", desc: "Invoices, payments, renewals", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  { name: "Customer Support", desc: "Customer inquiries and complaints", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  { name: "Promotion", desc: "Marketing and promotional emails", color: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
  { name: "Internal Employee", desc: "Internal team communication", color: "bg-green-500/10 text-green-600 dark:text-green-400" },
];

export default function RulesPage() {
  return (
    <div className="px-8 py-10 max-w-4xl">
      <h1 className="text-3xl font-bold tracking-tight">Rules</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Customize the prompt and action for each category.
      </p>

      <div className="mt-8 space-y-3">
        {CATEGORIES.map((cat) => (
          <div
            key={cat.name}
            className="flex items-center justify-between rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5"
          >
            <div className="flex items-center gap-4">
              <span
                className={`inline-flex h-9 px-3 items-center rounded-full text-xs font-medium ${cat.color}`}
              >
                {cat.name}
              </span>
              <span className="text-sm text-zinc-600 dark:text-zinc-400">{cat.desc}</span>
            </div>
            <button
              disabled
              className="rounded-full border border-zinc-300 dark:border-zinc-700 px-4 py-1.5 text-sm font-medium text-zinc-500 cursor-not-allowed"
            >
              Edit (soon)
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
