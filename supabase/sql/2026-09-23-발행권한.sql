-- 에피브리프 · 발행 권한 체계 (3단 구조)
--
--   체험(trial)   등록 즉시. 기능은 전부 쓰되 화면에 '체험 중' 띠가 붙습니다.
--   인증(verified) 신청 → 관리자 승인. 띠가 사라지고 기관 이름으로 발행합니다.
--   정지(suspended) 관리자가 내림. 읽기만 됩니다.
--
-- 기관명 코드(kdca, seoul 등)는 예약어로 잠가 두고, 승인된 신청이 있을 때만 등록됩니다.
-- 모두 더하기만 하는 변경이라 기존 동작을 깨지 않습니다.

-- ───────── 1. 기관 표에 상태 붙이기 ─────────
alter table epibrief.offices add column if not exists status      text not null default 'trial';
alter table epibrief.offices add column if not exists verified_at timestamptz;

alter table epibrief.offices drop constraint if exists offices_status_chk;
alter table epibrief.offices add  constraint offices_status_chk
  check (status in ('trial', 'verified', 'suspended'));

-- ───────── 2. 예약어 ─────────
create table if not exists epibrief.reserved (
  slug       text primary key,
  note       text,
  created_at timestamptz not null default now()
);

insert into epibrief.reserved(slug, note) values
  ('kdca','중앙기관'),('mohw','중앙기관'),('mfds','중앙기관'),('nhis','중앙기관'),
  ('hira','중앙기관'),('khepi','중앙기관'),('nmc','중앙기관'),('kohi','중앙기관'),
  ('moe','중앙기관'),('mois','중앙기관'),('korea','중앙기관'),('gov','중앙기관'),
  ('seoul','광역'),('busan','광역'),('daegu','광역'),('incheon','광역'),
  ('gwangju','광역'),('daejeon','광역'),('ulsan','광역'),('sejong','광역'),
  ('gyeonggi','광역'),('gangwon','광역'),('chungbuk','광역'),('chungnam','광역'),
  ('jeonbuk','광역'),('jeonnam','광역'),('gyeongbuk','광역'),('gyeongnam','광역'),
  ('jeju','광역'),
  ('admin','운영'),('test','운영'),('demo','운영'),('epibrief','운영'),
  ('official','운영'),('www','운영'),('api','운영'),('help','운영'),
  ('support','운영'),('root','운영'),('system','운영'),('master','운영'),
  ('news','운영'),('newsletter','운영')
on conflict (slug) do nothing;

-- ───────── 3. 발행 권한 신청 ─────────
create table if not exists epibrief.applications (
  id         bigint generated always as identity primary key,
  slug       text        not null,
  org        text        not null,
  dept       text        not null,
  person     text        not null,
  email      text        not null,
  purpose    text,
  status     text        not null default 'pending',
  note       text,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

alter table epibrief.applications drop constraint if exists applications_status_chk;
alter table epibrief.applications add  constraint applications_status_chk
  check (status in ('pending', 'approved', 'rejected'));

create index if not exists applications_pending_idx
  on epibrief.applications (created_at desc) where status = 'pending';

-- ───────── 4. 기관 코드 확인 (신청 화면에서 미리 알려 줍니다) ─────────
create or replace function public.epibrief_slug_check(p_slug text)
returns json language plpgsql security definer
set search_path to 'epibrief','public','extensions','pg_temp' as $$
declare v_slug text := lower(trim(coalesce(p_slug, '')));
begin
  if v_slug !~ '^[a-z0-9-]{2,40}$' then return json_build_object('state','invalid'); end if;
  if exists (select 1 from epibrief.offices where slug = v_slug) then
    return json_build_object('state','taken',
      'status', (select status from epibrief.offices where slug = v_slug));
  end if;
  if exists (select 1 from epibrief.reserved where slug = v_slug)
     and not exists (select 1 from epibrief.applications
                      where slug = v_slug and status = 'approved') then
    return json_build_object('state','reserved');
  end if;
  return json_build_object('state','free');
end $$;

-- ───────── 5. 신청 넣기 ─────────
create or replace function public.epibrief_apply(
  p_slug text, p_org text, p_dept text, p_person text, p_email text, p_purpose text default null)
returns json language plpgsql security definer
set search_path to 'epibrief','public','extensions','pg_temp' as $$
declare v_slug text := lower(trim(coalesce(p_slug, '')));
        v_mail text := lower(trim(coalesce(p_email, '')));
begin
  if v_slug !~ '^[a-z0-9-]{2,40}$' then return json_build_object('ok',false,'error','SLUG_INVALID'); end if;
  if length(trim(coalesce(p_org,'')))    < 1 then return json_build_object('ok',false,'error','ORG_REQUIRED'); end if;
  if length(trim(coalesce(p_dept,'')))   < 1 then return json_build_object('ok',false,'error','DEPT_REQUIRED'); end if;
  if length(trim(coalesce(p_person,''))) < 1 then return json_build_object('ok',false,'error','PERSON_REQUIRED'); end if;
  if v_mail !~ '^[^@[:space:]]+@[^@[:space:]]+\.[a-z]{2,}$' then
    return json_build_object('ok',false,'error','EMAIL_INVALID'); end if;

  if exists (select 1 from epibrief.applications where slug = v_slug and status = 'pending') then
    return json_build_object('ok',false,'error','ALREADY_PENDING'); end if;
  if (select count(*) from epibrief.applications
       where email = v_mail and created_at > now() - interval '1 hour') >= 5 then
    return json_build_object('ok',false,'error','TOO_MANY_APPLICATIONS'); end if;
  if (select count(*) from epibrief.applications
       where created_at > now() - interval '1 hour') >= 40 then
    return json_build_object('ok',false,'error','TOO_MANY_APPLICATIONS'); end if;

  insert into epibrief.applications(slug, org, dept, person, email, purpose)
  values (v_slug, left(trim(p_org),120), left(trim(p_dept),120),
          left(trim(p_person),60), v_mail, left(nullif(trim(coalesce(p_purpose,'')),''), 400));
  return json_build_object('ok', true, 'slug', v_slug);
end $$;

-- ───────── 6. 신청 목록 (관리자) ─────────
create or replace function public.epibrief_admin_apps(p_admin_key text, p_all boolean default false)
returns json language plpgsql security definer
set search_path to 'epibrief','public','extensions','pg_temp' as $$
begin
  perform epibrief.check_admin(p_admin_key);
  return coalesce((select json_agg(json_build_object(
      'id', a.id, 'slug', a.slug, 'org', a.org, 'dept', a.dept, 'person', a.person,
      'email', a.email, 'purpose', a.purpose, 'status', a.status, 'note', a.note,
      'created_at', a.created_at, 'decided_at', a.decided_at,
      'office', (select o.status from epibrief.offices o where o.slug = a.slug))
      order by (a.status = 'pending') desc, a.created_at desc)
    from epibrief.applications a
    where p_all or a.status = 'pending'), '[]'::json);
end $$;

-- ───────── 7. 승인 · 거절 ─────────
--   승인했는데 아직 기관 등록 전이면, 그 코드로 등록할 때 바로 인증 상태가 됩니다.
create or replace function public.epibrief_admin_decide(
  p_admin_key text, p_id bigint, p_decision text, p_note text default null)
returns json language plpgsql security definer
set search_path to 'epibrief','public','extensions','pg_temp' as $$
declare v_slug text; v_office boolean;
begin
  perform epibrief.check_admin(p_admin_key);
  if p_decision not in ('approved','rejected') then raise exception 'BAD_DECISION'; end if;

  update epibrief.applications
     set status = p_decision, note = left(nullif(trim(coalesce(p_note,'')),''), 400), decided_at = now()
   where id = p_id and status = 'pending'
   returning slug into v_slug;
  if v_slug is null then raise exception 'NO_APPLICATION'; end if;

  v_office := exists (select 1 from epibrief.offices where slug = v_slug);
  if p_decision = 'approved' and v_office then
    update epibrief.offices set status = 'verified', verified_at = now() where slug = v_slug;
  end if;
  return json_build_object('ok', true, 'slug', v_slug,
    'awaiting_register', (p_decision = 'approved' and not v_office));
end $$;

-- ───────── 8. 기관 상태 바꾸기 (정지 · 해제) ─────────
create or replace function public.epibrief_admin_set_status(
  p_admin_key text, p_slug text, p_status text)
returns json language plpgsql security definer
set search_path to 'epibrief','public','extensions','pg_temp' as $$
begin
  perform epibrief.check_admin(p_admin_key);
  if p_status not in ('trial','verified','suspended') then raise exception 'BAD_STATUS'; end if;
  update epibrief.offices
     set status = p_status,
         verified_at = case when p_status = 'verified' then coalesce(verified_at, now()) else verified_at end
   where slug = lower(trim(p_slug));
  if not found then raise exception 'NO_OFFICE'; end if;
  return json_build_object('ok', true);
end $$;

-- ───────── 9. 예약어 넣고 빼기 (관리자) ─────────
create or replace function public.epibrief_admin_reserved(
  p_admin_key text, p_action text default 'list', p_slug text default null, p_note text default null)
returns json language plpgsql security definer
set search_path to 'epibrief','public','extensions','pg_temp' as $$
begin
  perform epibrief.check_admin(p_admin_key);
  if p_action = 'add' then
    if lower(trim(coalesce(p_slug,''))) !~ '^[a-z0-9-]{2,40}$' then raise exception 'SLUG_INVALID'; end if;
    insert into epibrief.reserved(slug, note)
      values (lower(trim(p_slug)), left(nullif(trim(coalesce(p_note,'')),''), 60))
      on conflict (slug) do update set note = excluded.note;
  elsif p_action = 'remove' then
    delete from epibrief.reserved where slug = lower(trim(p_slug));
  elsif p_action <> 'list' then
    raise exception 'BAD_ACTION';
  end if;
  return coalesce((select json_agg(json_build_object('slug', slug, 'note', note) order by note, slug)
                   from epibrief.reserved), '[]'::json);
end $$;

-- ───────── 10. 기존 함수에 상태 얹기 ─────────

-- 등록: 예약어를 막고, 승인된 신청이 있으면 바로 인증 상태로 넣습니다.
create or replace function public.epibrief_register(p_slug text, p_name text, p_key text)
returns json language plpgsql security definer
set search_path to 'epibrief','public','extensions','pg_temp' as $$
declare v_slug text := lower(trim(coalesce(p_slug, ''))); v_approved boolean;
begin
  if v_slug !~ '^[a-z0-9-]{2,40}$' then return json_build_object('ok', false, 'error', 'SLUG_INVALID'); end if;
  if length(coalesce(p_key, '')) < 8 then return json_build_object('ok', false, 'error', 'KEY_TOO_SHORT'); end if;
  if length(trim(coalesce(p_name, ''))) < 1 then return json_build_object('ok', false, 'error', 'NAME_REQUIRED'); end if;
  if (select count(*) from epibrief.offices) >= 300 then return json_build_object('ok', false, 'error', 'REGISTRY_FULL'); end if;
  if (select count(*) from epibrief.offices where created_at > now() - interval '1 hour') >= 20 then
    return json_build_object('ok', false, 'error', 'TOO_MANY_REGISTRATIONS'); end if;
  if exists (select 1 from epibrief.offices where slug = v_slug) then return json_build_object('ok', false, 'error', 'SLUG_TAKEN'); end if;

  v_approved := exists (select 1 from epibrief.applications where slug = v_slug and status = 'approved');
  if exists (select 1 from epibrief.reserved where slug = v_slug) and not v_approved then
    return json_build_object('ok', false, 'error', 'SLUG_RESERVED');
  end if;

  insert into epibrief.offices(slug, name, key_hash, status, verified_at)
  values (v_slug, trim(p_name), crypt(p_key, gen_salt('bf', 10)),
          case when v_approved then 'verified' else 'trial' end,
          case when v_approved then now() end);
  return json_build_object('ok', true, 'slug', v_slug, 'name', trim(p_name),
    'status', case when v_approved then 'verified' else 'trial' end);
end $$;

-- 불러오기: 화면이 '체험 중' 띠를 띄울 수 있도록 상태를 함께 돌려줍니다.
create or replace function public.epibrief_load(p_slug text, p_key text)
returns json language plpgsql security definer
set search_path to 'epibrief','public','extensions','pg_temp' as $$
declare a json; n epibrief.newsletters; o epibrief.offices;
begin
  a := epibrief.check_key(p_slug, p_key);
  if not (a->>'ok')::boolean then return a; end if;
  select * into n from epibrief.newsletters where slug = a->>'slug';
  select * into o from epibrief.offices     where slug = a->>'slug';
  return json_build_object('ok', true, 'slug', a->>'slug', 'name', a->>'name',
    'data', n.data, 'version', n.version, 'updated_at', n.updated_at, 'updated_by', n.updated_by,
    'status', coalesce(o.status, 'trial'), 'verified_at', o.verified_at);
end $$;

-- 저장: 정지된 기관은 읽기만 됩니다.
create or replace function public.epibrief_save(
  p_slug text, p_key text, p_data jsonb, p_by text default null, p_version integer default null)
returns json language plpgsql security definer
set search_path to 'epibrief','public','extensions','pg_temp' as $$
declare a json; v_slug text; cur integer; v_status text;
begin
  a := epibrief.check_key(p_slug, p_key);
  if not (a->>'ok')::boolean then return a; end if;
  v_slug := a->>'slug';
  select status into v_status from epibrief.offices where slug = v_slug;
  if v_status = 'suspended' then return json_build_object('ok', false, 'error', 'SUSPENDED'); end if;
  if pg_column_size(p_data) > 400000 then return json_build_object('ok', false, 'error', 'TOO_LARGE'); end if;
  select version into cur from epibrief.newsletters where slug = v_slug;
  if cur is not null and p_version is null then return json_build_object('ok', false, 'error', 'NEED_LOAD'); end if;
  if cur is not null and cur <> p_version then return json_build_object('ok', false, 'error', 'CONFLICT:' || cur); end if;
  insert into epibrief.newsletters(slug, data, version, updated_at, updated_by)
    values (v_slug, p_data, 1, now(), left(p_by, 60))
  on conflict (slug) do update
    set data = excluded.data, version = epibrief.newsletters.version + 1, updated_at = now(), updated_by = excluded.updated_by;
  select version into cur from epibrief.newsletters where slug = v_slug;
  return json_build_object('ok', true, 'version', cur, 'updated_at', now());
end $$;

-- 관리자 목록: 상태와 인증일을 함께 봅니다.
create or replace function public.epibrief_admin_list(p_admin_key text)
returns json language plpgsql security definer
set search_path to 'epibrief','public','extensions','pg_temp' as $$
begin
  perform epibrief.check_admin(p_admin_key);
  return coalesce((select json_agg(json_build_object(
      'slug', o.slug, 'name', o.name, 'created_at', o.created_at,
      'status', o.status, 'verified_at', o.verified_at,
      'version', n.version, 'updated_at', n.updated_at, 'updated_by', n.updated_by,
      'title', n.data->>'title', 'issue', n.data->>'issue',
      'size', pg_column_size(n.data), 'fail_count', o.fail_count, 'locked_until', o.locked_until)
      order by coalesce(n.updated_at, o.created_at) desc)
    from epibrief.offices o left join epibrief.newsletters n on n.slug = o.slug), '[]'::json);
end $$;

-- ───────── 11. 부를 수 있게 열어 주기 ─────────
grant execute on function public.epibrief_slug_check(text)                        to anon, authenticated;
grant execute on function public.epibrief_apply(text,text,text,text,text,text)    to anon, authenticated;
grant execute on function public.epibrief_admin_apps(text,boolean)                to anon, authenticated;
grant execute on function public.epibrief_admin_decide(text,bigint,text,text)     to anon, authenticated;
grant execute on function public.epibrief_admin_set_status(text,text,text)        to anon, authenticated;
grant execute on function public.epibrief_admin_reserved(text,text,text,text)     to anon, authenticated;
