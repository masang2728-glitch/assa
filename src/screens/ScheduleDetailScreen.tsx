import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { useSession } from "../session/SessionContext";
import { subscribeToSchedules, deleteSchedule } from "../api/schedules";
import { subscribeToAttendance, setAttendance } from "../api/attendance";
import { subscribeToMembers } from "../api/members";
import type { Schedule, AttendanceRecord, Member } from "../types";
import { ATTENDANCE_STATUSES, PARTS, type AttendanceStatus } from "../constants";

const THEME_COLOR = "#3730A3";

export default function ScheduleDetailScreen() {
  const { scheduleId } = useParams<{ scheduleId: string }>();
  const { name, isAdmin } = useSession();
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [saving, setSaving] = useState(false);
  const [expandedKey, setExpandedKey] = useState<string | null>(null); // `${part}__${status}`

  useEffect(() => {
    const unsubscribe = subscribeToSchedules(setSchedules, () => toast.error("일정을 불러오지 못했습니다."));
    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToMembers(setMembers, () => toast.error("단원 명단을 불러오지 못했습니다."));
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!scheduleId) return;
    const unsubscribe = subscribeToAttendance(scheduleId, setRecords, () =>
      toast.error("참석 현황을 불러오지 못했습니다.")
    );
    return unsubscribe;
  }, [scheduleId]);

  const schedule = useMemo(() => schedules.find((s) => s.id === scheduleId) ?? null, [schedules, scheduleId]);

  const myRecord = useMemo(() => records.find((r) => r.memberName === name), [records, name]);

  const statusByName = useMemo(() => {
    const map = new Map<string, AttendanceStatus>();
    for (const r of records) map.set(r.memberName, r.status);
    return map;
  }, [records]);

  const partBreakdown = useMemo(() => {
    const map = new Map<string, Map<AttendanceStatus, string[]>>();
    for (const part of PARTS) {
      const statusMap = new Map<AttendanceStatus, string[]>();
      for (const status of ATTENDANCE_STATUSES) statusMap.set(status, []);
      map.set(part, statusMap);
    }
    for (const m of members) {
      const status = statusByName.get(m.name) ?? "미정";
      map.get(m.part)?.get(status)?.push(m.name);
    }
    return map;
  }, [members, statusByName]);

  const handleSelectStatus = async (status: AttendanceStatus) => {
    if (!scheduleId || !name) return;
    setSaving(true);
    try {
      await setAttendance(scheduleId, name, status);
    } catch {
      toast.error("저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSchedule = async () => {
    if (!schedule) return;
    if (!window.confirm(`"${schedule.title}" 일정을 삭제할까요? 참석 기록도 함께 사라집니다.`)) return;
    try {
      await deleteSchedule(schedule.id);
      toast.success("일정을 삭제했습니다.");
      navigate("/calendar", { replace: true });
    } catch {
      toast.error("삭제 중 오류가 발생했습니다.");
    }
  };

  if (!schedule) {
    return (
      <div className="screen">
        <div className="header">
          <div className="header-row">
            <h1 className="header-title">일정</h1>
            <button type="button" className="header-link" onClick={() => navigate("/calendar")}>
              캘린더로 ›
            </button>
          </div>
        </div>
        <div className="content">
          <p className="empty-text">불러오는 중이거나 존재하지 않는 일정입니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="header">
        <div className="header-row">
          <div>
            <h1 className="header-title">{schedule.title}</h1>
            <div className="header-sub">{schedule.date}</div>
          </div>
          <button type="button" className="header-link" onClick={() => navigate("/calendar")}>
            캘린더로 ›
          </button>
        </div>
      </div>

      <div className="content">
        <div className="field-label" style={{ marginTop: 0 }}>
          시간
        </div>
        <div>
          {schedule.startTime} ~ {schedule.endTime}
        </div>

        <div className="field-label">장소</div>
        <div>{schedule.place}</div>

        {schedule.description && (
          <>
            <div className="field-label">설명</div>
            <div>{schedule.description}</div>
          </>
        )}

        <div className="section-title">
          나의 참석 여부{myRecord ? ` · 현재: ${myRecord.status}` : ""}
        </div>
        <div className="status-grid">
          {ATTENDANCE_STATUSES.map((status) => (
            <button
              key={status}
              type="button"
              className="status-chip"
              style={
                myRecord?.status === status
                  ? { backgroundColor: THEME_COLOR, borderColor: THEME_COLOR, color: "#fff" }
                  : undefined
              }
              disabled={saving}
              onClick={() => handleSelectStatus(status)}
            >
              {status}
            </button>
          ))}
        </div>

        <div className="section-title">파트별 참석 현황</div>
        {PARTS.map((part) => {
          const statusMap = partBreakdown.get(part)!;
          return (
            <div key={part} className="part-card">
              <div className="part-card-title">{part}</div>
              {ATTENDANCE_STATUSES.map((status) => {
                const names = statusMap.get(status) ?? [];
                const key = `${part}__${status}`;
                const isExpanded = expandedKey === key;
                return (
                  <div key={status}>
                    <button
                      type="button"
                      className="part-status-row"
                      onClick={() => setExpandedKey(isExpanded ? null : key)}
                    >
                      <span className="part-status-label">{status}</span>
                      <span className="part-status-count">{names.length}</span>
                    </button>
                    {isExpanded && (
                      <div className="chip-row">
                        {names.length === 0 ? (
                          <span className="empty-text">없음</span>
                        ) : (
                          names.map((n) => (
                            <span key={n} className="name-chip">
                              {n}
                            </span>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}

        {isAdmin && (
          <button
            type="button"
            className="modal-cancel"
            style={{ color: "#ef4444" }}
            onClick={handleDeleteSchedule}
          >
            일정 삭제
          </button>
        )}
      </div>
    </div>
  );
}
