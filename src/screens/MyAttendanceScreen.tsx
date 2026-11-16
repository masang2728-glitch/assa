import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useSession } from "../session/SessionContext";
import { subscribeToSchedules } from "../api/schedules";
import { subscribeToMyAttendance } from "../api/attendance";
import type { Schedule, AttendanceRecord } from "../types";
import { isScheduleEnded, todayString } from "../dateUtils";
import { PageHeader, BottomNav } from "../components/Layout";
import DateBox from "../components/DateBox";
import { STATUS_CLASS } from "../attendanceResponse";

function sortByDateTime(a: Schedule, b: Schedule) {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1;
  return a.startTime < b.startTime ? -1 : a.startTime > b.startTime ? 1 : 0;
}

const isAttend = (st: string | undefined) => st === "참석" || st === "늦참";

// 나의 출석: 일정별로 내가 어떻게 응답했는지(참석 여부) 목록으로 보여준다. 읽기만 한다.
export default function MyAttendanceScreen() {
  const { name } = useSession();
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [myRecords, setMyRecords] = useState<AttendanceRecord[]>([]);
  const [filter, setFilter] = useState<"all" | "past" | "upcoming">("all");

  useEffect(() => subscribeToSchedules(setSchedules, () => toast.error("일정을 불러오지 못했습니다.")), []);
  useEffect(() => {
    if (!name) return;
    return subscribeToMyAttendance(name, setMyRecords, () => toast.error("출석 기록을 불러오지 못했습니다."));
  }, [name]);

  const myStatus = useMemo(() => new Map(myRecords.map((r) => [r.scheduleId, r.status])), [myRecords]);

  const month = todayString().slice(0, 7);
  const ended = schedules.filter((s) => isScheduleEnded(s));
  const monthEnded = ended.filter((s) => s.date.startsWith(month));
  const monthAttend = monthEnded.filter((s) => isAttend(myStatus.get(s.id))).length;
  const totalAttend = ended.filter((s) => isAttend(myStatus.get(s.id))).length;
  const totalRate = ended.length > 0 ? Math.round((totalAttend / ended.length) * 100) : null;

  // 최신 일정이 위로 오도록, 월별로 묶는다.
  const groups = useMemo(() => {
    const list = schedules
      .filter((s) => (filter === "all" ? true : filter === "past" ? isScheduleEnded(s) : !isScheduleEnded(s)))
      .sort(sortByDateTime)
      .reverse();
    const map = new Map<string, Schedule[]>();
    for (const s of list) {
      const key = s.date.slice(0, 7);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return [...map.entries()];
  }, [schedules, filter]);

  return (
    <div className="screen has-nav">
      <PageHeader title="나의 출석" sub={`${name} 님의 일정별 참석 기록`} backTo="/home" />
      <div className="content">
        <div className="my-summary">
          <div className="my-summary-item">
            <span>이번 달 참석</span>
            <strong>
              {monthAttend}
              <small> / {monthEnded.length}회</small>
            </strong>
          </div>
          <div className="my-summary-item">
            <span>전체 참석</span>
            <strong>
              {totalAttend}
              <small> / {ended.length}회</small>
            </strong>
          </div>
          <div className="my-summary-item">
            <span>전체 참석률</span>
            <strong>{totalRate === null ? "-" : `${totalRate}%`}</strong>
          </div>
        </div>
        <p className="hint-text">참석 횟수는 이미 끝난 일정 중 참석·늦참으로 응답한 일정이에요.</p>

        <div className="seg">
          {(
            [
              ["all", "전체"],
              ["past", "지난 일정"],
              ["upcoming", "다가오는 일정"],
            ] as const
          ).map(([key, text]) => (
            <button key={key} type="button" className={filter === key ? "on" : ""} onClick={() => setFilter(key)}>
              {text}
            </button>
          ))}
        </div>

        {groups.length === 0 ? (
          <p className="empty-text">일정이 없습니다.</p>
        ) : (
          groups.map(([ym, list]) => {
            const [y, m] = ym.split("-");
            return (
              <div key={ym}>
                <div className="section-title">
                  {y}년 {Number(m)}월
                </div>
                {list.map((s) => {
                  const status = myStatus.get(s.id);
                  const ended = isScheduleEnded(s);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      className={"sched-card" + (ended ? " ended" : "")}
                      onClick={() => navigate(`/schedule/${s.id}`)}
                    >
                      <DateBox date={s.date} />
                      <div className="sched-card-main">
                        <span className="sched-card-title">{s.title}</span>
                        <span className="sched-card-meta">
                          {s.startTime} ~ {s.endTime} · {s.place}
                        </span>
                      </div>
                      <div className="my-status-col">
                        <span className={`status-pill ${status ? STATUS_CLASS[status] : "pending"}`}>
                          {status ?? "미응답"}
                        </span>
                        <span className="my-status-when">{ended ? "지난 일정" : "예정"}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })
        )}
      </div>
      <BottomNav />
    </div>
  );
}
