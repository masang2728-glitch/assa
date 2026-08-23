-- Supabase SQL Editor에서 실행하세요. (여러 번 실행해도 안전합니다.)

create extension if not exists pgcrypto;

create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  part text not null,
  role text not null default 'MEMBER',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists schedules (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  title text not null,
  start_time text not null,
  end_time text not null,
  place text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists attendance (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references schedules(id) on delete cascade,
  member_name text not null,
  status text not null,
  updated_at timestamptz not null default now(),
  unique (schedule_id, member_name)
);

create index if not exists schedules_date_idx on schedules (date);
create index if not exists attendance_schedule_idx on attendance (schedule_id);

-- 이 앱은 로그인 없이 이름+파트만으로 동작하므로, RLS는 "누구나 읽기/쓰기 가능"으로 열어둔다.
-- (관리자 전용 기능은 클라이언트 앱 UI 단에서 PIN으로 처리된다. 실제 배포 시 강화 필요.)
alter table members enable row level security;
alter table schedules enable row level security;
alter table attendance enable row level security;

drop policy if exists "public read members" on members;
drop policy if exists "public insert members" on members;
drop policy if exists "public update members" on members;
drop policy if exists "public delete members" on members;
create policy "public read members" on members for select using (true);
create policy "public insert members" on members for insert with check (true);
create policy "public update members" on members for update using (true);
create policy "public delete members" on members for delete using (true);

drop policy if exists "public read schedules" on schedules;
drop policy if exists "public insert schedules" on schedules;
drop policy if exists "public update schedules" on schedules;
drop policy if exists "public delete schedules" on schedules;
create policy "public read schedules" on schedules for select using (true);
create policy "public insert schedules" on schedules for insert with check (true);
create policy "public update schedules" on schedules for update using (true);
create policy "public delete schedules" on schedules for delete using (true);

drop policy if exists "public read attendance" on attendance;
drop policy if exists "public insert attendance" on attendance;
drop policy if exists "public update attendance" on attendance;
create policy "public read attendance" on attendance for select using (true);
create policy "public insert attendance" on attendance for insert with check (true);
create policy "public update attendance" on attendance for update using (true);

-- 실시간 구독을 위해 Realtime publication에 테이블 추가 (이미 추가되어 있으면 건너뜀)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'members'
  ) then
    alter publication supabase_realtime add table members;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'schedules'
  ) then
    alter publication supabase_realtime add table schedules;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'attendance'
  ) then
    alter publication supabase_realtime add table attendance;
  end if;
end $$;
