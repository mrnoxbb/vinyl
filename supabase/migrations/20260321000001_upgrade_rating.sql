begin;

alter table public.reviews
  alter column rating type numeric(2,1) using rating::numeric(2,1);

alter table public.album_reviews
  alter column rating type numeric(2,1) using rating::numeric(2,1);

alter table public.artist_reviews
  alter column rating type numeric(2,1) using rating::numeric(2,1);

alter table public.reviews
  drop constraint if exists reviews_rating_half_step_check;

alter table public.album_reviews
  drop constraint if exists album_reviews_rating_half_step_check;

alter table public.artist_reviews
  drop constraint if exists artist_reviews_rating_half_step_check;

alter table public.reviews
  add constraint reviews_rating_half_step_check
  check (rating >= 0.5 and rating <= 5.0 and mod(rating, 0.5) = 0.0);

alter table public.album_reviews
  add constraint album_reviews_rating_half_step_check
  check (rating >= 0.5 and rating <= 5.0 and mod(rating, 0.5) = 0.0);

alter table public.artist_reviews
  add constraint artist_reviews_rating_half_step_check
  check (rating >= 0.5 and rating <= 5.0 and mod(rating, 0.5) = 0.0);

commit;
