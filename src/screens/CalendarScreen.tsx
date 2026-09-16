import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useSession } from "../session/SessionContext";
import { subscribeToSchedules } from "../api/schedules";
import { subscribeToMemberVotes, fetchChangesSince } from "../api/attendance";
import type { Schedule, AttendanceChange } from "../types";
import type { AttendanceStatus } from "../constants";
import { isScheduleEnded, todayString } from "../dateUtils";
import MonthCalendar, { type DateVoteStatus } from "../components/MonthCalendar";
import ScheduleFormModal from "../components/ScheduleFormModal";

const THEME_COLOR = "#3730A3";

// 마지막으로 변경 알림을 확인한 시각을 기기(브라우저)에 저장해둔다 - 관리자가 다른 기기로
// 들어오면 그 기기는 아직 안 읽은 걸로 다시 보여도 괜찮다고 확인받았다.
const LAST_SEEN_CHANGE_KEY = "assa:lastSeenChangeAt";

const STATUS_PILL_CLASS: Record<AttendanceStatus, string> = {
  참석: "attend",
  늦참: "attend",
  불참: "absent",
  온라인: "online",
  미정: "undecided",
};

function BellIcon() {
  return (
    <svg
      className="change-modal-bell"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
    </svg>
  );
}

export default function CalendarScreen() {
  const { name, part, isAdmin, logout } = useSession();
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [votedScheduleIds, setVotedScheduleIds] = useState<Set<string>>(new Set());
  const [month, setMonth] = useState<string>(todayString().slice(0, 7));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<AttendanceChange[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToSchedules(setSchedules, () => toast.error("일정을 불러오지 못했습니다."));
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!name) return;
    const unsubscribe = subscribeToMemberVotes(name, setVotedScheduleIds, () =>
      toast.error("응답 현황을 불러오지 못했습니다.")
    );
    return unsubscribe;
  }, [name]);

  // 관리자만: 마지막으로 확인한 뒤 (본인이 만든 변경은 빼고) 남이 바꾼 참석 여부가 있으면
  // 메인 화면 진입 시 딱 한 번 모아서 팝업으로 보여준다.
  useEffect(() => {
    if (!isAdmin || !name) return;
    const lastSeenRaw = localStorage.getItem(LAST_SEEN_CHANGE_KEY);
    if (!lastSeenRaw) {
      // 이 기능이 처음 생긴 시점 - 그 이전 변경 이력을 한꺼번에 쏟아내지 않고 지금부터 추적한다.
      localStorage.setItem(LAST_SEEN_CHANGE_KEY, String(Date.now()));
      return;
    }
    fetchChangesSince(Number(lastSeenRaw))
      .then((changes) => {
        const others = changes.filter((c) => c.changedBy !== name);
        if (others.length > 0) setPendingChanges(others);
      })
      .catch(() => {
        // 알림은 부가 기능이라 실패해도 메인 화면 사용에는 지장 없게 조용히 넘어간다.
      });
  }, [isAdmin, name]);

  const acknowledgeChanges = () => {
    localStorage.setItem(LAST_SEEN_CHANGE_KEY, String(Date.now()));
    setPendingChanges([]);
  };

  const scheduleDates = useMemo(() => new Set(schedules.map((s) => s.date)), [schedules]);

  // 날짜별로, 그날 일정에 내가 전부 응답했으면 "voted", 하나라도 응답 안 했으면 "unvoted".
  const voteStatusByDate = useMemo(() => {
    const map: Record<string, DateVoteStatus> = {};
    for (const s of schedules) {
      const voted = votedScheduleIds.has(s.id);
      if (map[s.date] === "unvoted") continue;
      map[s.date] = voted ? "voted" : "unvoted";
    }
    return map;
  }, [schedules, votedScheduleIds]);

  const monthlySchedules = useMemo(
    () =>
      schedules
        .filter((s) => s.date.startsWith(month) && !isScheduleEnded(s))
        .sort((a, b) => (a.date < b.date ? -1 : 1)),
    [schedules, month]
  );

  const selectedSchedules = useMemo(
    () => (selectedDate ? schedules.filter((s) => s.date === selectedDate) : []),
    [schedules, selectedDate]
  );

  const handleDayClick = (dateString: string) => {
    setSelectedDate((prev) => (prev === dateString ? null : dateString));
  };

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  const renderScheduleRow = (s: Schedule, titlePrefix?: string) => {
    const voted = votedScheduleIds.has(s.id);
    return (
      <div
        key={s.id}
        className={`schedule-row ${voted ? "voted" : "unvoted"}`}
        onClick={() => navigate(`/schedule/${s.id}`)}
      >
        <div className="schedule-row-main">
          <span className="schedule-row-title">
            {titlePrefix ? `${titlePrefix} · ${s.title}` : s.title}
          </span>
          <span className="schedule-row-meta">
            {s.startTime} ~ {s.endTime} · {s.place}
          </span>
        </div>
        <span className={`vote-badge ${voted ? "voted" : "unvoted"}`}>{voted ? "✓ 응답완료" : "미응답"}</span>
      </div>
    );
  };

  return (
    <div className="screen">
      <div className="header">
        <div className="header-row">
          <div>
            <h1 className="header-title">ASSA</h1>
            <div className="header-sub">
              {name}님 · {part}
              {isAdmin ? " · 관리자" : ""}
            </div>
          </div>
          <div className="header-links">
            <button type="button" className="header-link" onClick={() => navigate("/members")}>
              멤버 현황
            </button>
            <button type="button" className="header-link" onClick={handleLogout}>
              다른 이름으로 전환
            </button>
          </div>
        </div>
      </div>

      <div className="content">
        <MonthCalendar
          month={month}
          onMonthChange={setMonth}
          scheduleDates={scheduleDates}
          voteStatusByDate={voteStatusByDate}
          selectedDate={selectedDate}
          onDayClick={handleDayClick}
          themeColor={THEME_COLOR}
        />

        <div className="legend-row">
          <span className="legend-item">
            <span className="legend-dot legend-dot-voted" />내가 응답완료
          </span>
          <span className="legend-item">
            <span className="legend-dot legend-dot-unvoted" />내가 미응답
          </span>
        </div>

        {isAdmin && (
          <button
            type="button"
            className="submit-button"
            style={{ marginTop: 16 }}
            onClick={() => setShowAddModal(true)}
          >
            + 새 일정 등록
          </button>
        )}

        {selectedDate && (
          <>
            <div className="section-title">{selectedDate} 일정</div>
            {selectedSchedules.length === 0 ? (
              <p className="empty-text">등록된 일정이 없습니다.</p>
            ) : (
              selectedSchedules.map((s) => renderScheduleRow(s))
            )}
          </>
        )}

        <div className="section-title">이번 달 일정</div>
        {monthlySchedules.length === 0 ? (
          <p className="empty-text">이번 달 등록된 일정이 없습니다.</p>
        ) : (
          monthlySchedules.map((s) => renderScheduleRow(s, s.date))
        )}
      </div>

      {showAddModal && (
        <ScheduleFormModal
          defaultDate={selectedDate ?? todayString()}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {pendingChanges.length > 0 && (
        <div className="modal-backdrop modal-backdrop-center" onClick={acknowledgeChanges}>
          <div className="modal-card modal-card-center" onClick={(e) => e.stopPropagation()}>
            <div className="change-modal-title-row">
              <BellIcon />
              <div className="modal-title" style={{ margin: 0 }}>
                참석 여부 변경 알림
              </div>
            </div>
            <p className="modal-desc">마지막으로 확인하신 뒤 바뀐 참석 여부 변경사항이에요.</p>

            <div className="change-list">
              {pendingChanges.map((c) => (
                <div key={c.id} className="change-item">
                  <div className="change-who">
                    <span className="part">{c.part}</span>
                    {c.memberName}
                  </div>
                  <div className="change-status-row">
                    <span className={`status-pill ${c.oldStatus ? STATUS_PILL_CLASS[c.oldStatus] : "undecided"}`}>
                      {c.oldStatus ?? "미응답"}
                    </span>
                    <span className="change-arrow">→</span>
                    <span className={`status-pill ${STATUS_PILL_CLASS[c.newStatus]}`}>{c.newStatus}</span>
                  </div>
                  <div className="change-meta">
                    {c.scheduleTitle} · {c.scheduleDate}
                    {c.changedBy !== c.memberName ? ` · ${c.changedBy}님이 변경` : ""}
                  </div>
                </div>
              ))}
            </div>

            <button type="button" className="submit-button" onClick={acknowledgeChanges}>
              확인했어요
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
