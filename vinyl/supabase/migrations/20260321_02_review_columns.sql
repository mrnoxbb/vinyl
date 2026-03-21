begin;

alter table public.reviews
  add column if not exists has_spoiler boolean not null default false,
  add column if not exists helpful_votes integer not null default 0;

alter table public.album_reviews
  add column if not exists has_spoiler boolean not null default false,
  add column if not exists helpful_votes integer not null default 0;

alter table public.artist_reviews
  add column if not exists has_spoiler boolean not null default false,
  add column if not exists helpful_votes integer not null default 0;

commit;
