# A-Levels Student Tools Portal with Supabase Authentication and Monochrome Style

This project will bundle the two primary features (`dashboard.tsx` and `past-paper.tsx`) into a modern, minimalist black-and-white Next.js web application. Authentication will be managed via Supabase, protecting student scores and calendars.

## User Review Required

> [!IMPORTANT]
> **Supabase Configuration Actions Required**: 
> You will need to create a free project on [Supabase](https://supabase.com) and retrieve your **API URL** and **Anon Key**.
> We will generate a `.env.local.example` file that you will need to copy to `.env.local` and populate with your credentials.
>
> **SQL Queries Execution**:
> You must execute the SQL commands below in your Supabase project's SQL Editor to set up database tables with Row Level Security (RLS).

## Open Questions
- *Are there any additional A-Level tools you want to incorporate on the landing page in the future, or should we keep it strictly focused on the Dashboard and Past Paper Search?*
- *Would you like me to disable email confirmation in Supabase by default (making signup/login instant), or do you want to keep verification active? (We recommend disabling it for rapid testing).*

## Proposed Changes

We will bootstrap a Next.js App Router project in the workspace, add the `@supabase/ssr` dependency, configure the auth middleware, create pages, and modernize the visual style.

---

### [Component: Next.js Boilerplate & Config]

Bootstrap Next.js, set up TypeScript, Tailwind, and Supabase dependencies.

#### [NEW] [next.config.ts](file:///Users/wongkinonchristopher/Desktop/Code%20projects/Software%20Development/AILevels/next.config.ts)
#### [NEW] [package.json](file:///Users/wongkinonchristopher/Desktop/Code%20projects/Software%20Development/AILevels/package.json)
#### [NEW] [tsconfig.json](file:///Users/wongkinonchristopher/Desktop/Code%20projects/Software%20Development/AILevels/tsconfig.json)
#### [NEW] [.env.local.example](file:///Users/wongkinonchristopher/Desktop/Code%20projects/Software%20Development/AILevels/.env.local.example)

---

### [Component: Supabase Integration & Middleware]

Set up client-side and server-side Supabase client initialization files, and add authentication middleware to secure `/dashboard` and `/past-papers` routes.

#### [NEW] [client.ts](file:///Users/wongkinonchristopher/Desktop/Code%20projects/Software%20Development/AILevels/src/utils/supabase/client.ts)
#### [NEW] [server.ts](file:///Users/wongkinonchristopher/Desktop/Code%20projects/Software%20Development/AILevels/src/utils/supabase/server.ts)
#### [NEW] [middleware.ts](file:///Users/wongkinonchristopher/Desktop/Code%20projects/Software%20Development/AILevels/src/utils/supabase/middleware.ts)
#### [NEW] [middleware.ts](file:///Users/wongkinonchristopher/Desktop/Code%20projects/Software%20Development/AILevels/src/middleware.ts)

---

### [Component: Auth, Navigation, & Landing Pages]

Create the landing page, the unified login/signup portal, and the layout wrapping navigation with monochromatic aesthetics.

#### [NEW] [layout.tsx](file:///Users/wongkinonchristopher/Desktop/Code%20projects/Software%20Development/AILevels/src/app/layout.tsx)
#### [NEW] [page.tsx](file:///Users/wongkinonchristopher/Desktop/Code%20projects/Software%20Development/AILevels/src/app/page.tsx)
#### [NEW] [page.tsx](file:///Users/wongkinonchristopher/Desktop/Code%20projects/Software%20Development/AILevels/src/app/auth/page.tsx)
#### [NEW] [global.css](file:///Users/wongkinonchristopher/Desktop/Code%20projects/Software%20Development/AILevels/src/app/global.css)

---

### [Component: Student Tools (Dashboard & Past Papers)]

Move the existing components to their App Router directories, clean up local styles, change the primary color systems to high-contrast black/white/gray, and adapt theme behaviors.

#### [DELETE] [dashboard.tsx](file:///Users/wongkinonchristopher/Desktop/Code%20projects/Software%20Development/AILevels/dashboard.tsx)
#### [DELETE] [past-paper.tsx](file:///Users/wongkinonchristopher/Desktop/Code%20projects/Software%20Development/AILevels/past-paper.tsx)
#### [NEW] [page.tsx](file:///Users/wongkinonchristopher/Desktop/Code%20projects/Software%20Development/AILevels/src/app/dashboard/page.tsx)
#### [NEW] [page.tsx](file:///Users/wongkinonchristopher/Desktop/Code%20projects/Software%20Development/AILevels/src/app/past-papers/page.tsx)

---

## Supabase Instructions

### 1. Database Setup
Execute the following SQL block in the **SQL Editor** of your Supabase console to create the tables and secure them:

```sql
-- Create dashboard_scores table
create table if not exists public.dashboard_scores (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  content jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, title)
);

-- Create dashboard_calendar table
create table if not exists public.dashboard_calendar (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  content jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, title)
);

-- Enable Row Level Security (RLS)
alter table public.dashboard_scores enable row level security;
alter table public.dashboard_calendar enable row level security;

-- RLS Policies for dashboard_scores
create policy "Users can view their own scores" on public.dashboard_scores
  for select using (auth.uid() = user_id);

create policy "Users can insert their own scores" on public.dashboard_scores
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own scores" on public.dashboard_scores
  for update using (auth.uid() = user_id);

create policy "Users can delete their own scores" on public.dashboard_scores
  for delete using (auth.uid() = user_id);

-- RLS Policies for dashboard_calendar
create policy "Users can view their own calendar" on public.dashboard_calendar
  for select using (auth.uid() = user_id);

create policy "Users can insert their own calendar" on public.dashboard_calendar
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own calendar" on public.dashboard_calendar
  for update using (auth.uid() = user_id);

create policy "Users can delete their own calendar" on public.dashboard_calendar
  for delete using (auth.uid() = user_id);
```

### 2. Disable Email Confirmation (Recommended for Testing)
1. Go to your **Supabase Dashboard**.
2. Navigate to **Authentication** -> **Providers** -> **Email**.
3. Toggle off **Confirm email**. This will allow you to sign up and immediately sign in without checking confirmation links.

---

### Phase 2: Dashboard Enhancements & Mean Score Statistics Modal

This phase introduces UX improvements to the dashboard table, styles the mode dropdown to be flat, and builds a comprehensive statistics popup when mean score footer cells are clicked.

## Proposed Changes

---

### [Component: Dashboard UI & UX Enhancements]

Modify the layout and styling in [page.tsx](file:///Users/wongkinonchristopher/Desktop/Code%20projects/Software%20Development/AILevels/src/app/dashboard/page.tsx):
- **No Bounce / Rubber-Band Effect**: Add `overscroll-behavior: none;` to the `.table-container` in style rules to prevent the window/table boundary from elastic bouncing.
- **Header Layout Alignments**: Adjust the first `th` cell from `justify-center` to `justify-between` with padding so the mode toggle and the configuration menu buttons are pushed to opposite sides instead of grouped in the center.
- **Flat Mode Dropdown**: Strip borders (`border`, `border-zinc-200`, `dark:border-zinc-800`) and shadows (`shadow-xl`) from the `.exam-level-dropdown` wrapper.
- **Mean Cell Click Interactions**: Update table foot mean cells to be interactive buttons (`cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-900`) and assign click handlers.

---

### [Component: Mean Score Statistics Popup Modal]

Build a new interactive statistics popup modal in [page.tsx](file:///Users/wongkinonchristopher/Desktop/Code%20projects/Software%20Development/AILevels/src/app/dashboard/page.tsx):
- **State Controls**: Add `selectedMeanStats` state tracking `{ subject: string; paper: string } | null`.
- **Performance Summary Indicators**: Calculate and display average percentage, letter grade estimates (A*, A, B, etc.), total attempts, peak score, and lowest score.
- **SVG Line & Area Trend Graph**: Construct a custom, crisp SVG line/area chart in the modal tracking scores over time in chronological order, with dark mode compatibility and gridlines.
- **Score Prediction & Advice Engine**: Use historical progression to compute a predicted next-sitting score, paired with action-oriented study advice based on the overall level of performance.

---

## Verification Plan

### Automated Verification
- Run typescript compilation `npx tsc --noEmit` to confirm no type/syntax errors.
- Run next build checks `npm run build` to confirm compiling is successful.

### Manual Verification
- Scroll to the ends of the dashboard table in Chrome/Safari to check that rubber banding/overscroll behavior is disabled.
- Check table header first cell: verify that the IAL/IGCSE toggle and the subject settings menu are side-by-side at opposite edges of the cell.
- Toggle the IAL/IGCSE dropdown menu; check that it appears flat without borders or shadow effects.
- Click any mean score cells at the bottom: verify the Statistics Modal appears, displays the SVG trend chart, shows accurate stats, predicted score, grade estimation, and revision advice.
- Test modal dismissal via the escape key, close button, or background click.
