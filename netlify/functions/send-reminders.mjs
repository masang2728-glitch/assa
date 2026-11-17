// 매일 저녁 7시(한국 시간)에 자동 실행: 모레 일정이 있으면 알림을 켠 단원에게 보낸다.
// Supabase 데이터는 읽기만 한다.
import { subscriptionStore, sendPush, vapidReady } from "../lib/push.mjs";
import { buildMessages, kstDateString } from "../lib/reminders.mjs";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

async function rest(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!res.ok) throw new Error(`supabase ${res.status} ${path}`);
  return res.json();
}

export default async () => {
  if (!vapidReady() || !SUPABASE_URL || !SUPABASE_KEY) {
    console.error("missing env");
    return;
  }
  const targetDate = kstDateString(2);
  const schedules = await rest(`schedules?select=id,date,title,start_time,place&date=eq.${targetDate}`);
  if (schedules.length === 0) {
    console.log(`no schedules on ${targetDate}`);
    return;
  }
  const ids = schedules.map((s) => s.id).join(",");
  const [attendance, members] = await Promise.all([
    rest(`attendance?select=schedule_id,member_name,status&schedule_id=in.(${ids})`),
    rest(`members?select=name,part&active=eq.true`),
  ]);

  const store = subscriptionStore();
  const { blobs } = await store.list();
  const subscriptions = (
    await Promise.all(
      blobs.map(async (b) => {
        const v = await store.get(b.key, { type: "json" });
        return v ? { key: b.key, name: v.name, subscription: v.subscription } : null;
      })
    )
  ).filter(Boolean);

  const messages = buildMessages({ schedules, members, attendance, subscriptions });
  const counts = { sent: 0, gone: 0, failed: 0 };
  for (const m of messages) {
    const result = await sendPush(m.subscription, m.payload);
    counts[result]++;
    if (result === "gone") await store.delete(m.key);
  }
  console.log(`reminders for ${targetDate}: ${schedules.length} schedules, ${subscriptions.length} subscribers`, counts);
};

// 10:00 UTC = 한국 시간 19:00
export const config = { schedule: "0 10 * * *" };
