import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useSession } from "../session/SessionContext";
import { subscribeToSchedules } from "../api/schedules";
import { subscribeToMyAttendance, subscribeToAttendance, fetchChangesSince } from "../api/attendance";
import { subscribeToMembers } from "../api/members";
import type { Schedule, AttendanceChange, AttendanceRecord, Member } from "../types";
import { NON_VOTING_PARTS } from "../constants";
import { isScheduleEnded, todayString } from "../dateUtils";
import { BottomNav } from "../components/Layout";
import { NewSchedulesModal, ChangesModal } from "../components/AlertModals";

// 마지막으로 변경 알림을 확인한 시각을 기기(브라우저)에 저장해둔다 - 관리자가 다른 기기로
// 들어오면 그 기기는 아직 안 읽은 걸로 다시 보여도 괜찮다고 확인받았다.
const LAST_SEEN_CHANGE_KEY = "assa:lastSeenChangeAt";

// 새 일정 알림용 - 마지막으로 확인한 일정의 등록 시각(서버 created_at, ms)을 기기에 저장해둔다.
const LAST_SEEN_SCHEDULE_KEY = "assa:lastSeenScheduleAt";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function sortByDateTime(a: Schedule, b: Schedule) {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1;
  return a.startTime < b.startTime ? -1 : a.startTime > b.startTime ? 1 : 0;
}

function dayDiff(from: string, to: string) {
  const a = new Date(from + "T00:00:00");
  const b = new Date(to + "T00:00:00");
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function koreanDate(date: string) {
  const d = new Date(date + "T00:00:00");
  return `${d.getMonth() + 1}월 ${d.getDate()}일(${WEEKDAYS[d.getDay()]})`;
}

function BellIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="#fff">
      <path d="M12 2a6 6 0 0 0-6 6c0 6-3 8-3 9h18c0-1-3-3-3-9a6 6 0 0 0-6-6zM9.5 19a2.5 2.5 0 0 0 5 0z" />
    </svg>
  );
}

export default function HomeScreen() {
  const { name, part, isAdmin } = useSession();
  const navigate = useNavigate();
  const isVotingPart = !!part && !(NON_VOTING_PARTS as readonly string[]).includes(part);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [schedulesLoaded, setSchedulesLoaded] = useState(false);
  const [myRecords, setMyRecords] = useState<AttendanceRecord[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [lastRecords, setLastRecords] = useState<AttendanceRecord[]>([]);
  const [pendingChanges, setPendingChanges] = useState<AttendanceChange[]>([]);
  const [showChanges, setShowChanges] = useState(false);
  const [newSchedules, setNewSchedules] = useState<Schedule[]>([]);
  const checkedNewSchedulesRef = useRef(false);

  useEffect(() => {
    const unsubscribe = subscribeToSchedules(
      (list) => {
        setSchedules(list);
        setSchedulesLoaded(true);
      },
      () => toast.error("일정을 불러오지 못했습니다.")
    );
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!name) return;
    return subscribeToMyAttendance(name, setMyRecords, () => toast.error("응답 현황을 불러오지 못했습니다."));
  }, [name]);

  useEffect(() => subscribeToMembers(setMembers), []);

  // 관리자와 지휘자만: 마지막으로 확인한 뒤 (본인이 만든 변경은 빼고) 남이 바꾼 참석 여부가 있으면
  // 홈 화면 진입 시 딱 한 번 모아서 팝업으로 보여준다. 종 모양에도 개수가 뜬다.
  const canSeeChanges = isAdmin || part === "지휘자";
  useEffect(() => {
    if (!canSeeChanges || !name) return;
    const lastSeenRaw = localStorage.getItem(LAST_SEEN_CHANGE_KEY);
    if (!lastSeenRaw) {
      // 이 기능이 처음 생긴 시점 - 그 이전 변경 이력을 한꺼번에 쏟아내지 않고 지금부터 추적한다.
      localStorage.setItem(LAST_SEEN_CHANGE_KEY, String(Date.now()));
      return;
    }
    fetchChangesSince(Number(lastSeenRaw))
      .then((changes) => {
        const others = changes.filter((c) => c.changedBy !== name);
        if (others.length > 0) {
          setPendingChanges(others);
          setShowChanges(true);
        }
      })
      .catch(() => {
        // 알림은 부가 기능이라 실패해도 홈 화면 사용에는 지장 없게 조용히 넘어간다.
      });
  }, [canSeeChanges, name]);

  const acknowledgeChanges = () => {
    localStorage.setItem(LAST_SEEN_CHANGE_KEY, String(Date.now()));
    setPendingChanges([]);
    setShowChanges(false);
  };

  // 모든 단원: 마지막으로 확인한 뒤 새로 등록된(아직 안 끝난) 일정이 있으면 앱에 들어왔을 때
  // 한 번 모아서 팝업으로 보여준다. 기준 시각은 서버가 찍은 created_at.
  useEffect(() => {
    if (!schedulesLoaded || checkedNewSchedulesRef.current) return;
    checkedNewSchedulesRef.current = true;
    const lastSeenRaw = localStorage.getItem(LAST_SEEN_SCHEDULE_KEY);
    if (!lastSeenRaw) {
      const latest = schedules.reduce((max, s) => Math.max(max, s.createdAt), 0);
      localStorage.setItem(LAST_SEEN_SCHEDULE_KEY, String(latest));
      return;
    }
    const lastSeen = Number(lastSeenRaw);
    const fresh = schedules.filter((s) => s.createdAt > lastSeen && !isScheduleEnded(s)).sort(sortByDateTime);
    if (fresh.length > 0) setNewSchedules(fresh);
  }, [schedulesLoaded, schedules]);

  const acknowledgeNewSchedules = () => {
    const latest = newSchedules.reduce((max, s) => Math.max(max, s.createdAt), 0);
    localStorage.setItem(LAST_SEEN_SCHEDULE_KEY, String(latest));
    setNewSchedules([]);
  };

  const today = todayString();
  const upcoming = useMemo(() => schedules.filter((s) => !isScheduleEnded(s)).sort(sortByDateTime), [schedules]);
  const next = upcoming[0] ?? null;
  const votedIds = useMemo(() => new Set(myRecords.map((r) => r.scheduleId)), [myRecords]);
  const toRespond = isVotingPart ? upcoming.filter((s) => !votedIds.has(s.id)).length : 0;

  // 지난 연습 참석: 가장 최근에 끝난 일정 기준
  const lastEnded = useMemo(
    () => [...schedules].filter((s) => isScheduleEnded(s)).sort(sortByDateTime).pop() ?? null,
    [schedules]
  );
  const lastEndedId = lastEnded?.id ?? null;
  useEffect(() => {
    if (!lastEndedId) return;
    return subscribeToAttendance(lastEndedId, setLastRecords);
  }, [lastEndedId]);
  const lastAttend = lastEnded
    ? lastRecords.filter((r) => r.status === "참석" || r.status === "늦참").length
    : 0;
  const lastRate = lastEnded && members.length > 0 ? Math.round((lastAttend / members.length) * 100) : null;

  // 나의 출석: 이번 달에 이미 끝난 일정 중 참석·늦참으로 응답한 횟수
  const month = today.slice(0, 7);
  const monthEnded = schedules.filter((s) => s.date.startsWith(month) && isScheduleEnded(s));
  const myStatus = useMemo(() => new Map(myRecords.map((r) => [r.scheduleId, r.status])), [myRecords]);
  const monthAttended = monthEnded.filter((s) => {
    const st = myStatus.get(s.id);
    return st === "참석" || st === "늦참";
  }).length;
  const monthPct = monthEnded.length > 0 ? Math.round((monthAttended / monthEnded.length) * 100) : 0;

  const dday = next ? dayDiff(today, next.date) : null;

  return (
    <div className="screen has-nav home-screen">
      <div className="home-top">
        <div className="home-head">
          <div>
            <small>안녕하세요!</small>
            <b>{name} 님 🎵</b>
            <div className="home-part">
              {part}
              {isAdmin ? " · 관리자" : ""}
            </div>
          </div>
          {canSeeChanges && (
            <button type="button" className="home-bell" onClick={() => setShowChanges(true)} aria-label="참석 변경 알림">
              <BellIcon />
              {pendingChanges.length > 0 && <i>{pendingChanges.length}</i>}
            </button>
          )}
        </div>
        <div className="home-banner">
          <b>오늘도 즐겁게 노래해요!</b>
          <span>
            {next ? (
              <>
                다음 일정{" "}
                <em>
                  {koreanDate(next.date)} {next.startTime}
                </em>
              </>
            ) : (
              "예정된 일정이 없어요"
            )}
          </span>
          <i aria-hidden="true" />
        </div>
      </div>

      <div className="home-sheet">
        <h2 className="home-h2">주요 메뉴</h2>
        <div className="home-tiles">
          <button type="button" className="home-tile" onClick={() => navigate("/calendar")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
              <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
              <path d="M3.5 10h17M8 3v4M16 3v4M8 14h2M14 14h2M8 17.5h2" />
            </svg>
            <b>일정 달력</b>
            <small>(연습 · 공연)</small>
          </button>
          <button type="button" className="home-tile" onClick={() => navigate("/respond")}>
            {toRespond > 0 && <em>{toRespond}</em>}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="m8 12.5 2.8 2.8L16.5 9.5" />
            </svg>
            <b>참석 응답</b>
            <small>(응답할 일정)</small>
          </button>
          <button type="button" className="home-tile" onClick={() => navigate("/attendance")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
              <path d="M4 20h16M7 17V10M12 17V5M17 17v-5" />
            </svg>
            <b>출석 현황</b>
            <small>(파트별 참석)</small>
          </button>
          <button type="button" className="home-tile" onClick={() => navigate("/members")}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="7.5" r="3.3" />
              <circle cx="5.5" cy="9" r="2.4" />
              <circle cx="18.5" cy="9" r="2.4" />
              <path d="M6.5 19c0-3.4 2.5-6 5.5-6s5.5 2.6 5.5 6zM1.5 18c0-2.6 1.7-4.5 4-4.5 1 0 1.8.3 2.5.8-1.2 1.1-2 2.6-2.2 3.7zM22.5 18c0-2.6-1.7-4.5-4-4.5-1 0-1.8.3-2.5.8 1.2 1.1 2 2.6 2.2 3.7z" />
            </svg>
            <b>멤버 현황</b>
            <small>(단원 명단)</small>
          </button>
        </div>

        <h2 className="home-h2" style={{ marginTop: 20 }}>
          이번 주 현황
        </h2>
        <div className="home-cards">
          <button type="button" className="home-card" onClick={() => next && navigate(`/schedule/${next.id}`)}>
            <span>다음 일정까지</span>
            <strong>{dday === null ? "-" : dday === 0 ? "D-Day" : `D-${dday}`}</strong>
            <i className="pill navy">{next ? next.title : "일정 없음"}</i>
          </button>
          <button type="button" className="home-card" onClick={() => navigate("/respond")}>
            <span>응답할 일정</span>
            <strong>
              {toRespond}
              <small> 개</small>
            </strong>
            <i className={"pill " + (toRespond > 0 ? "amber" : "green")}>{toRespond > 0 ? "응답 필요" : "모두 응답"}</i>
          </button>
          <button
            type="button"
            className="home-card"
            onClick={() => lastEnded && navigate(`/attendance?id=${lastEnded.id}`)}
          >
            <span>지난 연습 참석</span>
            <strong>
              {lastEnded ? lastAttend : "-"}
              <small> 명</small>
            </strong>
            <i className="pill green">{lastRate !== null ? `참석률 ${lastRate}%` : "기록 없음"}</i>
          </button>
        </div>

        <button type="button" className="home-box" onClick={() => navigate("/my-attendance")}>
          <div className="home-box-head">
            <h3>나의 출석</h3>
            <span className="home-box-more">전체 보기 ›</span>
          </div>
          <div className="home-box-row">
            <span>이번 달 참석</span>
            <span>
              <b>{monthAttended}회</b> / {monthEnded.length}회
            </span>
          </div>
          <div className="home-bar">
            <i style={{ width: `${monthPct}%` }} />
          </div>
        </button>
      </div>

      {newSchedules.length > 0 && (
        <NewSchedulesModal
          schedules={newSchedules}
          onClose={acknowledgeNewSchedules}
          onPick={(s) => {
            acknowledgeNewSchedules();
            navigate(`/schedule/${s.id}`);
          }}
        />
      )}

      {showChanges && newSchedules.length === 0 && (
        <ChangesModal
          changes={pendingChanges}
          emptyText="마지막으로 확인하신 뒤 바뀐 참석 여부가 없어요."
          onClose={pendingChanges.length > 0 ? acknowledgeChanges : () => setShowChanges(false)}
        />
      )}

      <BottomNav />
    </div>
  );
}
