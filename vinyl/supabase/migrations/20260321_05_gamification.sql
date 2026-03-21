create extension if not exists pgcrypto;

alter table public.users
  add column if not exists level text not null default 'Listener',
  add column if not exists review_streak integer not null default 0,
  add column if not exists last_review_date date,
  add column if not exists is_critic_verified boolean not null default false;

alter table public.users
  drop constraint if exists users_level_check;

alter table public.users
  add constraint users_level_check
  check (level in ('Listener', 'Critic', 'Connoisseur', 'Legend'));

create table if not exists public.badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  badge_type text not null,
  awarded_at timestamptz not null default timezone('utc', now()),
  unique (user_id, badge_type)
);
