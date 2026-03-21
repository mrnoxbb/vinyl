alter table public.users enable row level security;
alter table public.reviews enable row level security;
alter table public.album_reviews enable row level security;
alter table public.artist_reviews enable row level security;
alter table public.review_likes enable row level security;
alter table public.album_likes enable row level security;
alter table public.artist_likes enable row level security;
alter table public.follows enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_settings enable row level security;
alter table public.push_tokens enable row level security;
alter table public.diary_entries enable row level security;
alter table public.lists enable row level security;
alter table public.list_items enable row level security;
alter table public.badges enable row level security;
alter table public.subscriptions enable row level security;
alter table public.helpful_votes enable row level security;

drop policy if exists "users_select_all" on public.users;
create policy "users_select_all"
on public.users
for select
using (true);

drop policy if exists "users_insert_service_role" on public.users;
create policy "users_insert_service_role"
on public.users
for insert
with check (auth.role() = 'service_role');

drop policy if exists "users_delete_service_role" on public.users;
create policy "users_delete_service_role"
on public.users
for delete
using (auth.role() = 'service_role');

drop policy if exists "users_update_own_row" on public.users;
create policy "users_update_own_row"
on public.users
for update
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "reviews_select_all" on public.reviews;
create policy "reviews_select_all"
on public.reviews
for select
using (true);

drop policy if exists "reviews_insert_own" on public.reviews;
create policy "reviews_insert_own"
on public.reviews
for insert
with check (user_id = auth.uid());

drop policy if exists "reviews_update_own" on public.reviews;
create policy "reviews_update_own"
on public.reviews
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "reviews_delete_own" on public.reviews;
create policy "reviews_delete_own"
on public.reviews
for delete
using (user_id = auth.uid());

drop policy if exists "album_reviews_select_all" on public.album_reviews;
create policy "album_reviews_select_all"
on public.album_reviews
for select
using (true);

drop policy if exists "album_reviews_insert_own" on public.album_reviews;
create policy "album_reviews_insert_own"
on public.album_reviews
for insert
with check (user_id = auth.uid());

drop policy if exists "album_reviews_update_own" on public.album_reviews;
create policy "album_reviews_update_own"
on public.album_reviews
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "album_reviews_delete_own" on public.album_reviews;
create policy "album_reviews_delete_own"
on public.album_reviews
for delete
using (user_id = auth.uid());

drop policy if exists "artist_reviews_select_all" on public.artist_reviews;
create policy "artist_reviews_select_all"
on public.artist_reviews
for select
using (true);

drop policy if exists "artist_reviews_insert_own" on public.artist_reviews;
create policy "artist_reviews_insert_own"
on public.artist_reviews
for insert
with check (user_id = auth.uid());

drop policy if exists "artist_reviews_update_own" on public.artist_reviews;
create policy "artist_reviews_update_own"
on public.artist_reviews
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "artist_reviews_delete_own" on public.artist_reviews;
create policy "artist_reviews_delete_own"
on public.artist_reviews
for delete
using (user_id = auth.uid());

drop policy if exists "review_likes_select_all" on public.review_likes;
create policy "review_likes_select_all"
on public.review_likes
for select
using (true);

drop policy if exists "review_likes_insert_own" on public.review_likes;
create policy "review_likes_insert_own"
on public.review_likes
for insert
with check (user_id = auth.uid());

drop policy if exists "review_likes_delete_own" on public.review_likes;
create policy "review_likes_delete_own"
on public.review_likes
for delete
using (user_id = auth.uid());

drop policy if exists "album_likes_select_all" on public.album_likes;
create policy "album_likes_select_all"
on public.album_likes
for select
using (true);

drop policy if exists "album_likes_insert_own" on public.album_likes;
create policy "album_likes_insert_own"
on public.album_likes
for insert
with check (user_id = auth.uid());

drop policy if exists "album_likes_delete_own" on public.album_likes;
create policy "album_likes_delete_own"
on public.album_likes
for delete
using (user_id = auth.uid());

drop policy if exists "artist_likes_select_all" on public.artist_likes;
create policy "artist_likes_select_all"
on public.artist_likes
for select
using (true);

drop policy if exists "artist_likes_insert_own" on public.artist_likes;
create policy "artist_likes_insert_own"
on public.artist_likes
for insert
with check (user_id = auth.uid());

drop policy if exists "artist_likes_delete_own" on public.artist_likes;
create policy "artist_likes_delete_own"
on public.artist_likes
for delete
using (user_id = auth.uid());

drop policy if exists "follows_select_all" on public.follows;
create policy "follows_select_all"
on public.follows
for select
using (true);

drop policy if exists "follows_insert_own" on public.follows;
create policy "follows_insert_own"
on public.follows
for insert
with check (follower_id = auth.uid());

drop policy if exists "follows_delete_own" on public.follows;
create policy "follows_delete_own"
on public.follows
for delete
using (follower_id = auth.uid());

drop policy if exists "diary_entries_select_own" on public.diary_entries;
create policy "diary_entries_select_own"
on public.diary_entries
for select
using (user_id = auth.uid());

drop policy if exists "diary_entries_insert_own" on public.diary_entries;
create policy "diary_entries_insert_own"
on public.diary_entries
for insert
with check (user_id = auth.uid());

drop policy if exists "diary_entries_update_own" on public.diary_entries;
create policy "diary_entries_update_own"
on public.diary_entries
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "diary_entries_delete_own" on public.diary_entries;
create policy "diary_entries_delete_own"
on public.diary_entries
for delete
using (user_id = auth.uid());

drop policy if exists "lists_select_public_or_own" on public.lists;
create policy "lists_select_public_or_own"
on public.lists
for select
using (is_public = true or user_id = auth.uid());

drop policy if exists "lists_insert_own" on public.lists;
create policy "lists_insert_own"
on public.lists
for insert
with check (user_id = auth.uid());

drop policy if exists "lists_update_own" on public.lists;
create policy "lists_update_own"
on public.lists
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "lists_delete_own" on public.lists;
create policy "lists_delete_own"
on public.lists
for delete
using (user_id = auth.uid());

drop policy if exists "list_items_select_via_list_access" on public.list_items;
create policy "list_items_select_via_list_access"
on public.list_items
for select
using (
  exists (
    select 1
    from public.lists
    where lists.id = list_items.list_id
      and (lists.is_public = true or lists.user_id = auth.uid())
  )
);

drop policy if exists "list_items_insert_via_owner" on public.list_items;
create policy "list_items_insert_via_owner"
on public.list_items
for insert
with check (
  exists (
    select 1
    from public.lists
    where lists.id = list_items.list_id
      and lists.user_id = auth.uid()
  )
);

drop policy if exists "list_items_update_via_owner" on public.list_items;
create policy "list_items_update_via_owner"
on public.list_items
for update
using (
  exists (
    select 1
    from public.lists
    where lists.id = list_items.list_id
      and lists.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.lists
    where lists.id = list_items.list_id
      and lists.user_id = auth.uid()
  )
);

drop policy if exists "list_items_delete_via_owner" on public.list_items;
create policy "list_items_delete_via_owner"
on public.list_items
for delete
using (
  exists (
    select 1
    from public.lists
    where lists.id = list_items.list_id
      and lists.user_id = auth.uid()
  )
);

drop policy if exists "badges_select_all" on public.badges;
create policy "badges_select_all"
on public.badges
for select
using (true);

drop policy if exists "badges_insert_service_role" on public.badges;
create policy "badges_insert_service_role"
on public.badges
for insert
with check (auth.role() = 'service_role');

drop policy if exists "push_tokens_select_own" on public.push_tokens;
create policy "push_tokens_select_own"
on public.push_tokens
for select
using (user_id = auth.uid());

drop policy if exists "push_tokens_insert_own" on public.push_tokens;
create policy "push_tokens_insert_own"
on public.push_tokens
for insert
with check (user_id = auth.uid());

drop policy if exists "push_tokens_update_own" on public.push_tokens;
create policy "push_tokens_update_own"
on public.push_tokens
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "push_tokens_delete_own" on public.push_tokens;
create policy "push_tokens_delete_own"
on public.push_tokens
for delete
using (user_id = auth.uid());

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
on public.notifications
for select
using (recipient_id = auth.uid());

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
on public.notifications
for update
using (recipient_id = auth.uid())
with check (recipient_id = auth.uid());

drop policy if exists "notifications_insert_service_role" on public.notifications;
create policy "notifications_insert_service_role"
on public.notifications
for insert
with check (auth.role() = 'service_role');

drop policy if exists "notification_settings_select_own" on public.notification_settings;
create policy "notification_settings_select_own"
on public.notification_settings
for select
using (user_id = auth.uid());

drop policy if exists "notification_settings_insert_own" on public.notification_settings;
create policy "notification_settings_insert_own"
on public.notification_settings
for insert
with check (user_id = auth.uid());

drop policy if exists "notification_settings_update_own" on public.notification_settings;
create policy "notification_settings_update_own"
on public.notification_settings
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own"
on public.subscriptions
for select
using (user_id = auth.uid());

drop policy if exists "subscriptions_insert_service_role" on public.subscriptions;
create policy "subscriptions_insert_service_role"
on public.subscriptions
for insert
with check (auth.role() = 'service_role');

drop policy if exists "subscriptions_update_service_role" on public.subscriptions;
create policy "subscriptions_update_service_role"
on public.subscriptions
for update
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists "helpful_votes_select_all" on public.helpful_votes;
create policy "helpful_votes_select_all"
on public.helpful_votes
for select
using (true);

drop policy if exists "helpful_votes_insert_own" on public.helpful_votes;
create policy "helpful_votes_insert_own"
on public.helpful_votes
for insert
with check (user_id = auth.uid());

drop policy if exists "helpful_votes_delete_own" on public.helpful_votes;
create policy "helpful_votes_delete_own"
on public.helpful_votes
for delete
using (user_id = auth.uid());
