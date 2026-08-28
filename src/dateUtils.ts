export function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayString(): string {
  return toDateString(new Date());
}

export function isScheduleEnded(schedule: { date: string; endTime: string }): boolean {
  const today = todayString();
  if (schedule.date < today) return true;
  if (schedule.date > today) return false;
  const now = new Date();
  const nowHHMM = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  return schedule.endTime < nowHHMM;
}

// 일요일 시작 (일, 월, 화, 수, 목, 금, 토 순)
export function getMonthGrid(year: number, month1to12: number): (Date | null)[] {
  const first = new Date(year, month1to12 - 1, 1);
  const startWeekday = first.getDay(); // 0=Sun..6=Sat
  const daysInMonth = new Date(year, month1to12, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month1to12 - 1, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}
