import { supabase } from "../supabaseClient";
import type { AttendanceRecord } from "../types";
import type { AttendanceStatus } from "../constants";

function fromRow(row: any): AttendanceRecord {
  return {
    id: row.id,
    scheduleId: row.schedule_id,
    memberName: row.member_name,
    status: row.status,
    updatedAt: new Date(row.updated_at).getTime(),
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
