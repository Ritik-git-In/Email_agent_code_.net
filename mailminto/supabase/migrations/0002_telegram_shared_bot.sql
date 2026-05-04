-- Phase 2: Shared Telegram bot — one-time link tokens for deep-link auth
-- Run in Supabase SQL Editor after 0001_init.sql

------------------------------------------------------------
-- Telegram link tokens (short-lived, one-time-use)
------------------------------------------------------------
create table public.telegram_link_tokens (
  token text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index idx_telegram_link_tokens_user_id on public.telegram_link_tokens(user_id);

alter table public.telegram_link_tokens enable row level security;

-- App-level reads not needed (webhook uses service role); allow user to see/delete own
create policy "telegram_link_tokens_all_own" on public.telegram_link_tokens
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

------------------------------------------------------------
-- telegram_configs: bot_token now optional (shared bot doesn't need per-user token)
------------------------------------------------------------
alter table public.telegram_configs
  alter column bot_token_encrypted drop not null;
