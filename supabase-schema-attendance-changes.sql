-- Supabase SQL Editor에서 실행하세요. (여러 번 실행해도 안전합니다.)
-- 관리자에게 "누가 참석 여부를 바꿨는지" 알려주는 팝업 기능용 변경 이력 로그.
-- 본인이 직접 바꾼 경우, 관리자가 다른 사람 걸 대신 바꾼 경우 모두 여기 쌓인다.

create extension if not exists pgcrypto;

create table if not exists attendance_changes (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references schedules(id) on delete cascade,
  schedule_title text not null,
  schedule_date date not null,
  member_name text not null,
  part text not null,
  old_status text,
  new_status text not null,
  changed_by text not null,
  created_at timestamptz not null default now()
);

create index if not exists attendance_changes_created_idx on attendance_changes (created_at);

-- 이 앱은 로그인 없이 이름+파트만으로 동작하므로, RLS는 "누구나 읽기/쓰기 가능"으로 열어둔다.
alter table attendance_changes enable row level security;

drop policy if exists "public read attendance_changes" on attendance_changes;
drop policy if exists "public insert attendance_changes" on attendance_changes;
create policy "public read attendance_changes" on attendance_changes for select using (true);
create policy "public insert attendance_changes" on attendance_changes for insert with check (true);

-- 실시간 구독을 위해 Realtime publication에 테이블 추가 (이미 추가되어 있으면 건너뜀)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'attendance_changes'
  ) then
    alter publication supabase_realtime add table attendance_changes;
  end if;
end $$;
