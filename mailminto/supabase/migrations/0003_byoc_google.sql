-- Phase BYOC (Bring Your Own Credentials): each user provides their own
-- Google OAuth Client ID + Secret from their personal Cloud project.
-- This avoids needing app-wide Google verification entirely.

create table public.google_oauth_creds (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  client_id text not null,
  client_secret_encrypted text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.google_oauth_creds enable row level security;

create policy "google_oauth_creds_all_own" on public.google_oauth_creds
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
