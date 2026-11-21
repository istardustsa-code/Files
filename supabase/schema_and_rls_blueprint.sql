-- ============================================================================
-- ملفاتي (FILES BY LAMA) — Supabase PostgreSQL & Private Storage RLS Blueprint
-- Phase 2 Reference Schema — Do NOT expose service_role keys to the frontend.
-- ============================================================================

-- 1. User Roles Enum
create type public.app_role as enum ('super_admin', 'manager', 'teacher');
create type public.review_status as enum ('pending', 'approved', 'needs_revision');

-- 2. Schools & Educational Groups
create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique not null,
  stage text not null,
  city text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.educational_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  school_id uuid references public.schools(id) on delete cascade,
  specialty text not null,
  created_at timestamptz not null default now()
);

-- 3. Profiles (linked to auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text unique not null,
  role public.app_role not null default 'teacher',
  job_title text not null,
  specialty text,
  qualification text,
  phone text,
  bio text,
  school_id uuid references public.schools(id) on delete set null,
  group_id uuid references public.educational_groups(id) on delete set null,
  manager_id uuid references public.profiles(id) on delete set null,
  is_active boolean not null default true,
  storage_quota_mb integer not null default 500,
  created_at timestamptz not null default now(),
  last_active_at timestamptz
);

-- Manager <-> School assignment bridge
create table if not exists public.manager_school_assignments (
  manager_id uuid references public.profiles(id) on delete cascade,
  school_id uuid references public.schools(id) on delete cascade,
  primary key (manager_id, school_id)
);

-- 4. Dynamic Portfolio Sections
create table if not exists public.portfolio_sections (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  icon_name text not null default 'Folder',
  accent_color text not null default '#A8B9A5',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  is_required boolean not null default false,
  is_system_default boolean not null default true,
  owner_id uuid references public.profiles(id) on delete cascade,
  category text not null default 'عام',
  custom_fields jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- 5. Portfolio Files (Private Storage Metadata)
create table if not exists public.portfolio_files (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  original_file_name text not null,
  description text not null default '',
  section_id uuid references public.portfolio_sections(id) on delete restrict,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  file_type text not null,
  mime_type text not null,
  size_bytes bigint not null,
  storage_path text not null unique,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  review_status public.review_status not null default 'pending',
  review_note text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  custom_field_values jsonb not null default '{}'::jsonb,
  uploaded_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- Enable Strict Row Level Security (RLS)
-- ============================================================================
alter table public.profiles enable row level security;
alter table public.portfolio_sections enable row level security;
alter table public.portfolio_files enable row level security;

-- Helper function to read current user's role safely
create or replace function public.current_user_role()
returns public.app_role
language sql
stable
security definer
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- Teacher isolation policy: teachers can ONLY read/write their own files.
create policy "teachers_own_files_select"
  on public.portfolio_files for select
  using (
    owner_id = auth.uid()
    or public.current_user_role() = 'super_admin'
    or (
      public.current_user_role() = 'manager'
      and exists (
        select 1 from public.profiles teacher
        where teacher.id = portfolio_files.owner_id
          and teacher.manager_id = auth.uid()
      )
    )
  );

create policy "teachers_own_files_insert"
  on public.portfolio_files for insert
  with check (
    owner_id = auth.uid()
    or public.current_user_role() = 'super_admin'
  );

create policy "teachers_own_files_update"
  on public.portfolio_files for update
  using (
    owner_id = auth.uid()
    or public.current_user_role() = 'super_admin'
    or (
      public.current_user_role() = 'manager'
      and exists (
        select 1 from public.profiles teacher
        where teacher.id = portfolio_files.owner_id
          and teacher.manager_id = auth.uid()
      )
    )
  );

-- Private Storage Bucket Policy (portfolio-files MUST have public = false)
insert into storage.buckets (id, name, public)
values ('portfolio-files', 'portfolio-files', false)
on conflict (id) do nothing;
