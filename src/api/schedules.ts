import { supabase } from "../supabaseClient";
import type { Schedule } from "../types";

function fromRow(row: any): Schedule {
  return {
    id: row.id,
    date: row.date,
    title: row.title,
    startTime: row.start_time,
    endTime: row.end_time,
    place: row.place,
    description: row.description ?? undefined,
    createdAt: new Date(row.created_at).getTime(),
  };
}

export function subscribeToSchedules(
  onChange: (schedules: Schedule[]) => void,
  onError?: (error: unknown) => void
) {
  let cancelled = false;

  const load = async () => {
    const { data, error } = await supabase.from("schedules").select("*").order("date", { ascending: true });
    if (cancelled) return;
    if (error) {
      onError?.(error);
      return;
    }
    onChange((data ?? []).map(fromRow));
  };

  load();

  const channel = supabase
    .channel(`schedules-changes-${Math.random().toString(36).slice(2)}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "schedules" }, () => load())
    .subscribe();

  return () => {
    cancelled = true;
    supabase.removeChannel(channel);
  };
}

export interface CreateScheduleInput {
  date: string;
  title: string;
  startTime: string;
  endTime: string;
  place: string;
  description?: string;
}

export async function createSchedule(input: CreateScheduleInput) {
  const { error } = await supabase.from("schedules").insert({
    date: input.date,
    title: input.title,
    start_time: input.startTime,
    end_time: input.endTime,
    place: input.place,
    description: input.description?.trim() || null,
  });
  if (error) throw error;
}

export type UpdateScheduleInput = CreateScheduleInput;

export async function updateSchedule(id: string, input: UpdateScheduleInput) {
  const { error } = await supabase
    .from("schedules")
    .update({
      date: input.date,
      title: input.title,
      start_time: input.startTime,
      end_time: input.endTime,
      place: input.place,
      description: input.description?.trim() || null,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteSchedule(id: string) {
  const { error } = await supabase.from("schedules").delete().eq("id", id);
  if (error) throw error;
}
