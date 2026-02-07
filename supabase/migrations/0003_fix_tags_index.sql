-- Drop old index if exists
drop index if exists public.tags_user_id_name_unique;

-- Add unique constraint (required for PostgREST onConflict to work)
alter table public.tags
drop constraint if exists tags_user_id_name_unique;

alter table public.tags
add constraint tags_user_id_name_unique unique (user_id, name);

-- Add unique constraint for todo_tags (required for upsert onConflict)
alter table public.todo_tags
drop constraint if exists todo_tags_pkey;

alter table public.todo_tags
add constraint todo_tags_pkey primary key (todo_id, tag_id);
