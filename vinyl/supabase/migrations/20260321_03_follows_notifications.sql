create extension if not exists pgcrypto;

create table if not exists public.follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references public.users(id) on delete cascade,
  following_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique (follower_id, following_id),
  check (follower_id <> following_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.users(id) on delete cascade,
  type text not null,
  actor_id uuid references public.users(id) on delete set null,
  review_type text check (review_type in ('track', 'album', 'artist')),
  review_id uuid,
  read boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.notification_settings (
  user_id uuid primary key references public.users(id) on delete cascade,
  new_follower boolean not null default true,
  review_liked boolean not null default true,
  review_commented boolean not null default true
);

create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  token text not null,
  platform text not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, token)
);
