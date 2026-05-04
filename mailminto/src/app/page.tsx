import Link from "next/link";
import {
  Mail,
  Zap,
  Shield,
  MessageSquare,
  FileText,
  Tag,
  ArrowRight,
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <Mail className="h-5 w-5" />
            MailMinto
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link href="#features" className="hover:text-zinc-600 dark:hover:text-zinc-400">
              Features
            </Link>
            <Link href="#pricing" className="hover:text-zinc-600 dark:hover:text-zinc-400">
              Pricing
            </Link>
            <Link
              href="/login"
              className="rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-1.5 text-sm font-medium hover:opacity-90"
            >
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-4xl px-6 py-24 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-4 py-1 text-xs font-medium">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
            BYOK — you bring your own Gmail, OpenAI, Telegram
          </div>
          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
            Your AI email triage assistant
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">
            MailMinto classifies every email hitting your inbox into 5 smart
            categories, drafts replies, labels, and alerts you on Telegram —
            all running on your own API keys. Zero markup.
          </p>
          <div className="mt-10 flex justify-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-6 py-3 font-medium hover:opacity-90"
            >
              Start free <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="#features"
              className="inline-flex items-center gap-2 rounded-full border border-zinc-300 dark:border-zinc-700 px-6 py-3 font-medium hover:bg-zinc-50 dark:hover:bg-zinc-900"
            >
              See how it works
            </Link>
          </div>
          <p className="mt-4 text-xs text-zinc-500">
            Free tier — 50 emails/day, 1 Gmail account. No credit card required.
          </p>
        </section>

        <section id="features" className="mx-auto max-w-6xl px-6 py-20">
          <div className="mx-auto max-w-2xl text-center mb-14">
            <h2 className="text-3xl font-bold tracking-tight">5 categories, one pipeline</h2>
            <p className="mt-3 text-zinc-600 dark:text-zinc-400">
              Every incoming mail is routed through an LLM classifier and handled automatically.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={<Zap className="h-5 w-5" />}
              title="High Priority"
              desc="Detects urgent, VIP, legal, or escalation emails. Drafts an executive reply + pings you on Telegram."
              accent="bg-red-500/10 text-red-600 dark:text-red-400"
            />
            <FeatureCard
              icon={<FileText className="h-5 w-5" />}
              title="Finance & Billing"
              desc="Invoices, payments, renewals are summarized and forwarded to your finance team."
              accent="bg-amber-500/10 text-amber-600 dark:text-amber-400"
            />
            <FeatureCard
              icon={<MessageSquare className="h-5 w-5" />}
              title="Customer Support"
              desc="Drafts empathetic replies to customer inquiries — auto-send or review first."
              accent="bg-blue-500/10 text-blue-600 dark:text-blue-400"
            />
            <FeatureCard
              icon={<Tag className="h-5 w-5" />}
              title="Promotion"
              desc="Extracts offer, promo code, expiry — you get the signal, not the noise."
              accent="bg-violet-500/10 text-violet-600 dark:text-violet-400"
            />
            <FeatureCard
              icon={<Mail className="h-5 w-5" />}
              title="Internal Employee"
              desc="Summarizes tasks, deadlines, meetings from internal communication."
              accent="bg-green-500/10 text-green-600 dark:text-green-400"
            />
            <FeatureCard
              icon={<Shield className="h-5 w-5" />}
              title="Your keys, your data"
              desc="Tokens AES-256 encrypted. No email content logged. Revoke anytime from your Google account."
              accent="bg-zinc-500/10 text-zinc-600 dark:text-zinc-400"
            />
          </div>
        </section>

        <section id="pricing" className="mx-auto max-w-5xl px-6 py-20">
          <div className="mx-auto max-w-2xl text-center mb-14">
            <h2 className="text-3xl font-bold tracking-tight">Simple pricing</h2>
            <p className="mt-3 text-zinc-600 dark:text-zinc-400">
              You pay for the software. LLM usage runs on your own keys — no markup, no surprise bills.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            <PricingCard
              name="Free"
              price="₹0"
              period="forever"
              features={["50 emails/day", "1 Gmail account", "3 categories", "Telegram alerts"]}
              cta="Start free"
              href="/login"
            />
            <PricingCard
              name="Pro"
              price="₹299"
              period="/month"
              features={["Unlimited emails", "3 Gmail accounts", "All 5 categories", "Custom rules & prompts", "Priority support"]}
              cta="Go Pro"
              href="/login"
              highlighted
            />
            <PricingCard
              name="Agency"
              price="₹999"
              period="/month"
              features={["10 Gmail accounts", "Team seats", "White-label dashboard", "API access", "Dedicated support"]}
              cta="Contact us"
              href="/login"
            />
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-200 dark:border-zinc-800 mt-20">
        <div className="mx-auto max-w-6xl px-6 py-8 flex items-center justify-between text-sm text-zinc-500">
          <span>© {new Date().getFullYear()} MailMinto</span>
          <a
            href="mailto:hello@mailminto.app"
            className="hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            hello@mailminto.app
          </a>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  desc,
  accent,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
      <div className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${accent}`}>
        {icon}
      </div>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{desc}</p>
    </div>
  );
}

function PricingCard({
  name,
  price,
  period,
  features,
  cta,
  href,
  highlighted,
}: {
  name: string;
  price: string;
  period: string;
  features: string[];
  cta: string;
  href: string;
  highlighted?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-8 ${
        highlighted
          ? "border-zinc-900 dark:border-zinc-100 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
          : "border-zinc-200 dark:border-zinc-800"
      }`}
    >
      <h3 className="text-lg font-semibold">{name}</h3>
      <div className="mt-4 flex items-baseline gap-1">
        <span className="text-4xl font-bold">{price}</span>
        <span className={highlighted ? "text-zinc-400 dark:text-zinc-600" : "text-zinc-500"}>
          {period}
        </span>
      </div>
      <ul className="mt-6 space-y-2 text-sm">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-current opacity-60" />
            {f}
          </li>
        ))}
      </ul>
      <Link
        href={href}
        className={`mt-8 inline-flex w-full items-center justify-center rounded-full px-4 py-2.5 text-sm font-medium ${
          highlighted
            ? "bg-white text-zinc-900 hover:opacity-90 dark:bg-zinc-900 dark:text-white"
            : "border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-900"
        }`}
      >
        {cta}
      </Link>
    </div>
  );
}
