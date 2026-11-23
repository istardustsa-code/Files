-- ============================================================================
-- Migration 005: Temporary Teacher Visit Codes (Read-Only Principal Guest Access)
-- ============================================================================

-- 1. Unique per-teacher visit code table
create table if not exists public.teacher_visit_codes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null unique references public.profiles(id) on delete cascade,
  code text not null unique,
  is_active boolean not null default false,
  total_visits integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_teacher_visit_codes_upper_code
  on public.teacher_visit_codes (upper(code));

-- 2. Visit logs with entry timestamp, heartbeat last_seen_at & live presence
create table if not exists public.teacher_visit_logs (
  id uuid primary key default gen_random_uuid(),
  visit_code_id uuid not null references public.teacher_visit_codes(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  session_token uuid not null unique default gen_random_uuid(),
  visitor_label text not null default 'زائرة بالكود المؤقت',
  entered_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  ended_at timestamptz,
  is_live boolean not null default true
);

create index if not exists idx_teacher_visit_logs_teacher_entered
  on public.teacher_visit_logs (teacher_id, entered_at desc);

-- 3. Enable RLS (strict: teachers only see their own code & logs; anon NEVER reads tables directly)
alter table public.teacher_visit_codes enable row level security;
alter table public.teacher_visit_logs enable row level security;

drop policy if exists "visit_codes_select_own_or_admin" on public.teacher_visit_codes;
create policy "visit_codes_select_own_or_admin"
  on public.teacher_visit_codes for select
  using (
    teacher_id = auth.uid()
    or public.current_user_role() = 'super_admin'
  );

drop policy if exists "visit_codes_write_own" on public.teacher_visit_codes;
create policy "visit_codes_write_own"
  on public.teacher_visit_codes for all
  using (teacher_id = auth.uid() or public.current_user_role() = 'super_admin')
  with check (teacher_id = auth.uid() or public.current_user_role() = 'super_admin');

drop policy if exists "visit_logs_select_own_or_admin" on public.teacher_visit_logs;
create policy "visit_logs_select_own_or_admin"
  on public.teacher_visit_logs for select
  using (
    teacher_id = auth.uid()
    or public.current_user_role() = 'super_admin'
  );

-- 4. Unique Code Generator Helper
create or replace function public.generate_unique_visit_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_candidate text;
begin
  loop
    v_candidate := 'VST-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    exit when not exists (
      select 1 from public.teacher_visit_codes where upper(code) = v_candidate
    );
  end loop;
  return v_candidate;
end;
$$;

-- 5. Teacher Authenticated RPCs (Get/Create, Toggle Active, Regenerate)
create or replace function public.get_or_create_my_visit_code()
returns public.teacher_visit_codes
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.teacher_visit_codes;
begin
  if v_uid is null then
    raise exception 'يجب تسجيل الدخول أولاً.';
  end if;

  select * into v_row
  from public.teacher_visit_codes
  where teacher_id = v_uid;

  if v_row.id is null then
    insert into public.teacher_visit_codes (teacher_id, code, is_active)
    values (v_uid, public.generate_unique_visit_code(), false)
    returning * into v_row;
  end if;

  return v_row;
end;
$$;

revoke all on function public.get_or_create_my_visit_code() from public, anon;
grant execute on function public.get_or_create_my_visit_code() to authenticated;

create or replace function public.toggle_my_visit_code(next_active boolean)
returns public.teacher_visit_codes
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.teacher_visit_codes;
begin
  if v_uid is null then
    raise exception 'يجب تسجيل الدخول أولاً.';
  end if;

  perform public.get_or_create_my_visit_code();

  update public.teacher_visit_codes
  set is_active = coalesce(next_active, false),
      updated_at = now()
  where teacher_id = v_uid
  returning * into v_row;

  if coalesce(next_active, false) = false then
    update public.teacher_visit_logs
    set is_live = false,
        ended_at = coalesce(ended_at, now())
    where teacher_id = v_uid
      and is_live = true;
  end if;

  return v_row;
end;
$$;

revoke all on function public.toggle_my_visit_code(boolean) from public, anon;
grant execute on function public.toggle_my_visit_code(boolean) to authenticated;

create or replace function public.regenerate_my_visit_code()
returns public.teacher_visit_codes
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.teacher_visit_codes;
begin
  if v_uid is null then
    raise exception 'يجب تسجيل الدخول أولاً.';
  end if;

  perform public.get_or_create_my_visit_code();

  update public.teacher_visit_codes
  set code = public.generate_unique_visit_code(),
      updated_at = now()
  where teacher_id = v_uid
  returning * into v_row;

  update public.teacher_visit_logs
  set is_live = false,
      ended_at = coalesce(ended_at, now())
  where teacher_id = v_uid
    and is_live = true;

  return v_row;
end;
$$;

revoke all on function public.regenerate_my_visit_code() from public, anon;
grant execute on function public.regenerate_my_visit_code() to authenticated;

-- 6. Guest Principal Read-Only RPCs (anon & authenticated allowed, strictly read-only portfolio snapshot)
create or replace function public.enter_visit_session(
  p_code text,
  p_visitor_name text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_clean_code text := upper(trim(coalesce(p_code, '')));
  v_vc public.teacher_visit_codes;
  v_teacher public.profiles;
  v_school_name text;
  v_log public.teacher_visit_logs;
  v_visitor text := coalesce(nullif(trim(p_visitor_name), ''), 'زائرة بالكود المؤقت');
  v_sections jsonb;
  v_files jsonb;
  v_achievements jsonb;
begin
  if v_clean_code = '' then
    raise exception 'يرجى إدخال كود الزيارة المؤقتة.';
  end if;

  select * into v_vc
  from public.teacher_visit_codes
  where upper(trim(code)) = v_clean_code
  limit 1;

  if v_vc.id is null then
    raise exception 'كود الزيارة المؤقتة غير صحيح، يرجى التأكد من الكود.';
  end if;

  if v_vc.is_active is false then
    raise exception 'كود الزيارة المؤقتة غير مفعل حالياً من قِبل المعلمة.';
  end if;

  select * into v_teacher
  from public.profiles
  where id = v_vc.teacher_id;

  if v_teacher.id is null or v_teacher.is_active is false then
    raise exception 'حساب المعلمة غير متاح للاطلاع حالياً.';
  end if;

  select name into v_school_name
  from public.schools
  where id = v_teacher.school_id;

  update public.teacher_visit_codes
  set total_visits = total_visits + 1,
      updated_at = now()
  where id = v_vc.id;

  insert into public.teacher_visit_logs (
    visit_code_id,
    teacher_id,
    visitor_label,
    entered_at,
    last_seen_at,
    is_live
  )
  values (
    v_vc.id,
    v_vc.teacher_id,
    v_visitor,
    now(),
    now(),
    true
  )
  returning * into v_log;

  select coalesce(jsonb_agg(to_jsonb(s) order by s.sort_order asc), '[]'::jsonb)
    into v_sections
  from public.portfolio_sections s
  where s.is_active = true
    and (s.owner_id is null or s.owner_id = v_vc.teacher_id);

  select coalesce(jsonb_agg(to_jsonb(f) order by f.uploaded_at desc), '[]'::jsonb)
    into v_files
  from public.portfolio_files f
  where f.owner_id = v_vc.teacher_id
    and f.is_deleted = false;

  select coalesce(jsonb_agg(to_jsonb(a) order by a.created_at desc), '[]'::jsonb)
    into v_achievements
  from public.achievements a
  where a.owner_id = v_vc.teacher_id;

  return jsonb_build_object(
    'sessionToken', v_log.session_token,
    'enteredAt', v_log.entered_at,
    'code', v_vc.code,
    'teacher', jsonb_build_object(
      'id', v_teacher.id,
      'fullName', v_teacher.full_name,
      'jobTitle', v_teacher.job_title,
      'specialty', v_teacher.specialty,
      'qualification', v_teacher.qualification,
      'schoolName', coalesce(v_school_name, '')
    ),
    'sections', v_sections,
    'files', v_files,
    'achievements', v_achievements
  );
end;
$$;

revoke all on function public.enter_visit_session(text, text) from public;
grant execute on function public.enter_visit_session(text, text) to anon, authenticated;

create or replace function public.ping_visit_session(
  p_code text,
  p_session_token uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_clean_code text := upper(trim(coalesce(p_code, '')));
  v_vc public.teacher_visit_codes;
  v_log public.teacher_visit_logs;
  v_sections jsonb;
  v_files jsonb;
  v_achievements jsonb;
begin
  select * into v_vc
  from public.teacher_visit_codes
  where upper(trim(code)) = v_clean_code
  limit 1;

  select * into v_log
  from public.teacher_visit_logs
  where session_token = p_session_token
  limit 1;

  if v_vc.id is null
     or v_vc.is_active is false
     or v_log.id is null
     or v_log.visit_code_id <> v_vc.id
     or v_log.is_live is false then
    if v_log.id is not null and v_log.is_live is true then
      update public.teacher_visit_logs
      set is_live = false,
          ended_at = coalesce(ended_at, now())
      where id = v_log.id;
    end if;

    return jsonb_build_object('active', false);
  end if;

  update public.teacher_visit_logs
  set last_seen_at = now(),
      is_live = true
  where id = v_log.id;

  select coalesce(jsonb_agg(to_jsonb(s) order by s.sort_order asc), '[]'::jsonb)
    into v_sections
  from public.portfolio_sections s
  where s.is_active = true
    and (s.owner_id is null or s.owner_id = v_vc.teacher_id);

  select coalesce(jsonb_agg(to_jsonb(f) order by f.uploaded_at desc), '[]'::jsonb)
    into v_files
  from public.portfolio_files f
  where f.owner_id = v_vc.teacher_id
    and f.is_deleted = false;

  select coalesce(jsonb_agg(to_jsonb(a) order by a.created_at desc), '[]'::jsonb)
    into v_achievements
  from public.achievements a
  where a.owner_id = v_vc.teacher_id;

  return jsonb_build_object(
    'active', true,
    'sections', v_sections,
    'files', v_files,
    'achievements', v_achievements
  );
end;
$$;

revoke all on function public.ping_visit_session(text, uuid) from public;
grant execute on function public.ping_visit_session(text, uuid) to anon, authenticated;

create or replace function public.end_visit_session(p_session_token uuid)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  update public.teacher_visit_logs
  set is_live = false,
      ended_at = coalesce(ended_at, now())
  where session_token = p_session_token;
end;
$$;

revoke all on function public.end_visit_session(uuid) from public;
grant execute on function public.end_visit_session(uuid) to anon, authenticated;

-- 7. Update Storage Read Policy so active visit code holders can view/sign teacher's private files
--    (Immediately blocked again as soon as teacher toggles visit code OFF)
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
      or (
        auth.role() = 'anon'
        and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        and exists (
          select 1
          from public.portfolio_files pf
          join public.teacher_visit_codes vc on vc.teacher_id = pf.owner_id
          where pf.storage_path = name
            and pf.owner_id = ((storage.foldername(name))[1])::uuid
            and pf.is_deleted = false
            and vc.is_active = true
        )
      )
    )
  );

-- 8. Pre-provision unique temporary visit codes (initially disabled) for existing teachers
insert into public.teacher_visit_codes (teacher_id, code, is_active)
select p.id, public.generate_unique_visit_code(), false
from public.profiles p
where p.role = 'teacher'
  and not exists (
    select 1 from public.teacher_visit_codes vc where vc.teacher_id = p.id
  );
