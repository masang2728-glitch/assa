import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { subscribeToSchedules } from "../api/schedules";
import type { Schedule } from "../types";
import { formatDateWithWeekday, isScheduleEnded } from "../dateUtils";
import { PageHeader, BottomNav } from "../components/Layout";
import ScheduleDetailScreen from "./ScheduleDetailScreen";

function sortByDateTime(a: Schedule, b: Schedule) {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1;
  return a.startTime < b.startTime ? -1 : a.startTime > b.startTime ? 1 : 0;
}

// 출석 현황: 위에서 일정을 고르고, 아래는 기존 앱의 출석 현황 구성 그대로 보여준다.
export default function AttendanceScreen() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(
    () =>
      subscribeToSchedules(
        (list) => {
          setSchedules(list);
          setLoaded(true);
        },
        () => toast.error("일정을 불러오지 못했습니다.")
      ),
    []
  );

  const upcoming = useMemo(() => schedules.filter((s) => !isScheduleEnded(s)).sort(sortByDateTime), [schedules]);
  const past = useMemo(
    () => schedules.filter((s) => isScheduleEnded(s)).sort(sortByDateTime).reverse(),
    [schedules]
  );

  // 처음에는 다가오는 가장 가까운 일정, 없으면 가장 최근에 끝난 일정
  const requested = searchParams.get("id");
  const selectedId =
    (requested && schedules.some((s) => s.id === requested) ? requested : null) ??
    upcoming[0]?.id ??
    past[0]?.id ??
    null;

  const label = (s: Schedule) => `${formatDateWithWeekday(s.date)} · ${s.title}`;

  return (
    <div className="screen has-nav">
      <PageHeader title="출석 현황" backTo="/home" />
      <div className="content">
        {!loaded ? (
          <p className="empty-text">불러오는 중...</p>
        ) : !selectedId ? (
          <p className="empty-text">등록된 일정이 없습니다.</p>
        ) : (
          <>
            <label className="schedule-picker">
              <span className="schedule-picker-label">일정 선택 · 눌러서 다른 일정 보기</span>
              <select
                value={selectedId}
                onChange={(e) => setSearchParams({ id: e.target.value }, { replace: true })}
              >
                {upcoming.length > 0 && (
                  <optgroup label="다가오는 일정">
                    {upcoming.map((s) => (
                      <option key={s.id} value={s.id}>
                        {label(s)}
                      </option>
                    ))}
                  </optgroup>
                )}
                {past.length > 0 && (
                  <optgroup label="지난 일정">
                    {past.map((s) => (
                      <option key={s.id} value={s.id}>
                        {label(s)}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </label>
            <ScheduleDetailScreen key={selectedId} scheduleId={selectedId} embedded />
          </>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
