// 앱에서 "일정 알림 받기"를 켜고 끌 때 부르는 함수.
// POST   { name, subscription, welcome? } → 저장 (welcome이면 확인 알림 1번 보냄)
// DELETE { subscription }                → 삭제
import crypto from "node:crypto";
import { subscriptionStore, sendPush, vapidReady } from "../lib/push.mjs";

const json = (data, status = 200) => Response.json(data, { status });

export default async (req) => {
  if (req.method === "GET") return json({ ready: vapidReady() });
  if (req.method !== "POST" && req.method !== "DELETE") return json({ error: "method" }, 405);

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad json" }, 400);
  }
  const sub = body && body.subscription;
  const endpoint = sub && sub.endpoint;
  if (typeof endpoint !== "string" || !endpoint.startsWith("https://") || endpoint.length > 1000) {
    return json({ error: "bad subscription" }, 400);
  }
  const key = crypto.createHash("sha256").update(endpoint).digest("hex");
  const store = subscriptionStore();

  if (req.method === "DELETE") {
    await store.delete(key);
    return json({ ok: true });
  }

  const name = typeof body.name === "string" ? body.name.trim().slice(0, 40) : "";
  const p256dh = sub.keys && sub.keys.p256dh;
  const auth = sub.keys && sub.keys.auth;
  if (!name || typeof p256dh !== "string" || typeof auth !== "string") return json({ error: "bad input" }, 400);

  const subscription = { endpoint, keys: { p256dh, auth } };
  await store.setJSON(key, { name, subscription, updatedAt: Date.now() });

  if (body.welcome && vapidReady()) {
    await sendPush(subscription, {
      title: "🔔 일정 알림이 켜졌어요",
      body: "연습·공연 2일 전 저녁 7시에 알려드릴게요.",
      url: "/#/home",
      tag: "assa-welcome",
    });
  }
  return json({ ok: true });
};
