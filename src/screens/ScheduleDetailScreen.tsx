import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { useSession } from "../session/SessionContext";
import { subscribeToSchedules, deleteSchedule } from "../api/schedules";
import { subscribeToAttendance, setAttendance } from "../api/attendance";
import { subscribeToMembers } from "../api/members";
import ScheduleFormModal from "../components/ScheduleFormModal";
import type { Schedule, AttendanceRecord, Member } from "../types";
import { ATTENDANCE_STATUSES, NON_VOTING_PARTS, PARTS, VOICE_PARTS, type AttendanceStatus } from "../constants";

const PART_ORDER = new Map(PARTS.map((p, i) => [p, i]));

const THEME_COLOR = "#3730A3";

type SummaryKey = "attend" | "undecided" | "pending" | "absent" | "online";
const SUMMARY_LABELS: Record<SummaryKey, string> = {
  attend: "참석·늦참",
  undecided: "미정",
  pending: "미응답",
  absent: "불참",
  online: "온라인",
};

export default function ScheduleDetailScreen() {
  const { scheduleId } = useParams<{ scheduleId: string }>();
  const { name, part, isAdmin } = useSession();
  const isVotingPart = !!part && !(NON_VOTING_PARTS as readonly string[]).includes(part);
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [saving, setSaving] = useState(false);
  const [expandedKey, setExpandedKey] = useState<string | null>(null); // `${part}__${status}`
  const [expandedSummary, setExpandedSummary] = useState<SummaryKey | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [adminTargetName, setAdminTargetName] = useState<string | null>(null);
  const [adminSaving, setAdminSaving] = useState(false);

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

  // members loaded from Supabase come back sorted alphabetically by part, which does not
  // match the choir's logical part order (소프라노·알토·테너·베이스·지휘자·반주자) — resort here.
  const orderedMembers = useMemo(
    () =>
      [...members].sort((a, b) => {
        const partDiff = (PART_ORDER.get(a.part) ?? 0) - (PART_ORDER.get(b.part) ?? 0);
        return partDiff !== 0 ? partDiff : a.name.localeCompare(b.name, "ko");
      }),
    [members]
  );

  const partBreakdown = useMemo(() => {
    const map = new Map<string, Map<AttendanceStatus, string[]>>();
    for (const part of PARTS) {
      const statusMap = new Map<AttendanceStatus, string[]>();
      for (const status of ATTENDANCE_STATUSES) statusMap.set(status, []);
      map.set(part, statusMap);
    }
    for (const m of orderedMembers) {
      const status = statusByName.get(m.name) ?? "미정";
      map.get(m.part)?.get(status)?.push(m.name);
    }
    return map;
  }, [orderedMembers, statusByName]);

  // "미정"(직접 선택)과 "미응답"(아직 아무 응답도 안 한 경우)을 구분한다 — statusByName에
  // 기록이 아예 없으면 미응답, 기록은 있는데 그 값이 "미정"이면 미정으로 취급한다.
  const summaryGroups = useMemo(() => {
    const groups: Record<SummaryKey, string[]> = {
      attend: [],
      undecided: [],
      pending: [],
      absent: [],
      online: [],
    };
    for (const m of orderedMembers) {
      const status = statusByName.get(m.name);
      if (status === "참석" || status === "늦참") groups.attend.push(m.name);
      else if (status === "불참") groups.absent.push(m.name);
      else if (status === "온라인") groups.online.push(m.name);
      else if (status === "미정") groups.undecided.push(m.name);
      else groups.pending.push(m.name);
    }
    return groups;
  }, [orderedMembers, statusByName]);

  // 출석현황 명단을 펼쳤을 때 파트별로 묶어서 보여주기 위한 구성. orderedMembers가 이미
  // 파트 순서로 정렬돼 있으니, PARTS 순서대로 순회하며 채우면 그대로 파트 순서가 유지된다.
  const summaryGroupsByPart = useMemo(() => {
    const groups: Record<SummaryKey, Map<string, string[]>> = {
      attend: new Map(),
      undecided: new Map(),
      pending: new Map(),
      absent: new Map(),
      online: new Map(),
    };
    for (const m of orderedMembers) {
      const status = statusByName.get(m.name);
      const key: SummaryKey =
        status === "참석" || status === "늦참"
          ? "attend"
          : status === "불참"
            ? "absent"
            : status === "온라인"
              ? "online"
              : status === "미정"
                ? "undecided"
                : "pending";
      const map = groups[key];
      if (!map.has(m.part)) map.set(m.part, []);
      map.get(m.part)!.push(m.name);
    }
    return groups;
  }, [orderedMembers, statusByName]);

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

  // 관리자가 다른 단원의 참석 여부를 대신 변경할 때 쓴다.
  const handleAdminSetStatus = async (targetName: string, status: AttendanceStatus) => {
    if (!scheduleId) return;
    setAdminSaving(true);
    try {
      await setAttendance(scheduleId, targetName, status);
      toast.success(`${targetName}님 참석 여부를 "${status}"(으)로 변경했습니다.`);
      setAdminTargetName(null);
    } catch {
      toast.error("저장 중 오류가 발생했습니다.");
    } finally {
      setAdminSaving(false);
    }
  };

  // 관리자면 이름 칩을 눌러서 바로 그 사람의 참석 여부를 바꿀 수 있게 한다.
  const renderNameChip = (n: string) =>
    isAdmin ? (
      <button
        key={n}
        type="button"
        className="name-chip name-chip-admin"
        onClick={() => setAdminTargetName(n)}
      >
        {n}
      </button>
    ) : (
      <span key={n} className="name-chip">
        {n}
      </span>
    );

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

        {isVotingPart && (
          <>
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
          </>
        )}

        <div className="section-title">출석 현황</div>
        <div className="summary-grid">
          {(Object.keys(SUMMARY_LABELS) as SummaryKey[]).map((key) => (
            <button
              key={key}
              type="button"
              className={"summary-card" + (key !== "online" && key !== "undecided" ? ` ${key}` : "")}
              onClick={() => setExpandedSummary(expandedSummary === key ? null : key)}
            >
              <div className="n">{summaryGroups[key].length}</div>
              <div className="l">{SUMMARY_LABELS[key]}</div>
            </button>
          ))}
        </div>

        {expandedSummary && (
          <div className="summary-detail-box">
            <div className="summary-detail-head">
              {SUMMARY_LABELS[expandedSummary]} 명단 ({summaryGroups[expandedSummary].length}명)
            </div>
            {summaryGroups[expandedSummary].length === 0 ? (
              <div className="chip-row">
                <span className="empty-text">없음</span>
              </div>
            ) : (
              PARTS.map((part) => {
                const names = summaryGroupsByPart[expandedSummary].get(part);
                if (!names || names.length === 0) return null;
                return (
                  <div key={part} className="summary-detail-part">
                    <div className="part-status-label">
                      {part} <span className="summary-detail-part-count">{names.length}</span>
                    </div>
                    <div className="chip-row">{names.map(renderNameChip)}</div>
                  </div>
                );
              })
            )}
          </div>
        )}

        <div className="section-title">파트별 참석 현황</div>
        {VOICE_PARTS.map((part) => {
          const statusMap = partBreakdown.get(part)!;
          const attendCount = statusMap.get("참석")?.length ?? 0;
          const lateCount = statusMap.get("늦참")?.length ?? 0;
          return (
            <div key={part} className="part-card">
              <div className="part-card-head">
                <span className="part-card-title">{part}</span>
                <span className="part-card-total">참석+늦참 {attendCount + lateCount}명</span>
              </div>
              {ATTENDANCE_STATUSES.map((status) => {
                const names = statusMap.get(status) ?? [];
                const alwaysShowNames = status === "참석" || status === "늦참";

                if (alwaysShowNames) {
                  return (
                    <div key={status} className="part-status-inline">
                      <div className="part-status-inline-head">
                        <span className="part-status-label">{status}</span>
                        <span className="part-status-count">{names.length}</span>
                      </div>
                      <div className="chip-row">
                        {names.length === 0 ? (
                          <span className="empty-text">없음</span>
                        ) : (
                          names.map(renderNameChip)
                        )}
                      </div>
                    </div>
                  );
                }

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
                          names.map(renderNameChip)
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
          <div className="action-link-row" style={{ marginTop: 16 }}>
            <button type="button" className="edit-link" onClick={() => setShowEditModal(true)}>
              일정 수정
            </button>
            <button type="button" className="danger-link" onClick={handleDeleteSchedule}>
              일정 삭제
            </button>
          </div>
        )}
      </div>

      {showEditModal && (
        <ScheduleFormModal
          defaultDate={schedule.date}
          schedule={schedule}
          onClose={() => setShowEditModal(false)}
        />
      )}

      {adminTargetName && (
        <div className="modal-backdrop" onClick={() => setAdminTargetName(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">{adminTargetName}님 참석 여부 변경</div>
            <div className="status-grid">
              {ATTENDANCE_STATUSES.map((status) => (
                <button
                  key={status}
                  type="button"
                  className="status-chip"
                  style={
                    statusByName.get(adminTargetName) === status
                      ? { backgroundColor: THEME_COLOR, borderColor: THEME_COLOR, color: "#fff" }
                      : undefined
                  }
                  disabled={adminSaving}
                  onClick={() => handleAdminSetStatus(adminTargetName, status)}
                >
                  {status}
                </button>
              ))}
            </div>
            <button type="button" className="modal-cancel" onClick={() => setAdminTargetName(null)}>
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
