const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

// 일정 줄 왼쪽의 날짜 상자 (월 / 일 / 요일)
export default function DateBox({ date }: { date: string }) {
  const d = new Date(date + "T00:00:00");
  const dow = d.getDay();
  return (
    <div className={"date-box" + (dow === 0 ? " sun" : dow === 6 ? " sat" : "")}>
      <span className="date-box-m">{d.getMonth() + 1}월</span>
      <b>{d.getDate()}</b>
      <span className="date-box-w">{WEEKDAYS[dow]}</span>
    </div>
  );
}
