-- AI CivicEye schema, row level security, and storage bucket.
-- Run once in the Supabase SQL editor. The whole script is one transaction.

begin;

do $$ begin
  create type public.user_role as enum ('citizen', 'admin', 'officer');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.complaint_category as enum (
    'pothole', 'garbage', 'drainage', 'streetlight', 'water_leakage', 'infrastructure', 'other'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.complaint_severity as enum ('low', 'medium', 'high', 'critical');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.complaint_status as enum ('pending', 'in_progress', 'resolved');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.duplicate_review_status as enum ('pending', 'confirmed', 'dismissed');
exception when duplicate_object then null;
end $$;

create sequence if not exists public.complaint_ref_seq;

create or replace function public.generate_reference_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  n bigint;
begin
  n := nextval('public.complaint_ref_seq');
  return 'CE-' || to_char(now() at time zone 'utc', 'YYYY') || '-' || lpad(n::text, 5, '0');
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  email text not null,
  phone text,
  role public.user_role not null default 'citizen',
  created_at timestamptz not null default now()
);

create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.complaints (
  id uuid primary key default gen_random_uuid(),
  reference_number text not null unique default public.generate_reference_number(),
  citizen_id uuid not null,
  title text not null check (char_length(title) between 3 and 140),
  description text not null default '' check (char_length(description) <= 4000),
  category public.complaint_category not null,
  severity public.complaint_severity not null,
  status public.complaint_status not null default 'pending',
  department_id uuid,
  assigned_officer_id uuid,
  image_url text,
  resolution_image_url text,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  address text check (address is null or char_length(address) <= 500),
  ai_confidence numeric check (ai_confidence is null or (ai_confidence >= 0 and ai_confidence <= 1)),
  ai_analysis jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint complaints_citizen_id_fkey foreign key (citizen_id) references public.profiles (id) on delete cascade,
  constraint complaints_department_id_fkey foreign key (department_id) references public.departments (id),
  constraint complaints_assigned_officer_id_fkey foreign key (assigned_officer_id) references public.profiles (id) on delete set null
);

alter table public.complaints
  add column if not exists severity_rank smallint generated always as (
    case severity
      when 'low' then 1
      when 'medium' then 2
      when 'high' then 3
      when 'critical' then 4
    end
  ) stored;

create table if not exists public.complaint_updates (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references public.complaints (id) on delete cascade,
  updated_by uuid,
  old_status public.complaint_status,
  new_status public.complaint_status not null,
  remarks text check (remarks is null or char_length(remarks) <= 2000),
  is_internal boolean not null default false,
  created_at timestamptz not null default now(),
  constraint complaint_updates_updated_by_fkey foreign key (updated_by) references public.profiles (id) on delete set null
);

create table if not exists public.complaint_assignments (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references public.complaints (id) on delete cascade,
  department_id uuid not null references public.departments (id),
  officer_id uuid references public.profiles (id) on delete set null,
  assigned_by uuid not null references public.profiles (id),
  assigned_at timestamptz not null default now()
);

create table if not exists public.duplicate_flags (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references public.complaints (id) on delete cascade,
  possible_duplicate_id uuid not null references public.complaints (id) on delete cascade,
  similarity_score numeric not null check (similarity_score >= 0 and similarity_score <= 1),
  review_status public.duplicate_review_status not null default 'pending',
  created_at timestamptz not null default now(),
  constraint duplicate_flags_pair_key unique (complaint_id, possible_duplicate_id),
  constraint duplicate_flags_not_self check (complaint_id <> possible_duplicate_id)
);

create table if not exists public.resolution_verifications (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references public.complaints (id) on delete cascade,
  before_image_url text,
  after_image_url text,
  ai_result jsonb,
  human_verified boolean not null default false,
  verified_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists complaints_citizen_idx on public.complaints (citizen_id);
create index if not exists complaints_status_idx on public.complaints (status);
create index if not exists complaints_category_idx on public.complaints (category);
create index if not exists complaints_severity_idx on public.complaints (severity);
create index if not exists complaints_department_idx on public.complaints (department_id);
create index if not exists complaints_created_idx on public.complaints (created_at desc);
create index if not exists complaints_geo_idx on public.complaints (latitude, longitude);
create index if not exists complaints_severity_rank_idx on public.complaints (severity_rank);
create index if not exists complaint_updates_complaint_idx on public.complaint_updates (complaint_id, created_at);
create index if not exists duplicate_flags_complaint_idx on public.duplicate_flags (complaint_id);
create index if not exists profiles_role_idx on public.profiles (role);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.touch_complaint()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    new.updated_at = now();
  end if;
  if new.status = 'resolved' then
    if new.resolved_at is null then
      new.resolved_at = now();
    end if;
  else
    new.resolved_at = null;
  end if;
  return new;
end;
$$;

drop trigger if exists complaints_touch on public.complaints;
create trigger complaints_touch
  before insert or update on public.complaints
  for each row execute function public.touch_complaint();

create or replace function public.prevent_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Role changes are not allowed';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_prevent_role_change on public.profiles;
create trigger profiles_prevent_role_change
  before update on public.profiles
  for each row execute function public.prevent_role_change();

create or replace function public.protect_complaint_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') = 'service_role' or public.is_admin() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.citizen_id = auth.uid();
    new.status = 'pending';
    new.assigned_officer_id = null;
    new.resolution_image_url = null;
    new.resolved_at = null;
    return new;
  end if;
  raise exception 'Only administrators can update complaints';
end;
$$;

drop trigger if exists complaints_protect_write on public.complaints;
create trigger complaints_protect_write
  before insert or update on public.complaints
  for each row execute function public.protect_complaint_write();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.email, ''),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    'citizen'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

revoke all on function public.is_admin() from public;
revoke all on function public.generate_reference_number() from public;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.generate_reference_number() to authenticated;

insert into public.departments (name, description)
values
  ('Road Maintenance', 'Carriageway repairs, potholes, and damaged civic infrastructure.'),
  ('Sanitation', 'Solid waste collection, overflowing bins, and street cleaning.'),
  ('Drainage', 'Storm drains, blocked culverts, and sewage overflow.'),
  ('Electrical', 'Streetlights and public electrical fixtures.'),
  ('Water Supply', 'Leaking pipelines and public water supply faults.')
on conflict (name) do nothing;

alter table public.profiles enable row level security;
alter table public.departments enable row level security;
alter table public.complaints enable row level security;
alter table public.complaint_updates enable row level security;
alter table public.complaint_assignments enable row level security;
alter table public.duplicate_flags enable row level security;
alter table public.resolution_verifications enable row level security;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists departments_select on public.departments;
create policy departments_select on public.departments
  for select to authenticated
  using (true);

drop policy if exists complaints_select on public.complaints;
create policy complaints_select on public.complaints
  for select to authenticated
  using (citizen_id = auth.uid() or public.is_admin());

drop policy if exists complaints_insert on public.complaints;
create policy complaints_insert on public.complaints
  for insert to authenticated
  with check (citizen_id = auth.uid() and status = 'pending');

drop policy if exists complaints_update on public.complaints;
create policy complaints_update on public.complaints
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists complaint_updates_select on public.complaint_updates;
create policy complaint_updates_select on public.complaint_updates
  for select to authenticated
  using (
    exists (
      select 1 from public.complaints c
      where c.id = complaint_id
        and (c.citizen_id = auth.uid() or public.is_admin())
    )
    and (not is_internal or public.is_admin())
  );

drop policy if exists complaint_updates_insert on public.complaint_updates;
create policy complaint_updates_insert on public.complaint_updates
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists complaint_assignments_select on public.complaint_assignments;
create policy complaint_assignments_select on public.complaint_assignments
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.complaints c
      where c.id = complaint_id and c.citizen_id = auth.uid()
    )
  );

drop policy if exists complaint_assignments_insert on public.complaint_assignments;
create policy complaint_assignments_insert on public.complaint_assignments
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists duplicate_flags_select on public.duplicate_flags;
create policy duplicate_flags_select on public.duplicate_flags
  for select to authenticated
  using (public.is_admin());

drop policy if exists duplicate_flags_update on public.duplicate_flags;
create policy duplicate_flags_update on public.duplicate_flags
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists resolution_verifications_select on public.resolution_verifications;
create policy resolution_verifications_select on public.resolution_verifications
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.complaints c
      where c.id = complaint_id and c.citizen_id = auth.uid()
    )
  );

drop policy if exists resolution_verifications_insert on public.resolution_verifications;
create policy resolution_verifications_insert on public.resolution_verifications
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists resolution_verifications_update on public.resolution_verifications;
create policy resolution_verifications_update on public.resolution_verifications
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant usage on schema public to anon, authenticated;
revoke all on table public.profiles from anon, authenticated;
revoke all on table public.departments from anon, authenticated;
revoke all on table public.complaints from anon, authenticated;
revoke all on table public.complaint_updates from anon, authenticated;
revoke all on table public.complaint_assignments from anon, authenticated;
revoke all on table public.duplicate_flags from anon, authenticated;
revoke all on table public.resolution_verifications from anon, authenticated;

grant select, update on table public.profiles to authenticated;
grant select on table public.departments to authenticated;
grant select, insert, update on table public.complaints to authenticated;
grant select, insert on table public.complaint_updates to authenticated;
grant select, insert on table public.complaint_assignments to authenticated;
grant select, update on table public.duplicate_flags to authenticated;
grant select, insert, update on table public.resolution_verifications to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'complaint-images',
  'complaint-images',
  true,
  4194304,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists complaint_images_public_read on storage.objects;
create policy complaint_images_public_read
  on storage.objects
  for select
  to public
  using (bucket_id = 'complaint-images');

commit;
