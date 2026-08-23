import { supabase } from "../supabaseClient";
import type { Member } from "../types";
import type { Part } from "../constants";

function fromRow(row: any): Member {
  return {
    id: row.id,
    name: row.name,
    part: row.part,
    role: row.role,
    active: row.active,
  };
}

export async function upsertMember(name: string, part: Part) {
  const { error } = await supabase.from("members").upsert({ name, part }, { onConflict: "name" });
  if (error) throw error;
}

export async function updateMemberPart(name: string, part: Part) {
  const { error } = await supabase.from("members").update({ part }).eq("name", name);
  if (error) throw error;
}

export async function deactivateMember(name: string) {
  const { error } = await supabase.from("members").update({ active: false }).eq("name", name);
  if (error) throw error;
}

export function subscribeToMembers(
  onChange: (members: Member[]) => void,
  onError?: (error: unknown) => void
) {
  let cancelled = false;

  const load = async () => {
    const { data, error } = await supabase
      .from("members")
      .select("*")
      .eq("active", true)
      .order("part", { ascending: true })
      .order("name", { ascending: true });
    if (cancelled) return;
    if (error) {
      onError?.(error);
      return;
    }
    onChange((data ?? []).map(fromRow));
  };

  load();

  const channel = supabase
    .channel(`members-changes-${Math.random().toString(36).slice(2)}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "members" }, () => load())
    .subscribe();

  return () => {
    cancelled = true;
    supabase.removeChannel(channel);
  };
}
