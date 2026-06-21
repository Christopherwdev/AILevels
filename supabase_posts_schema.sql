  -- Paste this SQL script into the SQL Editor in your Supabase Console:

  -- 1. CREATE POSTS TABLE
  CREATE TABLE IF NOT EXISTS public.posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
  );

  ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "Anyone can view posts" ON public.posts;
  CREATE POLICY "Anyone can view posts" ON public.posts FOR SELECT USING (true);

  DROP POLICY IF EXISTS "Users can create posts" ON public.posts;
  CREATE POLICY "Users can create posts" ON public.posts FOR INSERT WITH CHECK (auth.uid() = user_id);

  DROP POLICY IF EXISTS "Users can delete their own posts" ON public.posts;
  CREATE POLICY "Users can delete their own posts" ON public.posts FOR DELETE USING (auth.uid() = user_id);

  -- 2. CREATE COMMENTS TABLE
  CREATE TABLE IF NOT EXISTS public.comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
  );

  ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "Anyone can view comments" ON public.comments;
  CREATE POLICY "Anyone can view comments" ON public.comments FOR SELECT USING (true);

  DROP POLICY IF EXISTS "Users can create comments" ON public.comments;
  CREATE POLICY "Users can create comments" ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);

  DROP POLICY IF EXISTS "Users can delete their own comments" ON public.comments;
  CREATE POLICY "Users can delete their own comments" ON public.comments FOR DELETE USING (auth.uid() = user_id);

  -- 3. CREATE LIKES TABLE
  CREATE TABLE IF NOT EXISTS public.likes (
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    PRIMARY KEY (post_id, user_id)
  );

  ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "Anyone can view likes" ON public.likes;
  CREATE POLICY "Anyone can view likes" ON public.likes FOR SELECT USING (true);

  DROP POLICY IF EXISTS "Users can toggle their own likes" ON public.likes;
  CREATE POLICY "Users can toggle their own likes" ON public.likes FOR INSERT WITH CHECK (auth.uid() = user_id);

  DROP POLICY IF EXISTS "Users can delete their own likes" ON public.likes;
  CREATE POLICY "Users can delete their own likes" ON public.likes FOR DELETE USING (auth.uid() = user_id);

  -- 4. CREATE FOLLOWS TABLE
  CREATE TABLE IF NOT EXISTS public.follows (
    follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    PRIMARY KEY (follower_id, following_id)
  );

  ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "Anyone can view follows" ON public.follows;
  CREATE POLICY "Anyone can view follows" ON public.follows FOR SELECT USING (true);

  DROP POLICY IF EXISTS "Users can follow others" ON public.follows;
  CREATE POLICY "Users can follow others" ON public.follows FOR INSERT WITH CHECK (auth.uid() = follower_id);

  DROP POLICY IF EXISTS "Users can unfollow others" ON public.follows;
  CREATE POLICY "Users can unfollow others" ON public.follows FOR DELETE USING (auth.uid() = follower_id);

  -- 5. UPDATE PROFILES SELECT POLICY
  -- Allow all users to read profiles so searching and navigating to profiles works.
  DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
  DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
  CREATE POLICY "Anyone can view profiles" ON public.profiles FOR SELECT USING (true);
