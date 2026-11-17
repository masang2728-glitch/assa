// 일정 2일 전 알림 문구 만들기 (Netlify 함수에서 사용). 데이터는 읽기만 한다.

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

// 한국 시간 기준 날짜 문자열 (YYYY-MM-DD). offsetDays=2 이면 모레.
export function kstDateString(offsetDays = 0, now = Date.now()) {
  const d = new Date(now + 9 * 3600 * 1000 + offsetDays * 86400 * 1000);
  return d.toISOString().slice(0, 10);
}

export function koreanDate(date) {
  const d = new Date(date + "T00:00:00Z");
  return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일(${WEEKDAYS[d.getUTCDay()]})`;
}

// "정기연습" → "정기연습이", "합창제" → "합창제가"
function withSubjectParticle(word) {
  const last = word.trim().slice(-1);
  const code = last.charCodeAt(0);
  if (code >= 0xac00 && code <= 0xd7a3) {
    return word + ((code - 0xac00) % 28 === 0 ? "가" : "이");
  }
  return word + "(이)가";
}

// subscriptions: [{ key, name, subscription }]
// 반환: [{ key, subscription, payload }]
export function buildMessages({ schedules, members, attendance, subscriptions }) {
  const partByName = new Map(members.map((m) => [m.name, m.part]));
  const statusOf = new Map(attendance.map((a) => [`${a.schedule_id}|${a.member_name}`, a.status]));
  const sorted = [...schedules].sort((a, b) => (a.start_time < b.start_time ? -1 : 1));
  const messages = [];

  for (const sub of subscriptions) {
    const part = partByName.get(sub.name);
    if (!part) continue; // 삭제된(비활성) 단원에게는 보내지 않는다
    const needsVote = part !== "반주자";
    for (const s of sorted) {
      const status = statusOf.get(`${s.id}|${sub.name}`);
      const line = !needsVote
        ? "눌러서 일정을 확인해 주세요."
        : status
          ? `내 응답: ${status} ✓ (바꾸려면 눌러주세요)`
          : "아직 참석 응답 전이에요. 눌러서 응답해 주세요!";
      messages.push({
        key: sub.key,
        subscription: sub.subscription,
        payload: {
          title: `📅 모레 ${withSubjectParticle(s.title)} 있어요`,
          body: `${koreanDate(s.date)} ${s.start_time} · ${s.place}\n${line}`,
          url: `/#/schedule/${s.id}`,
          tag: `assa-${s.id}`,
        },
      });
    }
  }
  return messages;
}
