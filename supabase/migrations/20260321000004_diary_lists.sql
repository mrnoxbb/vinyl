create extension if not exists pgcrypto;

create table if not exists public.diary_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  spotify_id text not null,
  entity_type text not null check (entity_type in ('track', 'album', 'artist')),
  title text not null,
  artist text not null,
  artwork_url text,
  listened_at timestamptz not null,
  note text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  description text,
  is_public boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.lists(id) on delete cascade,
  spotify_id text not null,
  entity_type text not null check (entity_type in ('track', 'album', 'artist')),
  title text not null,
  artist text not null,
  artwork_url text,
  position integer not null,
  note text,
  unique (list_id, position)
);
