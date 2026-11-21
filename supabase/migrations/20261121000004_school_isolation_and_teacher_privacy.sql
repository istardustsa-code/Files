-- ============================================================================
-- Migration 004: School Code Joining & Teacher Manager-Visibility Permission
-- Non-destructive, idempotent upgrade (safe to run on live database)
-- ============================================================================

alter table public.profiles
  add column if not exists allow_manager_view boolean not null default true;

create or replace function public.can_manager_view_teacher(teacher_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select teacher_uid is not null and exists (
    select 1
    from public.profiles t
    where t.id = teacher_uid
      and t.role = 'teacher'
      and coalesce(t.allow_manager_view, true) = true
      and (
        t.manager_id = auth.uid()
        or public.is_manager_of_school(t.school_id)
        or public.is_manager_of_group(t.group_id)
      )
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_school_code text := upper(trim(coalesce(new.raw_user_meta_data ->> 'school_code', '')));
  v_school_id uuid;
  v_manager_id uuid;
begin
  if v_school_code <> '' then
    select s.id, s.manager_id
      into v_school_id, v_manager_id
    from public.schools s
    where upper(trim(s.code)) = v_school_code
    limit 1;
  end if;

  insert into public.profiles (
    id,
    full_name,
    email,
    role,
    job_title,
    school_id,
    manager_id,
    allow_manager_view,
    is_active
  )
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)),
    new.email,
    'teacher',
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'job_title'), ''), 'معلم'),
    v_school_id,
    v_manager_id,
    true,
    true
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace function public.enforce_profile_update_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_joining_by_code boolean :=
    current_setting('app.joining_school_by_code', true) = 'true'
    and old.school_id is null;
begin
  if auth.uid() is not null and public.current_user_role() is distinct from 'super_admin' then
    new.role := old.role;
    new.is_active := old.is_active;
    new.group_id := old.group_id;
    new.storage_quota_mb := old.storage_quota_mb;
    if not v_joining_by_code then
      new.school_id := old.school_id;
      new.manager_id := old.manager_id;
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.join_school_by_code(target_code text)
returns public.schools
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles;
  v_school public.schools;
  v_clean_code text := upper(trim(coalesce(target_code, '')));
begin
  if v_uid is null then
    raise exception 'يجب تسجيل الدخول أولاً.';
  end if;

  if v_clean_code = '' then
    raise exception 'يرجى إدخال رمز المدرسة.';
  end if;

  select * into v_profile from public.profiles where id = v_uid;
  if v_profile.id is null then
    raise exception 'لم يتم العثور على ملف المستخدم.';
  end if;

  if v_profile.school_id is not null then
    raise exception 'حسابكِ مرتبط بمدرسة بالفعل، لا يمكن تغيير المدرسة إلا عبر مديرة المنصة.';
  end if;

  select * into v_school
  from public.schools
  where upper(trim(code)) = v_clean_code
  limit 1;

  if v_school.id is null then
    raise exception 'رمز المدرسة غير صحيح، يرجى التأكد من الرمز.';
  end if;

  perform set_config('app.joining_school_by_code', 'true', true);

  update public.profiles
  set school_id = v_school.id,
      manager_id = coalesce(manager_id, v_school.manager_id)
  where id = v_uid;

  return v_school;
end;
$$;

revoke all on function public.join_school_by_code(text) from public, anon;
grant execute on function public.join_school_by_code(text) to authenticated;

drop policy if exists "files_select_strict" on public.portfolio_files;
create policy "files_select_strict"
  on public.portfolio_files for select
  using (
    owner_id = auth.uid()
    or public.current_user_role() = 'super_admin'
    or (
      public.current_user_role() = 'manager'
      and is_deleted = false
      and public.can_manager_view_teacher(owner_id)
    )
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
      and public.can_manager_view_teacher(owner_id)
    )
  )
  with check (
    owner_id = auth.uid()
    or public.current_user_role() = 'super_admin'
    or (
      public.current_user_role() = 'manager'
      and is_deleted = false
      and public.can_manager_view_teacher(owner_id)
    )
  );

drop policy if exists "achievements_select_strict" on public.achievements;
create policy "achievements_select_strict"
  on public.achievements for select
  using (
    owner_id = auth.uid()
    or public.current_user_role() = 'super_admin'
    or (public.current_user_role() = 'manager' and public.can_manager_view_teacher(owner_id))
  );

drop policy if exists "activity_logs_select_scoped" on public.activity_logs;
create policy "activity_logs_select_scoped"
  on public.activity_logs for select
  using (
    public.current_user_role() = 'super_admin'
    or actor_id = auth.uid()
    or (public.current_user_role() = 'manager' and public.can_manager_view_teacher(actor_id))
  );

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
        and public.can_manager_view_teacher(((storage.foldername(name))[1])::uuid)
        and exists (
          select 1 from public.portfolio_files pf
          where pf.storage_path = name
            and pf.owner_id = ((storage.foldername(name))[1])::uuid
            and pf.is_deleted = false
        )
      )
    )
  );
