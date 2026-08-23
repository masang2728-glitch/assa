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
