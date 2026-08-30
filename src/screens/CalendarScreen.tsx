import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useSession } from "../session/SessionContext";
import { subscribeToSchedules } from "../api/schedules";
import type { Schedule } from "../types";
import { isScheduleEnded, todayString } from "../dateUtils";
import MonthCalendar from "../components/MonthCalendar";
import ScheduleFormModal from "../components/ScheduleFormModal";

const THEME_COLOR = "#3730A3";

export default function CalendarScreen() {
  const { name, part, isAdmin, logout } = useSession();
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [month, setMonth] = useState<string>(todayString().slice(0, 7));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToSchedules(setSchedules, () => toast.error("일정을 불러오지 못했습니다."));
    return unsubscribe;
  }, []);

  const scheduleDates = useMemo(() => new Set(schedules.map((s) => s.date)), [schedules]);

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
          selectedDate={selectedDate}
          onDayClick={handleDayClick}
          themeColor={THEME_COLOR}
        />

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
              selectedSchedules.map((s) => (
                <div key={s.id} className="schedule-row" onClick={() => navigate(`/schedule/${s.id}`)}>
                  <span className="schedule-row-title">{s.title}</span>
                  <span className="schedule-row-meta">
                    {s.startTime} ~ {s.endTime} · {s.place}
                  </span>
                </div>
              ))
            )}
          </>
        )}

        <div className="section-title">이번 달 일정</div>
        {monthlySchedules.length === 0 ? (
          <p className="empty-text">이번 달 등록된 일정이 없습니다.</p>
        ) : (
          monthlySchedules.map((s) => (
            <div key={s.id} className="schedule-row" onClick={() => navigate(`/schedule/${s.id}`)}>
              <span className="schedule-row-title">
                {s.date} · {s.title}
              </span>
              <span className="schedule-row-meta">
                {s.startTime} ~ {s.endTime} · {s.place}
              </span>
            </div>
          ))
        )}
      </div>

      {showAddModal && (
        <ScheduleFormModal
          defaultDate={selectedDate ?? todayString()}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}
