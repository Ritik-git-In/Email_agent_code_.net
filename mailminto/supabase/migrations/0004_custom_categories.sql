-- Phase B: Custom user-defined email categories with prompts
-- Replaces the underutilized `rules` table with a richer `categories` schema.
-- Each user gets 5 default categories seeded on signup; can add unlimited custom.

-- Drop old underused rules table (was empty, never written to by pipeline)
drop table if exists public.rules cascade;

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  slug text not null,                   -- machine ID used by classifier (e.g. 'high_priority', 'family')
  name text not null,                   -- user-facing display name
  description text not null,            -- the classifier prompt — what kind of emails go here
  color_bg text not null,               -- Gmail label background hex
  color_text text not null,             -- Gmail label text hex
  gmail_label_id text,                  -- cached Gmail label ID after first sync (per first connected account)
  is_default boolean not null default false,
  enabled boolean not null default true,
  generate_draft boolean not null default false,
  notify_telegram boolean not null default false,
  draft_prompt text,                    -- optional custom draft instructions; when null, generic template used
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, slug)
);

create index idx_categories_user_id on public.categories(user_id);
create index idx_categories_user_enabled on public.categories(user_id, enabled);

alter table public.categories enable row level security;

create policy "categories_all_own" on public.categories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

------------------------------------------------------------
-- Seed 5 default categories on profile creation (signup)
------------------------------------------------------------
create or replace function public.seed_default_categories()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.categories (user_id, slug, name, description, color_bg, color_text, is_default, generate_draft, notify_telegram, display_order) values
    (new.id, 'high_priority', 'High Priority',
     'Urgent emails: VIP senders (CEO/Director/Founder), legal/compliance issues, system outages, deadlines, financial penalties, client escalations, anything marked "ASAP", "urgent", or "immediate".',
     '#fb4c2f', '#ffffff', true, true, true, 1),
    (new.id, 'finance', 'Finance',
     'Invoices, billing statements, payments, renewals, refunds, payroll, expense reports, anything mentioning currency amounts or due dates.',
     '#fad165', '#000000', true, false, false, 2),
    (new.id, 'customer_support', 'Customer Support',
     'Customer inquiries, complaints, product issues, technical problems, refund requests, support tickets from end-users.',
     '#4986e7', '#ffffff', true, true, false, 3),
    (new.id, 'promotion', 'Promotion',
     'Marketing emails, discount offers, newsletters, product launches, cold outreach, affiliate promotions.',
     '#a479e2', '#ffffff', true, false, false, 4),
    (new.id, 'internal', 'Internal',
     'Internal communication from colleagues, managers, HR, team updates, meeting coordination, task assignments within your organization.',
     '#16a766', '#ffffff', true, false, false, 5);
  return new;
end;
$$;

drop trigger if exists on_profile_created_seed_categories on public.profiles;
create trigger on_profile_created_seed_categories
  after insert on public.profiles
  for each row execute function public.seed_default_categories();

------------------------------------------------------------
-- Backfill existing users (so already-signed-up users get defaults too)
------------------------------------------------------------
insert into public.categories (user_id, slug, name, description, color_bg, color_text, is_default, generate_draft, notify_telegram, display_order)
select p.id, d.slug, d.name, d.description, d.color_bg, d.color_text, true, d.generate_draft, d.notify_telegram, d.display_order
from public.profiles p
cross join (values
  ('high_priority', 'High Priority',
   'Urgent emails: VIP senders (CEO/Director/Founder), legal/compliance issues, system outages, deadlines, financial penalties, client escalations, anything marked "ASAP", "urgent", or "immediate".',
   '#fb4c2f', '#ffffff', true, true, 1),
  ('finance', 'Finance',
   'Invoices, billing statements, payments, renewals, refunds, payroll, expense reports, anything mentioning currency amounts or due dates.',
   '#fad165', '#000000', false, false, 2),
  ('customer_support', 'Customer Support',
   'Customer inquiries, complaints, product issues, technical problems, refund requests, support tickets from end-users.',
   '#4986e7', '#ffffff', true, false, 3),
  ('promotion', 'Promotion',
   'Marketing emails, discount offers, newsletters, product launches, cold outreach, affiliate promotions.',
   '#a479e2', '#ffffff', false, false, 4),
  ('internal', 'Internal',
   'Internal communication from colleagues, managers, HR, team updates, meeting coordination, task assignments within your organization.',
   '#16a766', '#ffffff', false, false, 5)
) as d(slug, name, description, color_bg, color_text, generate_draft, notify_telegram, display_order)
on conflict (user_id, slug) do nothing;
