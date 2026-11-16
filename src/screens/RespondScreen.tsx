import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useSession } from "../session/SessionContext";
import { subscribeToSchedules } from "../api/schedules";
import { subscribeToMyAttendance } from "../api/attendance";
import type { Schedule, AttendanceRecord } from "../types";
import { ATTENDANCE_STATUSES, NON_VOTING_PARTS } from "../constants";
import { isScheduleEnded } from "../dateUtils";
import { PageHeader, BottomNav } from "../components/Layout";
import DateBox from "../components/DateBox";
import { useRespond, preloadPopupImages, STATUS_CLASS, STATUS_ICON } from "../attendanceResponse";

function sortByDateTime(a: Schedule, b: Schedule) {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1;
  return a.startTime < b.startTime ? -1 : a.startTime > b.startTime ? 1 : 0;
}

export default function RespondScreen() {
  const { name, part } = useSession();
  const navigate = useNavigate();
  const isVotingPart = !!part && !(NON_VOTING_PARTS as readonly string[]).includes(part);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [myRecords, setMyRecords] = useState<AttendanceRecord[]>([]);
  const [tab, setTab] = useState<"todo" | "done">("todo");
  const [editingId, setEditingId] = useState<string | null>(null);
  const { respond, savingId, popup } = useRespond();

  useEffect(() => subscribeToSchedules(setSchedules, () => toast.error("일정을 불러오지 못했습니다.")), []);
  useEffect(() => {
    if (!name) return;
    return subscribeToMyAttendance(name, setMyRecords, () => toast.error("응답 현황을 불러오지 못했습니다."));
  }, [name]);
  useEffect(() => {
    if (isVotingPart) preloadPopupImages();
  }, [isVotingPart]);

  const myStatus = useMemo(() => new Map(myRecords.map((r) => [r.scheduleId, r.status])), [myRecords]);
  const upcoming = useMemo(() => schedules.filter((s) => !isScheduleEnded(s)).sort(sortByDateTime), [schedules]);
  const todo = upcoming.filter((s) => !myStatus.has(s.id));
  const done = upcoming.filter((s) => myStatus.has(s.id));

  const renderButtons = (s: Schedule) => {
    const current = myStatus.get(s.id) ?? null;
    return (
      <div className="quick-status-row">
        {ATTENDANCE_STATUSES.map((status) => (
          <button
            key={status}
            type="button"
            className={"quick-status" + (current === status ? " selected" : "")}
            disabled={savingId === s.id}
            onClick={async () => {
              await respond(s, status, current);
              setEditingId(null);
            }}
          >
            <span className="quick-status-icon">{STATUS_ICON[status]}</span>
            {status}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="screen has-nav">
      <PageHeader title="참석 응답" backTo="/home">
        <div className="tabs">
          <button type="button" className={"tab" + (tab === "todo" ? " on" : "")} onClick={() => setTab("todo")}>
            응답 필요 {todo.length}
          </button>
          <button type="button" className={"tab" + (tab === "done" ? " on" : "")} onClick={() => setTab("done")}>
            응답 완료 {done.length}
          </button>
        </div>
      </PageHeader>

      <div className="content">
        {!isVotingPart ? (
          <p className="empty-text">{part}는 참석 응답을 하지 않아도 돼요.</p>
        ) : tab === "todo" ? (
          todo.length === 0 ? (
            <div className="empty-box">🎉 응답할 일정이 없어요. 모두 응답했어요!</div>
          ) : (
            todo.map((s) => (
              <div key={s.id} className="card respond-card">
                <button type="button" className="respond-card-head" onClick={() => navigate(`/schedule/${s.id}`)}>
                  <DateBox date={s.date} />
                  <div className="sched-card-main">
                    <span className="sched-card-title">{s.title}</span>
                    <span className="sched-card-meta">
                      {s.startTime} ~ {s.endTime} · {s.place}
                    </span>
                  </div>
                </button>
                {renderButtons(s)}
              </div>
            ))
          )
        ) : done.length === 0 ? (
          <p className="empty-text">아직 응답한 일정이 없어요.</p>
        ) : (
          <>
            <p className="hint-text">"변경"을 누르면 응답을 바꿀 수 있어요.</p>
            {done.map((s) => {
              const status = myStatus.get(s.id)!;
              return (
                <div key={s.id} className="card respond-card">
                  <div className="respond-card-head">
                    <button type="button" className="respond-card-link" onClick={() => navigate(`/schedule/${s.id}`)}>
                      <DateBox date={s.date} />
                      <div className="sched-card-main">
                        <span className="sched-card-title">{s.title}</span>
                        <span className="sched-card-meta">
                          {s.startTime} ~ {s.endTime} · {s.place}
                        </span>
                      </div>
                    </button>
                    <span className={`status-pill ${STATUS_CLASS[status]}`}>{status}</span>
                    <button
                      type="button"
                      className="change-link"
                      onClick={() => setEditingId(editingId === s.id ? null : s.id)}
                    >
                      {editingId === s.id ? "닫기" : "변경"}
                    </button>
                  </div>
                  {editingId === s.id && renderButtons(s)}
                </div>
              );
            })}
          </>
        )}
      </div>

      {popup}
      <BottomNav />
    </div>
  );
}
