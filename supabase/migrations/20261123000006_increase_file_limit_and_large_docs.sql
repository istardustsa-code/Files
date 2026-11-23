-- ============================================================================
-- Migration 006: Support Large 100+ Page Portfolio Files (Up to 200 MB)
-- ============================================================================

-- 1. Drop legacy 25 MB check constraint on public.portfolio_files and raise to 200 MB
do $$
declare
  v_con_name text;
begin
  select c.conname into v_con_name
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'public'
    and t.relname = 'portfolio_files'
    and c.contype = 'c'
    and pg_get_constraintdef(c.oid) ilike '%size_bytes%';

  if v_con_name is not null then
    execute format('alter table public.portfolio_files drop constraint %I', v_con_name);
  end if;
end $$;

alter table public.portfolio_files
  drop constraint if exists portfolio_files_size_bytes_200mb_chk;

alter table public.portfolio_files
  add constraint portfolio_files_size_bytes_200mb_chk
  check (size_bytes >= 0 and size_bytes <= 209715200);

-- 2. Update Insert & Update Guard Functions (allow up to 200 MB per file)
create or replace function public.enforce_portfolio_file_insert_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role public.app_role := public.current_user_role();
begin
  if new.size_bytes < 0 or new.size_bytes > 209715200 then
    raise exception 'File exceeds maximum allowed size of 200 MB.';
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

create or replace function public.enforce_portfolio_file_update_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role public.app_role := public.current_user_role();
begin
  if new.size_bytes < 0 or new.size_bytes > 209715200 then
    raise exception 'File exceeds maximum allowed size of 200 MB.';
  end if;

  new.updated_at := now();

  if caller_role = 'manager' and old.owner_id <> auth.uid() then
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
    if old.owner_id <> auth.uid() then
      raise exception 'Only file owner can modify this record.';
    end if;
    new.owner_id := old.owner_id;
    new.review_status := old.review_status;
    new.review_note := old.review_note;
    new.reviewed_by := old.reviewed_by;
    new.reviewed_at := old.reviewed_at;
  end if;

  return new;
end;
$$;

-- 3. Update RLS Insert Policy for portfolio_files (200 MB)
drop policy if exists "files_insert_own_or_admin" on public.portfolio_files;
create policy "files_insert_own_or_admin"
  on public.portfolio_files for insert
  with check (
    (owner_id = auth.uid() and storage_path like (auth.uid()::text || '/%') and size_bytes <= 209715200)
    or public.current_user_role() = 'super_admin'
  );

-- 4. Raise Storage Bucket Limit for `portfolio-files` to 200 MB
update storage.buckets
set file_size_limit = 209715200
where id = 'portfolio-files';

-- 5. Raise default platform_config maxFileSizeMb from 25 -> 200
update public.platform_config
set settings = jsonb_set(settings, '{maxFileSizeMb}', '200'::jsonb, true),
    updated_at = now()
where id = 'default'
  and coalesce((settings->>'maxFileSizeMb')::integer, 25) < 200;

-- 6. Raise default profile storage quota to 2048 MB (2 GB) for existing users
alter table public.profiles
  alter column storage_quota_mb set default 2048;

update public.profiles
set storage_quota_mb = 2048
where storage_quota_mb < 2048;
