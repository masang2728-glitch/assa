import type { CSSProperties } from "react";
import { getMonthGrid, toDateString } from "../dateUtils";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const SATURDAY_COLOR = "#2563EB";
const SUNDAY_COLOR = "#DC2626";

// 그 날짜의 일정에 내가 전부 응답했으면 "voted", 하나라도 응답하지 않았으면 "unvoted".
export type DateVoteStatus = "voted" | "unvoted";

const VOTED_DOT_COLOR = "var(--good)";
const UNVOTED_DOT_COLOR = "var(--warn)";

interface MonthCalendarProps {
  month: string; // "YYYY-MM"
  onMonthChange: (month: string) => void;
  scheduleDates: Set<string>;
  // 날짜별 응답 상태. 없는 날짜(일정 없음)는 그냥 themeColor 점으로 표시된다.
  voteStatusByDate?: Record<string, DateVoteStatus>;
  selectedDate?: string | null;
  onDayClick: (dateString: string) => void;
  themeColor: string;
}

export default function MonthCalendar({
  month,
  onMonthChange,
  scheduleDates,
  voteStatusByDate,
  selectedDate,
  onDayClick,
  themeColor,
}: MonthCalendarProps) {
  const [yearStr, monthStr] = month.split("-");
  const year = Number(yearStr);
  const monthNum = Number(monthStr);
  const cells = getMonthGrid(year, monthNum);
  const today = toDateString(new Date());

  const shiftMonth = (delta: number) => {
    const d = new Date(year, monthNum - 1 + delta, 1);
    onMonthChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  return (
    <div className="calendar">
      <div className="calendar-header">
        <button type="button" className="calendar-nav" onClick={() => shiftMonth(-1)} aria-label="이전 달">
          ‹
        </button>
        <div className="calendar-title">
          {year}년 {monthNum}월
        </div>
        <button type="button" className="calendar-nav" onClick={() => shiftMonth(1)} aria-label="다음 달">
          ›
        </button>
      </div>
      <div className="calendar-weekdays">
        {WEEKDAYS.map((w, i) => (
          <div
            key={w}
            className="calendar-weekday"
            style={i === 0 ? { color: SUNDAY_COLOR } : i === 6 ? { color: SATURDAY_COLOR } : undefined}
          >
            {w}
          </div>
        ))}
      </div>
      <div className="calendar-grid">
        {cells.map((date, i) => {
          if (!date) return <div key={i} className="calendar-cell" />;
          const dateString = toDateString(date);
          const hasSchedule = scheduleDates.has(dateString);
          const isSelected = selectedDate === dateString;
          const isToday = dateString === today;
          const dow = date.getDay();

          let dayStyle: CSSProperties | undefined;
          if (isSelected) dayStyle = { backgroundColor: themeColor, color: "#fff", borderColor: themeColor };
          else if (isToday) dayStyle = { color: themeColor, borderColor: themeColor };
          else if (dow === 0) dayStyle = { color: SUNDAY_COLOR };
          else if (dow === 6) dayStyle = { color: SATURDAY_COLOR };

          return (
            <div key={i} className="calendar-cell">
              <button
                type="button"
                onClick={() => onDayClick(dateString)}
                className={"calendar-day" + (isToday && !isSelected ? " calendar-day-today" : "")}
                style={dayStyle}
              >
                {date.getDate()}
              </button>
              {hasSchedule && (
                <span
                  className="calendar-dot"
                  style={{
                    backgroundColor:
                      voteStatusByDate?.[dateString] === "voted"
                        ? VOTED_DOT_COLOR
                        : voteStatusByDate?.[dateString] === "unvoted"
                          ? UNVOTED_DOT_COLOR
                          : themeColor,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
