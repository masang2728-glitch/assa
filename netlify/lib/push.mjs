// 알림 신청 정보 저장소(Netlify Blobs)와 알림 보내기 공통 코드.
import { getStore } from "@netlify/blobs";
import { setVapidDetails, sendNotification } from "web-push";

const SITE_URL = "https://meek-kitten-21e637.netlify.app";

export function subscriptionStore() {
  return getStore("push-subscriptions");
}

export function vapidReady() {
  return !!process.env.VAPID_PUBLIC_KEY && !!process.env.VAPID_PRIVATE_KEY;
}

let configured = false;
function configure() {
  if (configured) return;
  setVapidDetails(SITE_URL, process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
  configured = true;
}

// 보내기. 휴대폰에서 알림을 끄거나 앱을 지워서 더 이상 없는 신청이면 "gone"을 돌려준다.
export async function sendPush(subscription, payload) {
  configure();
  try {
    await sendNotification(subscription, JSON.stringify(payload), { TTL: 6 * 3600, urgency: "normal" });
    return "sent";
  } catch (err) {
    const code = err && err.statusCode;
    if (code === 404 || code === 410) return "gone";
    console.error("push failed", code, err && err.body);
    return "failed";
  }
}
