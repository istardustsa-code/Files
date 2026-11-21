-- ============================================================================
-- Migration 001: Core Schema for ملفاتي (FILES BY LAMA)
-- Educational Portfolio SaaS — PostgreSQL Tables, Enums & Constraints
-- ============================================================================

create extension if not exists "pgcrypto";

-- 1. Domain Enums
do $$ begin
  create type public.app_role as enum ('super_admin', 'manager', 'teacher');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.review_status as enum ('pending', 'approved', 'needs_revision');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.file_type_category as enum ('pdf', 'word', 'powerpoint', 'excel', 'image');
exception when duplicate_object then null; end $$;

-- 2. Schools & Educational Groups
create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  stage text not null,
  city text not null,
  manager_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.educational_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  school_id uuid not null references public.schools(id) on delete cascade,
  manager_id uuid,
  specialty text not null default 'عام',
  created_at timestamptz not null default now()
);

-- 3. User Profiles (1-to-1 with auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  role public.app_role not null default 'teacher',
  job_title text not null default 'معلم',
  specialty text,
  qualification text,
  phone text,
  bio text,
  school_id uuid references public.schools(id) on delete set null,
  group_id uuid references public.educational_groups(id) on delete set null,
  manager_id uuid references public.profiles(id) on delete set null,
  allow_manager_view boolean not null default true,
  is_active boolean not null default true,
  storage_quota_mb integer not null default 500,
  created_at timestamptz not null default now(),
  last_active_at timestamptz default now()
);

-- Link schools.manager_id and educational_groups.manager_id cleanly to profiles
do $$ begin
  alter table public.schools
    add constraint schools_manager_fk
    foreign key (manager_id) references public.profiles(id) on delete set null;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.educational_groups
    add constraint groups_manager_fk
    foreign key (manager_id) references public.profiles(id) on delete set null;
exception when duplicate_object then null; end $$;

-- 4. Many-to-Many Manager Assignments
create table if not exists public.manager_school_assignments (
  manager_id uuid not null references public.profiles(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (manager_id, school_id)
);

create table if not exists public.manager_group_assignments (
  manager_id uuid not null references public.profiles(id) on delete cascade,
  group_id uuid not null references public.educational_groups(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (manager_id, group_id)
);

-- 5. Dynamic Portfolio Sections
create table if not exists public.portfolio_sections (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  icon_name text not null default 'Folder',
  accent_color text not null default '#A8B9A5',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  is_required boolean not null default false,
  is_system_default boolean not null default false,
  owner_id uuid references public.profiles(id) on delete cascade,
  category text not null default 'عام',
  custom_fields jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- 6. Portfolio Files (Private Storage Metadata — unified 25 MB limit & strict owner folder check)
create table if not exists public.portfolio_files (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  original_file_name text not null,
  description text not null default '',
  section_id uuid not null references public.portfolio_sections(id) on delete restrict,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  file_type public.file_type_category not null default 'pdf',
  mime_type text not null,
  size_bytes bigint not null check (size_bytes >= 0 and size_bytes <= 26214400),
  storage_path text not null unique,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  review_status public.review_status not null default 'pending',
  review_note text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  custom_field_values jsonb not null default '{}'::jsonb,
  uploaded_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint portfolio_files_storage_path_owner_chk
    check (storage_path like (owner_id::text || '/%') and storage_path not like '%..%')
);

create index if not exists idx_portfolio_files_owner on public.portfolio_files(owner_id);
create index if not exists idx_portfolio_files_section on public.portfolio_files(section_id);
create index if not exists idx_portfolio_files_deleted on public.portfolio_files(is_deleted);

-- 7. Achievements
create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  section_id uuid references public.portfolio_sections(id) on delete set null,
  title text not null,
  description text not null default '',
  achieved_date date not null default current_date,
  level text not null default 'مدرسة',
  attachment_file_id uuid references public.portfolio_files(id) on delete set null,
  custom_field_values jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- 8. Activity Logs (Tamper-resistant audit trail)
create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  actor_name text not null,
  actor_role public.app_role not null,
  action_type text not null check (
    action_type in (
      'file_upload',
      'file_update',
      'file_delete',
      'file_restore',
      'section_create',
      'section_update',
      'user_create',
      'review_submit',
      'branding_update',
      'settings_update'
    )
  ),
  description text not null,
  target_name text,
  created_at timestamptz not null default now()
);

create index if not exists idx_activity_logs_created on public.activity_logs(created_at desc);

-- 9. Notifications & Per-User Read Receipts (With School & Group Scoping)
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  sender_id uuid references public.profiles(id) on delete set null,
  sender_name text not null,
  target_role text not null default 'all' check (
    target_role in ('all', 'super_admin', 'manager', 'teacher')
  ),
  target_user_id uuid references public.profiles(id) on delete cascade,
  target_school_id uuid references public.schools(id) on delete cascade,
  target_group_id uuid references public.educational_groups(id) on delete cascade,
  category text not null default 'إعلان',
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_school on public.notifications(target_school_id);
create index if not exists idx_notifications_group on public.notifications(target_group_id);

create table if not exists public.notification_reads (
  notification_id uuid not null references public.notifications(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (notification_id, user_id)
);

-- 10. Singleton Platform Configuration (Branding, Permissions, Settings)
create table if not exists public.platform_config (
  id text primary key default 'default',
  branding jsonb not null,
  permissions jsonb not null,
  settings jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);
