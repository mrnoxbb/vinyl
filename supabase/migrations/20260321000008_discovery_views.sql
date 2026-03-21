drop materialized view if exists public.mv_hot_right_now;
drop materialized view if exists public.mv_hidden_gems;
drop materialized view if exists public.mv_most_reviewed_week;
drop view if exists public.unified_reviews;

create view public.unified_reviews as
select
  'track'::text as review_type,
  reviews.id,
  reviews.user_id,
  reviews.track_id as spotify_id,
  reviews.title,
  reviews.artist,
  reviews.artwork_url,
  reviews.rating,
  reviews.body,
  coalesce(reviews.has_spoiler, false) as has_spoiler,
  coalesce(reviews.helpful_votes, 0) as helpful_votes,
  reviews.created_at,
  null::timestamptz as updated_at,
  users.username,
  users.display_name,
  users.avatar_url,
  users.level
from public.reviews
left join public.users on users.id = reviews.user_id
union all
select
  'album'::text as review_type,
  album_reviews.id,
  album_reviews.user_id,
  album_reviews.album_id as spotify_id,
  album_reviews.album_name as title,
  album_reviews.artist_name as artist,
  album_reviews.artwork_url,
  album_reviews.rating,
  album_reviews.body,
  coalesce(album_reviews.has_spoiler, false) as has_spoiler,
  coalesce(album_reviews.helpful_votes, 0) as helpful_votes,
  album_reviews.created_at,
  null::timestamptz as updated_at,
  users.username,
  users.display_name,
  users.avatar_url,
  users.level
from public.album_reviews
left join public.users on users.id = album_reviews.user_id
union all
select
  'artist'::text as review_type,
  artist_reviews.id,
  artist_reviews.user_id,
  artist_reviews.artist_id as spotify_id,
  artist_reviews.artist_name as title,
  artist_reviews.artist_name as artist,
  artist_reviews.artwork_url,
  artist_reviews.rating,
  artist_reviews.body,
  coalesce(artist_reviews.has_spoiler, false) as has_spoiler,
  coalesce(artist_reviews.helpful_votes, 0) as helpful_votes,
  artist_reviews.created_at,
  null::timestamptz as updated_at,
  users.username,
  users.display_name,
  users.avatar_url,
  users.level
from public.artist_reviews
left join public.users on users.id = artist_reviews.user_id;

create materialized view public.mv_most_reviewed_week as
select
  spotify_id,
  review_type,
  max(title) as title,
  max(artist) as artist,
  max(artwork_url) as artwork_url,
  count(*) as review_count,
  round(avg(rating)::numeric, 1) as avg_rating
from public.unified_reviews
where created_at >= timezone('utc', now()) - interval '7 days'
group by spotify_id, review_type
order by review_count desc, avg_rating desc;

create unique index if not exists mv_most_reviewed_week_key
  on public.mv_most_reviewed_week (spotify_id, review_type);

create materialized view public.mv_hidden_gems as
select
  spotify_id,
  review_type,
  max(title) as title,
  max(artist) as artist,
  max(artwork_url) as artwork_url,
  count(*) as review_count,
  round(avg(rating)::numeric, 1) as avg_rating
from public.unified_reviews
group by spotify_id, review_type
having count(*) between 2 and 20
   and avg(rating) >= 4.0
order by avg_rating desc, review_count desc;

create unique index if not exists mv_hidden_gems_key
  on public.mv_hidden_gems (spotify_id, review_type);

create materialized view public.mv_hot_right_now as
select
  spotify_id,
  review_type,
  max(title) as title,
  max(artist) as artist,
  max(artwork_url) as artwork_url,
  count(*) as review_velocity,
  round(avg(rating)::numeric, 1) as avg_rating
from public.unified_reviews
where created_at >= timezone('utc', now()) - interval '24 hours'
group by spotify_id, review_type
order by review_velocity desc, avg_rating desc;

create unique index if not exists mv_hot_right_now_key
  on public.mv_hot_right_now (spotify_id, review_type);
