-- MailMinto initial schema
-- Run this in Supabase SQL Editor: Dashboard → SQL Editor → New query → paste → Run

------------------------------------------------------------
-- 1. Profiles (extends auth.users)
------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text,
  plan text not null default 'free' check (plan in ('free', 'pro', 'agency')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-create profile when a user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

------------------------------------------------------------
-- 2. Gmail accounts (per-user OAuth tokens)
------------------------------------------------------------
create table public.gmail_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  email text not null,
  refresh_token_encrypted text not null,
  history_id text,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, email)
);

create index idx_gmail_accounts_user_id on public.gmail_accounts(user_id);

------------------------------------------------------------
-- 3. API keys vault (BYOK — OpenAI / Groq)
------------------------------------------------------------
create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null check (provider in ('openai', 'groq', 'anthropic')),
  key_encrypted text not null,
  created_at timestamptz not null default now(),
  unique (user_id, provider)
);

create index idx_api_keys_user_id on public.api_keys(user_id);

------------------------------------------------------------
-- 4. Telegram config
------------------------------------------------------------
create table public.telegram_configs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade unique,
  bot_token_encrypted text not null,
  chat_id text not null,
  created_at timestamptz not null default now()
);

------------------------------------------------------------
-- 5. Classification rules (per-user, per-category)
------------------------------------------------------------
create table public.rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category text not null check (category in (
    'high_priority', 'finance', 'customer_support', 'promotion', 'internal'
  )),
  prompt text not null,
  gmail_label_id text,
  action text not null default 'notify' check (action in ('notify', 'draft', 'auto_reply', 'forward')),
  forward_to text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, category)
);

create index idx_rules_user_id on public.rules(user_id);

------------------------------------------------------------
-- 6. Processed emails (audit log)
------------------------------------------------------------
create table public.emails_processed (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  gmail_account_id uuid references public.gmail_accounts(id) on delete cascade,
  gmail_msg_id text not null,
  subject text,
  from_email text,
  category text,
  confidence numeric,
  action_taken text,
  draft_id text,
  error text,
  processed_at timestamptz not null default now(),
  unique (gmail_account_id, gmail_msg_id)
);

create index idx_emails_processed_user_id on public.emails_processed(user_id);
create index idx_emails_processed_at on public.emails_processed(processed_at desc);

------------------------------------------------------------
-- 7. Usage tracking (for plan enforcement)
------------------------------------------------------------
create table public.usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  month text not null,
  emails_count integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, month)
);

create index idx_usage_user_month on public.usage(user_id, month);

------------------------------------------------------------
-- 8. Row Level Security (every table — user can only see their own rows)
------------------------------------------------------------
alter table public.profiles          enable row level security;
alter table public.gmail_accounts    enable row level security;
alter table public.api_keys          enable row level security;
alter table public.telegram_configs  enable row level security;
alter table public.rules             enable row level security;
alter table public.emails_processed  enable row level security;
alter table public.usage             enable row level security;

-- profiles: user can read/update only their own profile
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- gmail_accounts
create policy "gmail_accounts_all_own" on public.gmail_accounts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- api_keys
create policy "api_keys_all_own" on public.api_keys
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- telegram_configs
create policy "telegram_configs_all_own" on public.telegram_configs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- rules
create policy "rules_all_own" on public.rules
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- emails_processed (read only from app — writes happen via service role from background job)
create policy "emails_processed_select_own" on public.emails_processed
  for select using (auth.uid() = user_id);

-- usage (read only from app)
create policy "usage_select_own" on public.usage
  for select using (auth.uid() = user_id);
