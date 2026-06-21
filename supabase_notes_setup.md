# Notes Setup SQL

Run the following SQL in your Supabase Dashboard SQL Editor to create the `notes` table and enable RLS policies:

```sql
CREATE TABLE IF NOT EXISTS public.notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled Note',
  content TEXT DEFAULT '',
  color TEXT DEFAULT 'grey', -- grey, gold, green, red, blue
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- 1. Users can select/read their own notes
CREATE POLICY "Users can select own notes" 
ON public.notes FOR SELECT 
USING (auth.uid() = user_id);

-- 2. Users can insert their own notes
CREATE POLICY "Users can insert own notes" 
ON public.notes FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 3. Users can update their own notes
CREATE POLICY "Users can update own notes" 
ON public.notes FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 4. Users can delete their own notes
CREATE POLICY "Users can delete own notes" 
ON public.notes FOR DELETE 
USING (auth.uid() = user_id);

-- Trigger for auto updated_at timestamp
CREATE TRIGGER set_notes_timestamp
BEFORE UPDATE ON public.notes
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();
```
