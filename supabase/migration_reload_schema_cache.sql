-- Run this if community posts (or any embedded-relationship query) return
-- empty even though rows exist in the table.
--
-- PostgREST (Supabase's auto-generated API layer) caches the database
-- schema, including foreign key relationships, so it can support queries
-- like `.select("profiles(full_name)")`. That cache doesn't always
-- refresh immediately after a schema change made via the SQL Editor
-- (such as the community_posts.user_id -> profiles foreign key fix) —
-- this tells it to reload right now instead of waiting.

NOTIFY pgrst, 'reload schema';
