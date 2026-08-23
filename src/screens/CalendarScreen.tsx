import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useSession } from "../session/SessionContext";
import { subscribeToSchedules, createSchedule } from "../api/schedules";
import type { Schedule } from "../types";
import { todayString } from "../dateUtils";
import MonthCalendar from "../components/MonthCalendar";

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
    () => schedules.filter((s) => s.date.startsWith(month)).sort((a, b) => (a.date < b.date ? -1 : 1)),
    [schedules, month]
  );

  const selectedSchedules = useMemo(
    () => (selectedDate ? schedules.filter((s) => s.date === selectedDate) : []),
    [schedules, selectedDate]
  );

  const handleDayClick = (dateString: string) => {
    setSelectedDate(dateString);
    const daySchedules = schedules.filter((s) => s.date === dateString);
    if (daySchedules.length === 1) {
      navigate(`/schedule/${daySchedules[0].id}`);
    }
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
          <button type="button" className="header-link" onClick={handleLogout}>
            다른 이름으로 전환
          </button>
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

        {selectedDate && selectedSchedules.length > 1 && (
          <>
            <div className="section-title">{selectedDate} 일정</div>
            {selectedSchedules.map((s) => (
              <div key={s.id} className="schedule-row" onClick={() => navigate(`/schedule/${s.id}`)}>
                <span className="schedule-row-title">{s.title}</span>
                <span className="schedule-row-meta">
                  {s.startTime} ~ {s.endTime} · {s.place}
                </span>
              </div>
            ))}
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
        <AddScheduleModal
          defaultDate={selectedDate ?? todayString()}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}

function AddScheduleModal({ defaultDate, onClose }: { defaultDate: string; onClose: () => void }) {
  const [date, setDate] = useState(defaultDate);
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("19:00");
  const [endTime, setEndTime] = useState("21:00");
  const [place, setPlace] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!date || !title.trim() || !startTime || !endTime || !place.trim()) {
      toast.error("일정명, 날짜, 시간, 장소를 모두 입력해주세요.");
      return;
    }
    setSubmitting(true);
    try {
      await createSchedule({ date, title: title.trim(), startTime, endTime, place: place.trim(), description });
      toast.success("일정이 등록되었습니다.");
      onClose();
    } catch {
      toast.error("등록 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">새 일정 등록</div>

        <div className="field-label" style={{ marginTop: 0 }}>
          일정명
        </div>
        <input className="text-field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 정기연습" />

        <div className="field-label">날짜</div>
        <input className="text-field" type="date" value={date} onChange={(e) => setDate(e.target.value)} />

        <div className="field-label">시간</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            className="text-field"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
          <span>~</span>
          <input className="text-field" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
        </div>

        <div className="field-label">장소</div>
        <input
          className="text-field"
          value={place}
          onChange={(e) => setPlace(e.target.value)}
          placeholder="예: 창원근로자회관"
        />

        <div className="field-label">설명 (선택)</div>
        <input className="text-field" value={description} onChange={(e) => setDescription(e.target.value)} />

        <button type="button" className="submit-button" onClick={handleSubmit} disabled={submitting}>
          {submitting ? "등록 중..." : "일정 등록"}
        </button>
        <button type="button" className="modal-cancel" onClick={onClose}>
          닫기
        </button>
      </div>
    </div>
  );
}
