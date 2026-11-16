import type { AttendanceChange, Schedule } from "../types";
import { formatDateWithWeekday } from "../dateUtils";
import { STATUS_CLASS } from "../attendanceResponse";

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

// 새 일정 등록 알림 (모든 단원, 앱에 들어올 때)
export function NewSchedulesModal({
  schedules,
  onClose,
  onPick,
}: {
  schedules: Schedule[];
  onClose: () => void;
  onPick: (s: Schedule) => void;
}) {
  return (
    <div className="modal-backdrop modal-backdrop-center" onClick={onClose}>
      <div className="modal-card modal-card-center" onClick={(e) => e.stopPropagation()}>
        <div className="change-modal-title-row">
          <BellIcon />
          <div className="modal-title" style={{ margin: 0 }}>
            새 일정이 등록되었어요
          </div>
        </div>
        <p className="modal-desc">일정을 누르면 바로 참석 여부를 응답할 수 있어요.</p>

        <div className="change-list">
          {schedules.map((s) => (
            <button key={s.id} type="button" className="change-item new-schedule-item" onClick={() => onPick(s)}>
              <div className="new-schedule-date">{formatDateWithWeekday(s.date)}</div>
              <div className="change-who">{s.title}</div>
              <div className="change-meta" style={{ marginTop: 4 }}>
                {s.startTime} ~ {s.endTime} · {s.place}
              </div>
            </button>
          ))}
        </div>

        <button type="button" className="submit-button" onClick={onClose}>
          확인했어요
        </button>
      </div>
    </div>
  );
}

// 참석 여부 변경 알림 (관리자·지휘자)
export function ChangesModal({
  changes,
  title = "참석 여부 변경 알림",
  desc = "마지막으로 확인하신 뒤 바뀐 참석 여부 변경사항이에요.",
  emptyText,
  onClose,
}: {
  changes: AttendanceChange[];
  title?: string;
  desc?: string;
  emptyText: string;
  onClose: () => void;
}) {
  return (
    <div className="modal-backdrop modal-backdrop-center" onClick={onClose}>
      <div className="modal-card modal-card-center" onClick={(e) => e.stopPropagation()}>
        <div className="change-modal-title-row">
          <BellIcon />
          <div className="modal-title" style={{ margin: 0 }}>
            {title}
          </div>
        </div>
        <p className="modal-desc">{desc}</p>

        {changes.length === 0 ? (
          <p className="empty-text" style={{ margin: "16px 0" }}>
            {emptyText}
          </p>
        ) : (
          <div className="change-list">
            {changes.map((c) => (
              <div key={c.id} className="change-item">
                <div className="change-who">
                  <span className="part">{c.part}</span>
                  {c.memberName}
                </div>
                <div className="change-status-row">
                  <span className={`status-pill ${c.oldStatus ? STATUS_CLASS[c.oldStatus] : "undecided"}`}>
                    {c.oldStatus ?? "미응답"}
                  </span>
                  <span className="change-arrow">→</span>
                  <span className={`status-pill ${STATUS_CLASS[c.newStatus]}`}>{c.newStatus}</span>
                </div>
                <div className="change-meta">
                  {c.scheduleTitle} · {c.scheduleDate}
                  {c.changedBy !== c.memberName ? ` · ${c.changedBy}님이 변경` : ""}
                </div>
              </div>
            ))}
          </div>
        )}

        <button type="button" className="submit-button" onClick={onClose}>
          확인했어요
        </button>
      </div>
    </div>
  );
}
