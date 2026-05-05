import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Mail,
  LayoutDashboard,
  Inbox,
  Settings as SettingsIcon,
  Plug,
  Tag,
  LogOut,
  FileText,
  Calendar,
  Sparkles,
  Pencil,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/user";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  const supabase = await createClient();
  if (!user) redirect("/login");

  return (
    <div className="h-screen flex overflow-hidden bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <aside className="w-60 shrink-0 h-screen border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col">
        <div className="h-16 shrink-0 flex items-center px-6 border-b border-zinc-200 dark:border-zinc-800">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
            <Mail className="h-5 w-5" />
            MailMinto
          </Link>
        </div>
        <div className="px-3 pt-4">
          <Link
            href="/dashboard/compose"
            className="flex items-center gap-2 rounded-2xl bg-blue-100 dark:bg-blue-950 hover:bg-blue-200 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 font-medium px-4 py-3 text-sm shadow-sm"
          >
            <Pencil className="h-4 w-4" />
            Compose
          </Link>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 text-sm">
          <NavLink href="/dashboard" icon={<LayoutDashboard className="h-4 w-4" />}>
            Overview
          </NavLink>
          <NavLink href="/dashboard/inbox" icon={<Inbox className="h-4 w-4" />}>
            Inbox
          </NavLink>
          <NavLink href="/dashboard/drafts" icon={<FileText className="h-4 w-4" />}>
            Drafts
          </NavLink>
          <NavLink href="/dashboard/calendar" icon={<Calendar className="h-4 w-4" />}>
            Calendar
          </NavLink>
          <NavLink href="/dashboard/categories" icon={<Tag className="h-4 w-4" />}>
            Categories
          </NavLink>
          <NavLink href="/dashboard/labels" icon={<Tag className="h-4 w-4" />}>
            Labels
          </NavLink>
          <NavLink href="/dashboard/setup" icon={<Sparkles className="h-4 w-4" />}>
            Setup
          </NavLink>
          <NavLink href="/dashboard/integrations" icon={<Plug className="h-4 w-4" />}>
            Integrations
          </NavLink>
          <NavLink href="/dashboard/settings" icon={<SettingsIcon className="h-4 w-4" />}>
            Settings
          </NavLink>
        </nav>
        <div className="shrink-0 p-3 border-t border-zinc-200 dark:border-zinc-800">
          <div className="px-3 py-2 text-xs">
            <div className="font-medium truncate">{user.email}</div>
            <div className="text-zinc-500">Free plan</div>
          </div>
          <form action="/api/auth/signout" method="post">
            <button
              type="submit"
              className="mt-1 w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <main className="flex-1 h-screen overflow-y-auto">{children}</main>
    </div>
  );
}

function NavLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-lg px-3 py-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
    >
      {icon}
      {children}
    </Link>
  );
}
