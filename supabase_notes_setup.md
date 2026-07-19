# Supabase Setup

Follow the SQL scripts below to configure your Supabase instance to support plans, status upgrades, and tutor request bookings.

---

## Part 1: Add Subscription Status Column

To support user plans and subscription locks, run this script to add the status column to the `profiles` table:

```sql
-- 1. Add subscription_status column to the profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'free';

-- 2. Add constraint to allow only valid values: 'free', 'premium', or 'tutor_student'
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS check_subscription_status;

ALTER TABLE public.profiles
ADD CONSTRAINT check_subscription_status 
CHECK (subscription_status IN ('free', 'premium', 'tutor_student'));

-- 3. Set all existing profiles to 'free' if they don't have a value
UPDATE public.profiles
SET subscription_status = 'free'
WHERE subscription_status IS NULL;
```

### How to change a user's status manually

#### Option A: In the Table Editor (No SQL)
1. Go to **Table Editor** on the left menu.
2. Select the `profiles` table.
3. Find the target user row, double-click the `subscription_status` cell and type `'premium'` or `'tutor_student'`.
4. Click Save.

#### Option B: In the SQL Editor
Execute this query:
```sql
UPDATE public.profiles
SET subscription_status = 'premium' -- Or 'tutor_student'
WHERE username = 'target_username';
```

---

## Part 2: Tutor Bookings Table

Run this script in the **SQL Editor** to create the bookings table to track pending/approved student sessions:

```sql
-- Create tutor_bookings table
CREATE TABLE IF NOT EXISTS public.tutor_bookings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    username text NOT NULL,
    tutor_id text NOT NULL,
    tutor_name text NOT NULL,
    slots text[] NOT NULL,
    status text DEFAULT 'pending' NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT check_booking_status CHECK (status IN ('pending', 'approved'))
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.tutor_bookings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to prevent errors
DROP POLICY IF EXISTS "Users can insert their own bookings" ON public.tutor_bookings;
DROP POLICY IF EXISTS "Users can select their own bookings" ON public.tutor_bookings;
DROP POLICY IF EXISTS "Users can delete their own bookings" ON public.tutor_bookings;

-- Create policies for RLS
CREATE POLICY "Users can insert their own bookings" 
ON public.tutor_bookings FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can select their own bookings" 
ON public.tutor_bookings FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bookings" 
ON public.tutor_bookings FOR DELETE 
USING (auth.uid() = user_id);
```

### How to approve a student booking manually

#### Option A: In the Table Editor
1. Go to **Table Editor** -> select `tutor_bookings`.
2. Locate the student's booking row.
3. Change the `status` column value from `'pending'` to `'approved'`.

#### Option B: In the SQL Editor
Execute this query:
```sql
UPDATE public.tutor_bookings
SET status = 'approved'
WHERE username = 'student_username' AND tutor_id = 'tutor-caris';
```
