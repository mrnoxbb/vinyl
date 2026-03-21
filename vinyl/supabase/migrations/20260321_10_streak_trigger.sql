create or replace function public.update_user_streak()
returns trigger
language plpgsql
as $$
declare
  previous_review_date date;
  current_streak integer;
  next_streak integer;
  total_reviews integer;
  next_level text;
begin
  select last_review_date, review_streak
  into previous_review_date, current_streak
  from public.users
  where id = new.user_id
  for update;

  if previous_review_date = current_date then
    next_streak := greatest(coalesce(current_streak, 0), 1);
  elsif previous_review_date = current_date - 1 then
    next_streak := coalesce(current_streak, 0) + 1;
  else
    next_streak := 1;
  end if;

  select count(*)
  into total_reviews
  from (
    select id from public.reviews where user_id = new.user_id
    union all
    select id from public.album_reviews where user_id = new.user_id
    union all
    select id from public.artist_reviews where user_id = new.user_id
  ) as review_counts;

  next_level := case
    when total_reviews >= 200 then 'Legend'
    when total_reviews >= 50 then 'Connoisseur'
    when total_reviews >= 10 then 'Critic'
    else 'Listener'
  end;

  update public.users
  set
    last_review_date = current_date,
    review_streak = next_streak,
    level = next_level
  where id = new.user_id;

  return new;
end;
$$;

drop trigger if exists reviews_update_user_streak on public.reviews;
create trigger reviews_update_user_streak
after insert on public.reviews
for each row
execute function public.update_user_streak();

drop trigger if exists album_reviews_update_user_streak on public.album_reviews;
create trigger album_reviews_update_user_streak
after insert on public.album_reviews
for each row
execute function public.update_user_streak();

drop trigger if exists artist_reviews_update_user_streak on public.artist_reviews;
create trigger artist_reviews_update_user_streak
after insert on public.artist_reviews
for each row
execute function public.update_user_streak();
