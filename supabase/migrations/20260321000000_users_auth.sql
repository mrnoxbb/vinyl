begin;

alter table public.users
  alter column spotify_id drop not null;

alter table public.users
  add column if not exists username text,
  add column if not exists email text;

update public.users
set username = coalesce(
  username,
  concat(
    coalesce(
      nullif(
        lower(
          regexp_replace(
            coalesce(display_name, split_part(coalesce(email, spotify_id, id::text), '@', 1), 'listener'),
            '[^a-z0-9_]+',
            '',
            'g'
          )
        ),
        ''
      ),
      'listener'
    ),
    '_',
    substr(replace(id::text, '-', ''), 1, 6)
  )
)
where username is null;

alter table public.users
  alter column username set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'users_username_key'
      and conrelid = 'public.users'::regclass
  ) then
    alter table public.users
      add constraint users_username_key unique (username);
  end if;
end
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  generated_username text;
begin
  generated_username := coalesce(
    nullif(new.raw_user_meta_data ->> 'username', ''),
    concat(
      split_part(coalesce(new.email, new.id::text), '@', 1),
      '_',
      substr(replace(new.id::text, '-', ''), 1, 6)
    )
  );

  generated_username := lower(
    regexp_replace(generated_username, '[^a-z0-9_]+', '', 'g')
  );

  if generated_username = '' then
    generated_username := concat('user_', substr(replace(new.id::text, '-', ''), 1, 12));
  end if;

  insert into public.users (id, username, email, display_name)
  values (
    new.id,
    generated_username,
    new.email,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      nullif(new.raw_user_meta_data ->> 'username', ''),
      split_part(coalesce(new.email, new.id::text), '@', 1),
      'VINYL User'
    )
  )
  on conflict (id) do update
  set
    username = excluded.username,
    email = excluded.email;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

commit;
