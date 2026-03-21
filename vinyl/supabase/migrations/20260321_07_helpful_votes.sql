create extension if not exists pgcrypto;

create table if not exists public.helpful_votes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  review_type text not null check (review_type in ('track', 'album', 'artist')),
  review_id uuid not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, review_type, review_id)
);
