-- ============================================================================
-- Migration 002: Auth Triggers, Hardened RLS, Anti-Spoofing & Private Storage
-- ============================================================================

-- 1. Security Helper Functions (SECURITY DEFINER to avoid recursive RLS)
create or replace function public.current_user_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_manager_of_school(school_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select school_uid is not null and exists (
    select 1
    from public.schools s
    where s.id = school_uid
      and (
        s.manager_id = auth.uid()
        or exists (
          select 1 from public.manager_school_assignments msa
          where msa.manager_id = auth.uid() and msa.school_id = s.id
        )
      )
  );
$$;

create or replace function public.is_manager_of_group(group_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select group_uid is not null and exists (
    select 1
    from public.educational_groups g
    where g.id = group_uid
      and (
        g.manager_id = auth.uid()
        or exists (
          select 1 from public.manager_group_assignments mga
          where mga.manager_id = auth.uid() and mga.group_id = g.id
        )
        or public.is_manager_of_school(g.school_id)
      )
  );
$$;

create or replace function public.is_manager_of_teacher(teacher_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select teacher_uid is not null and exists (
    select 1
    from public.profiles t
    where t.id = teacher_uid
      and t.role = 'teacher'
      and (
        t.manager_id = auth.uid()
        or public.is_manager_of_school(t.school_id)
        or public.is_manager_of_group(t.group_id)
      )
  );
$$;

-- 2. Auto-provision profile on auth.users signup (strictly defaults to 'teacher')
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role, job_title, is_active)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)),
    new.email,
    'teacher',
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'job_title'), ''), 'معلم'),
    true
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3. Secure One-Time Bootstrap for the FIRST super_admin (SQL Editor / postgres ONLY)
create or replace function public.bootstrap_first_super_admin(target_email text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  promoted public.profiles;
begin
  if auth.uid() is not null then
    raise exception 'Bootstrap cannot be invoked from an authenticated client session.';
  end if;

  if exists (select 1 from public.profiles where role = 'super_admin') then
    raise exception 'A super_admin account already exists. Further role changes require an existing super_admin.';
  end if;

  update public.profiles
  set role = 'super_admin',
      job_title = 'مديرة المنصة',
      is_active = true
  where lower(email) = lower(trim(target_email))
  returning * into promoted;

  if promoted.id is null then
    raise exception 'No registered user profile found for email: %', target_email;
  end if;

  return promoted;
end;
$$;

revoke all on function public.bootstrap_first_super_admin(text) from public, anon, authenticated;

-- 4. Prevent non-admins from escalating their role or tampering with school/group assignments
create or replace function public.enforce_profile_update_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and public.current_user_role() is distinct from 'super_admin' then
    new.role := old.role;
    new.is_active := old.is_active;
    new.school_id := old.school_id;
    new.group_id := old.group_id;
    new.manager_id := old.manager_id;
    new.storage_quota_mb := old.storage_quota_mb;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profile_update_guard on public.profiles;
create trigger trg_profile_update_guard
  before update on public.profiles
  for each row execute function public.enforce_profile_update_guard();

-- 5. Portfolio Files Insert & Update Guards (Enforce Ownership, 25 MB Limit & Review Separation)
create or replace function public.enforce_portfolio_file_insert_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role public.app_role := public.current_user_role();
begin
  if new.size_bytes < 0 or new.size_bytes > 26214400 then
    raise exception 'File exceeds maximum allowed size of 25 MB.';
  end if;

  if caller_role is distinct from 'super_admin' then
    new.owner_id := auth.uid();
    new.is_deleted := false;
    new.deleted_at := null;
    new.review_status := 'pending';
    new.review_note := null;
    new.reviewed_by := null;
    new.reviewed_at := null;
  end if;

  if not (new.storage_path like (new.owner_id::text || '/%') and new.storage_path not like '%..%') then
    raise exception 'Invalid storage_path: file path must belong to owner folder.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_portfolio_file_insert_guard on public.portfolio_files;
create trigger trg_portfolio_file_insert_guard
  before insert on public.portfolio_files
  for each row execute function public.enforce_portfolio_file_insert_guard();

create or replace function public.enforce_portfolio_file_update_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role public.app_role := public.current_user_role();
begin
  if new.size_bytes < 0 or new.size_bytes > 26214400 then
    raise exception 'File exceeds maximum allowed size of 25 MB.';
  end if;

  new.updated_at := now();

  if caller_role = 'manager' and old.owner_id <> auth.uid() then
    -- Manager can ONLY update review status and review note for assigned teachers
    new.title := old.title;
    new.original_file_name := old.original_file_name;
    new.description := old.description;
    new.section_id := old.section_id;
    new.owner_id := old.owner_id;
    new.file_type := old.file_type;
    new.mime_type := old.mime_type;
    new.size_bytes := old.size_bytes;
    new.storage_path := old.storage_path;
    new.is_deleted := old.is_deleted;
    new.deleted_at := old.deleted_at;
    new.custom_field_values := old.custom_field_values;
    new.reviewed_by := auth.uid();
    new.reviewed_at := now();
  elsif caller_role is distinct from 'super_admin' then
    -- Teachers (and managers editing their own personal files) cannot self-approve or transfer ownership
    new.owner_id := old.owner_id;
    new.review_status := old.review_status;
    new.review_note := old.review_note;
    new.reviewed_by := old.reviewed_by;
    new.reviewed_at := old.reviewed_at;
  end if;

  if not (new.storage_path like (new.owner_id::text || '/%') and new.storage_path not like '%..%') then
    raise exception 'Invalid storage_path: file path must belong to owner folder.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_portfolio_file_update_guard on public.portfolio_files;
create trigger trg_portfolio_file_update_guard
  before update on public.portfolio_files
  for each row execute function public.enforce_portfolio_file_update_guard();

-- 6. Activity Logs Integrity Guard (Trusted Actor Identity & Role + Block Fake Admin Logs)
create or replace function public.enforce_activity_log_integrity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_role public.app_role;
  v_active boolean;
begin
  if auth.uid() is null then
    raise exception 'Authenticated user required to record activity logs.';
  end if;

  select full_name, role, is_active
    into v_name, v_role, v_active
  from public.profiles
  where id = auth.uid();

  if v_role is null or v_active is false then
    raise exception 'Active user profile required to record activity logs.';
  end if;

  -- Enforce trusted identity and server timestamp (prevent spoofing)
  new.actor_id := auth.uid();
  new.actor_name := v_name;
  new.actor_role := v_role;
  new.created_at := now();

  -- Prevent users from inserting fake administrative or unauthorized logs
  if new.action_type in ('user_create', 'branding_update', 'settings_update', 'section_update')
     and v_role <> 'super_admin' then
    raise exception 'Only super_admin can record administrative activity logs.';
  end if;

  if new.action_type = 'review_submit' and v_role not in ('super_admin', 'manager') then
    raise exception 'Only managers or super_admin can record review activity logs.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_activity_log_integrity on public.activity_logs;
create trigger trg_activity_log_integrity
  before insert on public.activity_logs
  for each row execute function public.enforce_activity_log_integrity();

-- 7. Notifications Scope & Sender Integrity Guard (Per-School / Per-Group Isolation)
create or replace function public.enforce_notification_security()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_role public.app_role;
begin
  if auth.uid() is null then
    raise exception 'Authenticated user required to send notifications.';
  end if;

  select full_name, role
    into v_name, v_role
  from public.profiles
  where id = auth.uid();

  if v_role not in ('super_admin', 'manager') then
    raise exception 'Only super_admin or assigned managers can send notifications.';
  end if;

  new.sender_id := auth.uid();
  new.sender_name := v_name;
  new.created_at := now();

  -- If both school and group are specified, ensure the group belongs to that school
  if new.target_school_id is not null and new.target_group_id is not null then
    if not exists (
      select 1 from public.educational_groups g
      where g.id = new.target_group_id and g.school_id = new.target_school_id
    ) then
      raise exception 'Target group does not belong to target school.';
    end if;
  end if;

  if v_role = 'manager' then
    if new.target_role not in ('all', 'teacher') then
      raise exception 'Managers can only notify teachers within their assigned scope.';
    end if;

    if new.target_school_id is null
       and new.target_group_id is null
       and new.target_user_id is null then
      raise exception 'Only super_admin can broadcast global notifications across all schools.';
    end if;

    if new.target_school_id is not null and not public.is_manager_of_school(new.target_school_id) then
      raise exception 'Managers cannot send notifications to unassigned schools.';
    end if;

    if new.target_group_id is not null and not public.is_manager_of_group(new.target_group_id) then
      raise exception 'Managers cannot send notifications to unassigned groups.';
    end if;

    if new.target_user_id is not null and not public.is_manager_of_teacher(new.target_user_id) then
      raise exception 'Managers cannot send notifications to teachers outside their assignment.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_notification_security on public.notifications;
create trigger trg_notification_security
  before insert on public.notifications
  for each row execute function public.enforce_notification_security();

-- ============================================================================
-- Enable Row Level Security on All Tables
-- ============================================================================
alter table public.schools enable row level security;
alter table public.educational_groups enable row level security;
alter table public.profiles enable row level security;
alter table public.manager_school_assignments enable row level security;
alter table public.manager_group_assignments enable row level security;
alter table public.portfolio_sections enable row level security;
alter table public.portfolio_files enable row level security;
alter table public.achievements enable row level security;
alter table public.activity_logs enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_reads enable row level security;
alter table public.platform_config enable row level security;

-- PROFILES Policies
drop policy if exists "profiles_select_scoped" on public.profiles;
create policy "profiles_select_scoped"
  on public.profiles for select
  using (
    id = auth.uid()
    or public.current_user_role() = 'super_admin'
    or (public.current_user_role() = 'manager' and public.is_manager_of_teacher(id))
  );

drop policy if exists "profiles_insert_admin" on public.profiles;
create policy "profiles_insert_admin"
  on public.profiles for insert
  with check (public.current_user_role() = 'super_admin');

drop policy if exists "profiles_update_self_or_admin" on public.profiles;
create policy "profiles_update_self_or_admin"
  on public.profiles for update
  using (id = auth.uid() or public.current_user_role() = 'super_admin')
  with check (id = auth.uid() or public.current_user_role() = 'super_admin');

drop policy if exists "profiles_delete_admin" on public.profiles;
create policy "profiles_delete_admin"
  on public.profiles for delete
  using (public.current_user_role() = 'super_admin');

-- SCHOOLS Policies
drop policy if exists "schools_select_scoped" on public.schools;
create policy "schools_select_scoped"
  on public.schools for select
  using (
    public.current_user_role() = 'super_admin'
    or (public.current_user_role() = 'manager' and public.is_manager_of_school(id))
    or (
      public.current_user_role() = 'teacher'
      and exists (
        select 1 from public.profiles p where p.id = auth.uid() and p.school_id = schools.id
      )
    )
  );

drop policy if exists "schools_write_admin" on public.schools;
create policy "schools_write_admin"
  on public.schools for all
  using (public.current_user_role() = 'super_admin')
  with check (public.current_user_role() = 'super_admin');

-- EDUCATIONAL GROUPS Policies
drop policy if exists "groups_select_scoped" on public.educational_groups;
create policy "groups_select_scoped"
  on public.educational_groups for select
  using (
    public.current_user_role() = 'super_admin'
    or (public.current_user_role() = 'manager' and public.is_manager_of_group(id))
    or (
      public.current_user_role() = 'teacher'
      and exists (
        select 1 from public.profiles p where p.id = auth.uid() and p.group_id = educational_groups.id
      )
    )
  );

drop policy if exists "groups_write_admin" on public.educational_groups;
create policy "groups_write_admin"
  on public.educational_groups for all
  using (public.current_user_role() = 'super_admin')
  with check (public.current_user_role() = 'super_admin');

-- MANAGER ASSIGNMENTS Policies
drop policy if exists "mgr_school_assign_select" on public.manager_school_assignments;
create policy "mgr_school_assign_select"
  on public.manager_school_assignments for select
  using (manager_id = auth.uid() or public.current_user_role() = 'super_admin');

drop policy if exists "mgr_school_assign_admin" on public.manager_school_assignments;
create policy "mgr_school_assign_admin"
  on public.manager_school_assignments for all
  using (public.current_user_role() = 'super_admin')
  with check (public.current_user_role() = 'super_admin');

drop policy if exists "mgr_group_assign_select" on public.manager_group_assignments;
create policy "mgr_group_assign_select"
  on public.manager_group_assignments for select
  using (manager_id = auth.uid() or public.current_user_role() = 'super_admin');

drop policy if exists "mgr_group_assign_admin" on public.manager_group_assignments;
create policy "mgr_group_assign_admin"
  on public.manager_group_assignments for all
  using (public.current_user_role() = 'super_admin')
  with check (public.current_user_role() = 'super_admin');

-- PORTFOLIO SECTIONS Policies
drop policy if exists "sections_select_scoped" on public.portfolio_sections;
create policy "sections_select_scoped"
  on public.portfolio_sections for select
  using (
    public.current_user_role() = 'super_admin'
    or (is_active = true and (owner_id is null or owner_id = auth.uid()))
  );

drop policy if exists "sections_insert_admin_or_personal" on public.portfolio_sections;
create policy "sections_insert_admin_or_personal"
  on public.portfolio_sections for insert
  with check (
    public.current_user_role() = 'super_admin'
    or (owner_id = auth.uid() and is_system_default = false and is_required = false)
  );

drop policy if exists "sections_update_admin_or_personal" on public.portfolio_sections;
create policy "sections_update_admin_or_personal"
  on public.portfolio_sections for update
  using (
    public.current_user_role() = 'super_admin'
    or (owner_id = auth.uid() and is_system_default = false)
  )
  with check (
    public.current_user_role() = 'super_admin'
    or (owner_id = auth.uid() and is_system_default = false and is_required = false)
  );

drop policy if exists "sections_delete_admin_or_personal" on public.portfolio_sections;
create policy "sections_delete_admin_or_personal"
  on public.portfolio_sections for delete
  using (
    public.current_user_role() = 'super_admin'
    or (owner_id = auth.uid() and is_system_default = false)
  );

-- PORTFOLIO FILES Policies (Strict Teacher Isolation + Manager Assigned Review Only)
drop policy if exists "files_select_strict" on public.portfolio_files;
create policy "files_select_strict"
  on public.portfolio_files for select
  using (
    owner_id = auth.uid()
    or public.current_user_role() = 'super_admin'
    or (
      public.current_user_role() = 'manager'
      and is_deleted = false
      and public.is_manager_of_teacher(owner_id)
    )
  );

drop policy if exists "files_insert_own_or_admin" on public.portfolio_files;
create policy "files_insert_own_or_admin"
  on public.portfolio_files for insert
  with check (
    (owner_id = auth.uid() and storage_path like (auth.uid()::text || '/%') and size_bytes <= 26214400)
    or public.current_user_role() = 'super_admin'
  );

drop policy if exists "files_update_strict" on public.portfolio_files;
create policy "files_update_strict"
  on public.portfolio_files for update
  using (
    owner_id = auth.uid()
    or public.current_user_role() = 'super_admin'
    or (
      public.current_user_role() = 'manager'
      and is_deleted = false
      and public.is_manager_of_teacher(owner_id)
    )
  )
  with check (
    owner_id = auth.uid()
    or public.current_user_role() = 'super_admin'
    or (
      public.current_user_role() = 'manager'
      and is_deleted = false
      and public.is_manager_of_teacher(owner_id)
    )
  );

drop policy if exists "files_delete_own_or_admin" on public.portfolio_files;
create policy "files_delete_own_or_admin"
  on public.portfolio_files for delete
  using (owner_id = auth.uid() or public.current_user_role() = 'super_admin');

-- ACHIEVEMENTS Policies
drop policy if exists "achievements_select_strict" on public.achievements;
create policy "achievements_select_strict"
  on public.achievements for select
  using (
    owner_id = auth.uid()
    or public.current_user_role() = 'super_admin'
    or (public.current_user_role() = 'manager' and public.is_manager_of_teacher(owner_id))
  );

drop policy if exists "achievements_write_own_or_admin" on public.achievements;
create policy "achievements_write_own_or_admin"
  on public.achievements for all
  using (owner_id = auth.uid() or public.current_user_role() = 'super_admin')
  with check (owner_id = auth.uid() or public.current_user_role() = 'super_admin');

-- ACTIVITY LOGS Policies (Append-only, Anti-Spoofing)
drop policy if exists "activity_logs_select_scoped" on public.activity_logs;
create policy "activity_logs_select_scoped"
  on public.activity_logs for select
  using (
    public.current_user_role() = 'super_admin'
    or actor_id = auth.uid()
    or (public.current_user_role() = 'manager' and public.is_manager_of_teacher(actor_id))
  );

drop policy if exists "activity_logs_insert_self" on public.activity_logs;
create policy "activity_logs_insert_self"
  on public.activity_logs for insert
  with check (
    auth.uid() is not null
    and actor_id = auth.uid()
    and actor_role = public.current_user_role()
    and (
      public.current_user_role() = 'super_admin'
      or (
        public.current_user_role() = 'manager'
        and action_type not in ('user_create', 'branding_update', 'settings_update', 'section_update')
      )
      or (
        public.current_user_role() = 'teacher'
        and action_type in ('file_upload', 'file_update', 'file_delete', 'file_restore', 'section_create')
      )
    )
  );

-- NOTIFICATIONS Policies (Strict School/Group Isolation + Super Admin Only Global Broadcasts)
drop policy if exists "notifications_select_scoped" on public.notifications;
create policy "notifications_select_scoped"
  on public.notifications for select
  using (
    public.current_user_role() = 'super_admin'
    or sender_id = auth.uid()
    or target_user_id = auth.uid()
    or (
      target_user_id is null
      and (target_role = 'all' or target_role = public.current_user_role()::text)
      and (
        (target_school_id is null and target_group_id is null)
        or (
          target_school_id is not null
          and (
            exists (
              select 1 from public.profiles p
              where p.id = auth.uid() and p.school_id = notifications.target_school_id
            )
            or public.is_manager_of_school(target_school_id)
          )
        )
        or (
          target_group_id is not null
          and (
            exists (
              select 1 from public.profiles p
              where p.id = auth.uid() and p.group_id = notifications.target_group_id
            )
            or public.is_manager_of_group(target_group_id)
          )
        )
      )
    )
  );

drop policy if exists "notifications_insert_admin_or_manager" on public.notifications;
create policy "notifications_insert_admin_or_manager"
  on public.notifications for insert
  with check (
    sender_id = auth.uid()
    and (
      public.current_user_role() = 'super_admin'
      or (
        public.current_user_role() = 'manager'
        and target_role in ('all', 'teacher')
        and (
          (target_user_id is not null and public.is_manager_of_teacher(target_user_id))
          or (target_school_id is not null and public.is_manager_of_school(target_school_id))
          or (target_group_id is not null and public.is_manager_of_group(target_group_id))
        )
      )
    )
  );

drop policy if exists "notification_reads_own" on public.notification_reads;
create policy "notification_reads_own"
  on public.notification_reads for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- PLATFORM CONFIG Policies (Readable by authenticated/anon for branding, writable ONLY by Super Admin)
drop policy if exists "platform_config_select_all" on public.platform_config;
create policy "platform_config_select_all"
  on public.platform_config for select
  using (auth.role() = 'authenticated' or auth.role() = 'anon');

drop policy if exists "platform_config_write_admin" on public.platform_config;
create policy "platform_config_write_admin"
  on public.platform_config for all
  using (public.current_user_role() = 'super_admin')
  with check (public.current_user_role() = 'super_admin');

-- ============================================================================
-- Private Storage Bucket (`portfolio-files`, 25 MB) & Branding Bucket (`platform-branding`)
-- ============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'portfolio-files',
    'portfolio-files',
    false,
    26214400, -- 25 MB (matches platform_config.settings.maxFileSizeMb)
    array[
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      'image/png',
      'image/jpeg',
      'image/webp',
      'image/gif'
    ]
  ),
  (
    'platform-branding',
    'platform-branding',
    true,
    5242880,
    array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
  )
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Private bucket: Owner folder must match auth.uid()::text & path must not traverse
drop policy if exists "storage_portfolio_select" on storage.objects;
create policy "storage_portfolio_select"
  on storage.objects for select
  using (
    bucket_id = 'portfolio-files'
    and name not like '%..%'
    and array_length(storage.foldername(name), 1) >= 2
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.current_user_role() = 'super_admin'
      or (
        public.current_user_role() = 'manager'
        and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        and public.is_manager_of_teacher(((storage.foldername(name))[1])::uuid)
        and exists (
          select 1 from public.portfolio_files pf
          where pf.storage_path = name
            and pf.owner_id = ((storage.foldername(name))[1])::uuid
            and pf.is_deleted = false
        )
      )
    )
  );

drop policy if exists "storage_portfolio_insert" on storage.objects;
create policy "storage_portfolio_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'portfolio-files'
    and name not like '%..%'
    and array_length(storage.foldername(name), 1) >= 2
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or (
        public.current_user_role() = 'super_admin'
        and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      )
    )
  );

drop policy if exists "storage_portfolio_update" on storage.objects;
create policy "storage_portfolio_update"
  on storage.objects for update
  using (
    bucket_id = 'portfolio-files'
    and name not like '%..%'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.current_user_role() = 'super_admin'
    )
  )
  with check (
    bucket_id = 'portfolio-files'
    and name not like '%..%'
    and array_length(storage.foldername(name), 1) >= 2
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.current_user_role() = 'super_admin'
    )
  );

drop policy if exists "storage_portfolio_delete" on storage.objects;
create policy "storage_portfolio_delete"
  on storage.objects for delete
  using (
    bucket_id = 'portfolio-files'
    and name not like '%..%'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.current_user_role() = 'super_admin'
    )
  );

-- Branding bucket: public read, Super Admin write only
drop policy if exists "storage_branding_select" on storage.objects;
create policy "storage_branding_select"
  on storage.objects for select
  using (bucket_id = 'platform-branding');

drop policy if exists "storage_branding_write_admin" on storage.objects;
create policy "storage_branding_write_admin"
  on storage.objects for all
  using (bucket_id = 'platform-branding' and public.current_user_role() = 'super_admin')
  with check (bucket_id = 'platform-branding' and public.current_user_role() = 'super_admin');
