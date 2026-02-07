-- Ensure tags table has proper unique constraint
DO $$
BEGIN
  -- Check if unique constraint exists, if not add it
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'tags_user_id_name_unique' 
    AND conrelid = 'public.tags'::regclass
  ) THEN
    ALTER TABLE public.tags ADD CONSTRAINT tags_user_id_name_unique UNIQUE (user_id, name);
  END IF;
END $$;

-- Ensure todo_tags has primary key (it should from the original migration)
-- Check if primary key exists, recreate if needed
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'todo_tags_pkey' 
    AND conrelid = 'public.todo_tags'::regclass
  ) THEN
    -- First drop any existing constraint with different name
    ALTER TABLE public.todo_tags DROP CONSTRAINT IF EXISTS todo_tags_todo_id_tag_id_pkey;
    -- Add primary key
    ALTER TABLE public.todo_tags ADD PRIMARY KEY (todo_id, tag_id);
  END IF;
END $$;
