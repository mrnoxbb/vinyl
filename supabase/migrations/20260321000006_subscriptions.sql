create extension if not exists pgcrypto;

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  is_active boolean not null default false,
  plan text not null default 'free',
  provider text not null default 'revenuecat',
  expires_at timestamptz,
  updated_at timestamptz not null default timezone('utc', now())
);
