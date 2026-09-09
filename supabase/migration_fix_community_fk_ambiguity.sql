-- Fix: "Could not embed because more than one relationship was found for
-- 'community_posts' and 'profiles'"
--
-- This happens when community_posts.user_id (or another column) ends up
-- with more than one foreign key pointing at profiles/auth.users —
-- PostgREST can no longer tell which relationship to use for an embedded
-- select like `.select("profiles(full_name)")`. Likely cause: `create
-- table if not exists` never alters a table that already exists, so if
-- this table was created before a later fix to its foreign key, both the
-- old and new constraints can end up present at once.
--
-- Run the diagnostic query first (see the chat) to see what's actually
-- there, then run this to clean it up to exactly one correct constraint.

do $$
declare
  r record;
begin
  -- Drop every foreign key on community_posts.user_id, whatever it's
  -- currently named or pointing at, so we can add back exactly one.
  for r in
    select conname
    from pg_constraint
    where conrelid = 'public.community_posts'::regclass
      and contype = 'f'
      and conname in (
        select conname from pg_constraint c
        join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any(c.conkey)
        where c.conrelid = 'public.community_posts'::regclass
          and a.attname = 'user_id'
          and c.contype = 'f'
      )
  loop
    execute format('alter table public.community_posts drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.community_posts
  add constraint community_posts_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade;

-- Same potential issue could exist on community_comments and
-- community_likes — clean those up too while we're here.
do $$
declare
  r record;
begin
  for r in
    select conname
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any(c.conkey)
    where c.conrelid = 'public.community_comments'::regclass
      and a.attname = 'user_id'
      and c.contype = 'f'
  loop
    execute format('alter table public.community_comments drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.community_comments
  add constraint community_comments_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade;

do $$
declare
  r record;
begin
  for r in
    select conname
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any(c.conkey)
    where c.conrelid = 'public.community_likes'::regclass
      and a.attname = 'user_id'
      and c.contype = 'f'
  loop
    execute format('alter table public.community_likes drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.community_likes
  add constraint community_likes_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade;

-- PostgREST needs to know the schema changed.
NOTIFY pgrst, 'reload schema';
