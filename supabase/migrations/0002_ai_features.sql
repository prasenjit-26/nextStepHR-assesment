do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'todo_priority'
      and n.nspname = 'public'
  ) then
    create type public.todo_priority as enum ('low', 'medium', 'high');
  end if;
end
$$;

alter table public.todos
add column if not exists due_at timestamptz,
add column if not exists priority public.todo_priority not null default 'medium';

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  inserted_at timestamptz not null default now()
);

create unique index if not exists tags_user_id_name_unique
  on public.tags (user_id, name);

alter table public.tags enable row level security;

drop policy if exists "tags_select_own" on public.tags;
create policy "tags_select_own"
  on public.tags
  for select
  using (auth.uid() = user_id);

drop policy if exists "tags_insert_own" on public.tags;
create policy "tags_insert_own"
  on public.tags
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "tags_update_own" on public.tags;
create policy "tags_update_own"
  on public.tags
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "tags_delete_own" on public.tags;
create policy "tags_delete_own"
  on public.tags
  for delete
  using (auth.uid() = user_id);

create table if not exists public.todo_tags (
  todo_id uuid not null references public.todos (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  inserted_at timestamptz not null default now(),
  primary key (todo_id, tag_id)
);

create index if not exists todo_tags_todo_id_idx on public.todo_tags (todo_id);
create index if not exists todo_tags_tag_id_idx on public.todo_tags (tag_id);

alter table public.todo_tags enable row level security;

drop policy if exists "todo_tags_select_own" on public.todo_tags;
create policy "todo_tags_select_own"
  on public.todo_tags
  for select
  using (
    exists (
      select 1
      from public.todos t
      where t.id = todo_tags.todo_id
        and t.user_id = auth.uid()
    )
  );

drop policy if exists "todo_tags_insert_own" on public.todo_tags;
create policy "todo_tags_insert_own"
  on public.todo_tags
  for insert
  with check (
    exists (
      select 1
      from public.todos t
      where t.id = todo_tags.todo_id
        and t.user_id = auth.uid()
    )
    and exists (
      select 1
      from public.tags tg
      where tg.id = todo_tags.tag_id
        and tg.user_id = auth.uid()
    )
  );

drop policy if exists "todo_tags_delete_own" on public.todo_tags;
create policy "todo_tags_delete_own"
  on public.todo_tags
  for delete
  using (
    exists (
      select 1
      from public.todos t
      where t.id = todo_tags.todo_id
        and t.user_id = auth.uid()
    )
  );

create table if not exists public.subtasks (
  id uuid primary key default gen_random_uuid(),
  todo_id uuid not null references public.todos (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  is_done boolean not null default false,
  inserted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subtasks_todo_id_idx on public.subtasks (todo_id);
create index if not exists subtasks_user_id_idx on public.subtasks (user_id);

drop function if exists public.set_subtasks_updated_at();
create or replace function public.set_subtasks_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_subtasks_updated_at on public.subtasks;
create trigger set_subtasks_updated_at
before update on public.subtasks
for each row
execute function public.set_subtasks_updated_at();

drop function if exists public.set_subtasks_user_id();
create or replace function public.set_subtasks_user_id()
returns trigger
language plpgsql
as $$
declare
  todo_owner uuid;
begin
  select user_id into todo_owner from public.todos where id = new.todo_id;
  if todo_owner is null then
    raise exception 'Invalid todo_id';
  end if;
  new.user_id = todo_owner;
  return new;
end;
$$;

drop trigger if exists set_subtasks_user_id on public.subtasks;
create trigger set_subtasks_user_id
before insert on public.subtasks
for each row
execute function public.set_subtasks_user_id();

alter table public.subtasks enable row level security;

drop policy if exists "subtasks_select_own" on public.subtasks;
create policy "subtasks_select_own"
  on public.subtasks
  for select
  using (auth.uid() = user_id);

drop policy if exists "subtasks_insert_own" on public.subtasks;
create policy "subtasks_insert_own"
  on public.subtasks
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "subtasks_update_own" on public.subtasks;
create policy "subtasks_update_own"
  on public.subtasks
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "subtasks_delete_own" on public.subtasks;
create policy "subtasks_delete_own"
  on public.subtasks
  for delete
  using (auth.uid() = user_id);
