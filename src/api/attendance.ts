import { supabase } from "../supabaseClient";
import type { AttendanceRecord, AttendanceChange } from "../types";
import type { AttendanceStatus, Part } from "../constants";

function fromRow(row: any): AttendanceRecord {
  return {
    id: row.id,
    scheduleId: row.schedule_id,
    memberName: row.member_name,
    status: row.status,
    updatedAt: new Date(row.updated_at).getTime(),
  };
}

function changeFromRow(row: any): AttendanceChange {
  return {
    id: row.id,
    scheduleId: row.schedule_id,
    scheduleTitle: row.schedule_title,
    scheduleDate: row.schedule_date,
    memberName: row.member_name,
    part: row.part,
    oldStatus: row.old_status ?? null,
    newStatus: row.new_status,
    changedBy: row.changed_by,
    createdAt: new Date(row.created_at).getTime(),
  };
}

export function subscribeToAttendance(
  scheduleId: string,
  onChange: (records: AttendanceRecord[]) => void,
  onError?: (error: unknown) => void
) {
  let cancelled = false;

  const load = async () => {
    const { data, error } = await supabase.from("attendance").select("*").eq("schedule_id", scheduleId);
    if (cancelled) return;
    if (error) {
      onError?.(error);
      return;
    }
    onChange((data ?? []).map(fromRow));
  };

  load();

  const channel = supabase
    .channel(`attendance-changes-${Math.random().toString(36).slice(2)}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "attendance" }, () => load())
    .subscribe();

  return () => {
    cancelled = true;
    supabase.removeChannel(channel);
  };
}

// 캘린더 화면에서 "내가 이 일정에 응답했는지"를 표시하기 위해, 한 단원의 응답이 존재하는
// 일정 id 전체를 가져온다 (상태값과 무관하게 행이 있으면 응답한 것 - "미정"도 응답에 포함).
export function subscribeToMemberVotes(
  memberName: string,
  onChange: (scheduleIds: Set<string>) => void,
  onError?: (error: unknown) => void
) {
  let cancelled = false;

  const load = async () => {
    const { data, error } = await supabase.from("attendance").select("schedule_id").eq("member_name", memberName);
    if (cancelled) return;
    if (error) {
      onError?.(error);
      return;
    }
    onChange(new Set((data ?? []).map((row: any) => row.schedule_id)));
  };

  load();

  // requests/members 등 다른 subscribe 함수와 동일한 이유로, 서버 필터 없이 테이블 전체
  // 변경을 구독하고 실제 회원 필터링은 load()의 .eq('member_name', memberName) 쿼리에서 처리한다.
  const channel = supabase
    .channel(`attendance-member-votes-${Math.random().toString(36).slice(2)}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "attendance" }, () => load())
    .subscribe();

  return () => {
    cancelled = true;
    supabase.removeChannel(channel);
  };
}

export async function setAttendance(scheduleId: string, memberName: string, status: AttendanceStatus) {
  const { error } = await supabase.from("attendance").upsert(
    {
      schedule_id: scheduleId,
      member_name: memberName,
      status,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "schedule_id,member_name" }
  );
  if (error) throw error;
}

// 관리자 알림 팝업용 - 참석 여부가 바뀔 때마다 남기는 기록. 이 로그가 실패해도 정작
// 참석 여부 저장 자체(setAttendance)는 이미 끝난 뒤라 사용자에게 에러를 보여주지 않는다.
export async function logAttendanceChange(entry: {
  scheduleId: string;
  scheduleTitle: string;
  scheduleDate: string;
  memberName: string;
  part: Part;
  oldStatus: AttendanceStatus | null;
  newStatus: AttendanceStatus;
  changedBy: string;
}) {
  const { error } = await supabase.from("attendance_changes").insert({
    schedule_id: entry.scheduleId,
    schedule_title: entry.scheduleTitle,
    schedule_date: entry.scheduleDate,
    member_name: entry.memberName,
    part: entry.part,
    old_status: entry.oldStatus,
    new_status: entry.newStatus,
    changed_by: entry.changedBy,
  });
  if (error) throw error;
}

// 마지막으로 확인한 시각(ms) 이후에 쌓인 변경 기록을 가져온다.
export async function fetchChangesSince(sinceMs: number): Promise<AttendanceChange[]> {
  const { data, error } = await supabase
    .from("attendance_changes")
    .select("*")
    .gt("created_at", new Date(sinceMs).toISOString())
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(changeFromRow);
}
