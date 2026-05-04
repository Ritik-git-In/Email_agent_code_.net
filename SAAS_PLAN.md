# MailMinto — Email Agent SaaS

> Zero-investment, BYOK (Bring Your Own Keys) email triage SaaS built on free-tier infra.

## Product

Users connect their Gmail. Incoming emails are auto-classified into 5 categories (High Priority, Finance, Customer Support, Promotion, Internal) and acted upon (label + draft reply + Telegram alert).

**Users provide their own:** Gmail (OAuth), OpenAI/Groq API key, Telegram bot token.
**We provide:** The software, dashboard, rules, classification engine.

## Tech Stack (all free-tier)

| Concern | Choice |
|---|---|
| Framework | Next.js 15 (App Router) + TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Hosting | Vercel (free tier) |
| Database | Supabase Postgres (500 MB free) |
| Auth | Supabase Auth (Google OAuth) |
| Background jobs | Inngest (50k steps/month free) or Vercel Cron |
| LLM | Groq API (Llama 3.3 70B, free tier) — fallback to user's OpenAI key |
| Email | Gmail API (user's OAuth scope) |
| Notifications | Telegram Bot API (user's bot) |
| Payments | Razorpay (zero setup, 2% per txn) |

## Database Schema (Supabase)

```
users            id, email, name, plan (free|pro), created_at
gmail_accounts   id, user_id, email, refresh_token (encrypted), last_synced_at
api_keys         id, user_id, provider (openai|groq), key_encrypted
telegram_configs id, user_id, bot_token_encrypted, chat_id
rules            id, user_id, category, prompt, label_id, action (draft|reply|notify)
emails_processed id, user_id, gmail_msg_id, category, confidence, action_taken, created_at
usage            id, user_id, month, emails_count
```

## Folder Structure

```
src/
  app/
    (marketing)/page.tsx          # Landing
    (auth)/login/page.tsx
    dashboard/
      page.tsx                     # Overview
      inbox/page.tsx               # Processed emails
      rules/page.tsx               # Category rules editor
      integrations/page.tsx        # Gmail / API key / Telegram
      settings/page.tsx
    api/
      auth/callback/route.ts       # Supabase auth callback
      gmail/connect/route.ts       # Gmail OAuth start
      gmail/callback/route.ts      # Gmail OAuth callback
      inngest/route.ts             # Background job endpoint
  components/ui/                   # shadcn primitives
  lib/
    supabase/
      client.ts
      server.ts
    gmail/
      client.ts
      classify.ts
    llm/
      groq.ts
      openai.ts
    crypto.ts                      # AES encrypt/decrypt for tokens
  inngest/
    functions/pollGmail.ts         # Cron: poll each user's Gmail
```

## Roadmap (90 days)

### Phase 1 — Foundation (Week 1-2)
- [x] SAAS_PLAN.md
- [ ] Next.js + Tailwind + shadcn setup
- [ ] Supabase project + schema migrations
- [ ] Landing page
- [ ] Google login (Supabase Auth)
- [ ] Dashboard shell

### Phase 2 — Core features (Week 3-5)
- [ ] Gmail OAuth integration (per-user)
- [ ] API key vault (encrypted storage)
- [ ] Inngest cron to poll Gmail every 5 min
- [ ] LLM classifier (Groq + OpenAI fallback)
- [ ] 5 category handlers (label + draft + Telegram)
- [ ] Processed-emails inbox view

### Phase 3 — Polish + launch (Week 6-8)
- [ ] Rule editor (custom prompts per category)
- [ ] Usage tracking + free tier limits
- [ ] Razorpay billing integration
- [ ] Onboarding flow
- [ ] Docs + demo video

### Phase 4 — Launch (Week 9-12)
- [ ] Beta with 20 users
- [ ] Product Hunt + Reddit + Twitter launch
- [ ] Iterate on feedback

## Monetization

| Plan | Price | Limits |
|---|---|---|
| Free | ₹0 | 50 emails/day, 1 Gmail, 3 categories |
| Pro | ₹299/mo | Unlimited, 3 Gmails, custom categories, priority support |
| Agency | ₹999/mo | 10 Gmails, team seats, white-label |

**Target:** 100 Pro users in 90 days = ₹30,000/mo recurring.

## Security Non-negotiables

- All tokens (Gmail refresh, API keys, Telegram) encrypted at rest (AES-256-GCM)
- Encryption key in Vercel env, never committed
- Per-user row-level security in Supabase
- No logs of email content
- SOC2-ready practices from day one (audit trail, access logs)
