import { useCallback, useEffect, useState } from "react";

// 일정 알림(휴대폰 푸시) 켜기/끄기. 신청 정보는 Netlify 함수(netlify/functions/push-subscribe)에 저장된다.
// 공개 키라서 코드에 있어도 괜찮다 (비밀 키는 Netlify 환경 변수에만 있음).
const VAPID_PUBLIC_KEY = "BO3Id-gWxempntWiIZ6lDHhzP-GYYnS51eh8oLP-gJ7kfT2XwsSHjOvY5PpZ5B_Raz5zw7dntSi68Ay6CWlZ9-Y";
const API = "/.netlify/functions/push-subscribe";
const SYNCED_KEY = "assa:pushSyncedName";

export type PushStatus = "loading" | "on" | "off" | "denied" | "need-install" | "unsupported";

const isIOS = () =>
  /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as unknown as { standalone?: boolean }).standalone === true;

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function getRegistration() {
  if (!("serviceWorker" in navigator)) return null;
  return (await navigator.serviceWorker.getRegistration()) ?? null;
}

async function post(method: "POST" | "DELETE", body: unknown) {
  const res = await fetch(API, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`push api ${res.status}`);
}

async function readStatus(): Promise<PushStatus> {
  const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  if (!supported) return isIOS() && !isStandalone() ? "need-install" : "unsupported";
  if (Notification.permission === "denied") return "denied";
  const reg = await getRegistration();
  if (!reg) return "unsupported";
  const sub = await reg.pushManager.getSubscription();
  return sub && Notification.permission === "granted" ? "on" : "off";
}

export function usePush(name: string | null) {
  const [status, setStatus] = useState<PushStatus>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    readStatus()
      .then(async (s) => {
        if (cancelled) return;
        setStatus(s);
        // 이미 켜져 있으면 이름이 바뀌었을 수 있으니(다른 이름으로 전환 등) 서버에 현재 이름으로 다시 알려둔다.
        if (s === "on" && name && sessionStorage.getItem(SYNCED_KEY) !== name) {
          const sub = await (await getRegistration())?.pushManager.getSubscription();
          if (sub) {
            await post("POST", { name, subscription: sub.toJSON() });
            sessionStorage.setItem(SYNCED_KEY, name);
          }
        }
      })
      .catch(() => !cancelled && setStatus("unsupported"));
    return () => {
      cancelled = true;
    };
  }, [name]);

  const enable = useCallback(async () => {
    if (!name) return false;
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "off");
        return false;
      }
      const reg = (await getRegistration()) ?? (await navigator.serviceWorker.ready);
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        }));
      await post("POST", { name, subscription: sub.toJSON(), welcome: true });
      sessionStorage.setItem(SYNCED_KEY, name);
      setStatus("on");
      return true;
    } finally {
      setBusy(false);
    }
  }, [name]);

  const disable = useCallback(async () => {
    setBusy(true);
    try {
      const sub = await (await getRegistration())?.pushManager.getSubscription();
      if (sub) {
        await post("DELETE", { subscription: sub.toJSON() }).catch(() => {});
        await sub.unsubscribe();
      }
      setStatus("off");
    } finally {
      setBusy(false);
    }
  }, []);

  return { status, busy, enable, disable };
}
