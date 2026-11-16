import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useSession } from "../session/SessionContext";
import { subscribeToSchedules } from "../api/schedules";
import { subscribeToMyAttendance } from "../api/attendance";
import type { Schedule, AttendanceRecord } from "../types";
import { NON_VOTING_PARTS } from "../constants";
import { formatDateWithWeekday, isScheduleEnded, todayString } from "../dateUtils";
import MonthCalendar, { type DateVoteStatus } from "../components/MonthCalendar";
import ScheduleFormModal from "../components/ScheduleFormModal";
import { PageHeader, BottomNav } from "../components/Layout";
import DateBox from "../components/DateBox";
import { STATUS_CLASS } from "../attendanceResponse";

const THEME_COLOR = "#0E2A5C";

export default function CalendarScreen() {
  const { name, part, isAdmin } = useSession();
  const navigate = useNavigate();
  const isVotingPart = !!part && !(NON_VOTING_PARTS as readonly string[]).includes(part);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [myRecords, setMyRecords] = useState<AttendanceRecord[]>([]);
  const [month, setMonth] = useState<string>(todayString().slice(0, 7));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToSchedules(setSchedules, () => toast.error("일정을 불러오지 못했습니다."));
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!name) return;
    const unsubscribe = subscribeToMyAttendance(name, setMyRecords, () =>
      toast.error("응답 현황을 불러오지 못했습니다.")
    );
    return unsubscribe;
  }, [name]);

  const myStatus = useMemo(() => new Map(myRecords.map((r) => [r.scheduleId, r.status])), [myRecords]);

  const scheduleDates = useMemo(() => new Set(schedules.map((s) => s.date)), [schedules]);

  // 날짜별로, 그날 일정에 내가 전부 응답했으면 "voted", 하나라도 응답 안 했으면 "unvoted".
  const voteStatusByDate = useMemo(() => {
    const map: Record<string, DateVoteStatus> = {};
    for (const s of schedules) {
      const voted = myStatus.has(s.id);
      if (map[s.date] === "unvoted") continue;
      map[s.date] = voted ? "voted" : "unvoted";
    }
    return map;
  }, [schedules, myStatus]);

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

  const renderScheduleRow = (s: Schedule) => {
    const status = myStatus.get(s.id);
    return (
      <button key={s.id} type="button" className="sched-card" onClick={() => navigate(`/schedule/${s.id}`)}>
        <DateBox date={s.date} />
        <div className="sched-card-main">
          <span className="sched-card-title">{s.title}</span>
          <span className="sched-card-meta">
            {s.startTime} ~ {s.endTime} · {s.place}
          </span>
        </div>
        {isVotingPart &&
          (status ? (
            <span className={`status-pill ${STATUS_CLASS[status]}`}>{status}</span>
          ) : (
            <span className="status-pill pending">응답 필요</span>
          ))}
      </button>
    );
  };

  return (
    <div className="screen has-nav">
      <PageHeader title="일정 달력" backTo="/home" />

      <div className="content">
        <div className="card calendar-card">
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
              <span className="legend-dot legend-dot-voted" />
              응답 완료
            </span>
            <span className="legend-item">
              <span className="legend-dot legend-dot-unvoted" />
              응답 필요
            </span>
          </div>
        </div>

        {selectedDate && (
          <>
            <div className="section-title">{formatDateWithWeekday(selectedDate)} 일정</div>
            {selectedSchedules.length === 0 ? (
              <p className="empty-text">등록된 일정이 없습니다.</p>
            ) : (
              selectedSchedules.map((s) => renderScheduleRow(s))
            )}
          </>
        )}

        <div className="section-title">이번 달 일정</div>
        {monthlySchedules.length === 0 ? (
          <p className="empty-text">이번 달 남은 일정이 없습니다.</p>
        ) : (
          monthlySchedules.map((s) => renderScheduleRow(s))
        )}
      </div>

      {isAdmin && (
        <button type="button" className="fab" onClick={() => setShowAddModal(true)}>
          + 일정 등록
        </button>
      )}

      {showAddModal && (
        <ScheduleFormModal defaultDate={selectedDate ?? todayString()} onClose={() => setShowAddModal(false)} />
      )}

      <BottomNav />
    </div>
  );
}
