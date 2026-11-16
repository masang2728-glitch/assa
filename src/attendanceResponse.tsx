import { useState } from "react";
import toast from "react-hot-toast";
import { useSession } from "./session/SessionContext";
import { setAttendance, logAttendanceChange } from "./api/attendance";
import { POPUP_IMAGES, type AttendanceStatus } from "./constants";
import { formatDateWithWeekday } from "./dateUtils";
import type { Schedule } from "./types";

// 참석 여부별 색 구분 - 참석/늦참은 같은 색으로 묶는다.
export const STATUS_CLASS: Record<AttendanceStatus | "미응답", string> = {
  참석: "attend",
  늦참: "attend",
  불참: "absent",
  온라인: "online",
  미정: "undecided",
  미응답: "pending",
};

// 참석 응답 버튼에 붙는 작은 아이콘
export const STATUS_ICON: Record<AttendanceStatus, string> = {
  참석: "✓",
  늦참: "⏰",
  불참: "✕",
  온라인: "💻",
  미정: "?",
};

// 확인 팝업 짤은 목록을 섞어서 한 장씩 꺼내 쓰고, 다 쓰면 다시 섞는다 - 그래서 한 바퀴 안에서는
// 모든 짤이 정확히 한 번씩 나온다. 앱을 껐다 켜도 이어지도록 남은 순서를 기기에 저장해 둔다.
// 참석·늦참은 같은 목록이라 순서를 같이 쓴다 (목록 내용이 키라서 짤을 바꾸면 자동으로 새로 시작한다).
const POPUP_BAG_KEY_PREFIX = "assa:popupBag:";

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function pickPopupImage(status: AttendanceStatus): string | null {
  const images = POPUP_IMAGES[status];
  if (images.length === 0) return null;
  const key = POPUP_BAG_KEY_PREFIX + images.join(",");

  let bag: string[] = [];
  let last: string | null = null;
  try {
    const saved = JSON.parse(localStorage.getItem(key) ?? "null");
    if (saved && Array.isArray(saved.bag)) bag = saved.bag.filter((img: string) => images.includes(img));
    if (saved && typeof saved.last === "string") last = saved.last;
  } catch {
    // 저장된 값이 없거나 깨졌으면 새로 섞는다.
  }

  if (bag.length === 0) {
    bag = shuffle(images);
    // 새 바퀴의 첫 장이 직전에 본 짤이면 맨 뒤로 보내서 같은 짤이 연달아 나오지 않게 한다.
    if (bag.length > 1 && bag[0] === last) bag.push(bag.shift()!);
  }

  const picked = bag.shift()!;
  try {
    localStorage.setItem(key, JSON.stringify({ bag, last: picked }));
  } catch {
    // 저장이 안 되는 환경(사생활 보호 모드 등)이면 이번 순서만 쓰고 넘어간다.
  }
  return picked;
}

// 확인 팝업 짤을 미리 받아둔다 - 버튼을 누른 뒤에 받기 시작하면 팝업만 먼저 뜨고 사진이 한참 뒤에 나온다.
let preloaded = false;
export function preloadPopupImages() {
  if (preloaded) return;
  preloaded = true;
  const urls = new Set(Object.values(POPUP_IMAGES).flat());
  for (const url of urls) new Image().src = url;
}

interface Confirmed {
  status: AttendanceStatus;
  image: string | null;
  schedule: Schedule;
}

// 내 참석 여부를 저장하고(변경 기록도 남김) 짤 팝업을 띄우는 공통 로직.
// 일정 상세 화면, 참석 응답 화면이 똑같이 이걸 쓴다.
export function useRespond() {
  const { name, part } = useSession();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<Confirmed | null>(null);

  const respond = async (schedule: Schedule, status: AttendanceStatus, oldStatus: AttendanceStatus | null) => {
    if (!name || !part) return;
    setSavingId(schedule.id);
    try {
      await setAttendance(schedule.id, name, status);
      // 관리자 알림 팝업용 기록 - 실패해도 참석 여부 저장 자체는 이미 끝났으니 조용히 넘어간다.
      logAttendanceChange({
        scheduleId: schedule.id,
        scheduleTitle: schedule.title,
        scheduleDate: schedule.date,
        memberName: name,
        part,
        oldStatus,
        newStatus: status,
        changedBy: name,
      }).catch(() => {});
      setConfirmed({ status, image: pickPopupImage(status), schedule });
    } catch {
      toast.error("저장 중 오류가 발생했습니다.");
    } finally {
      setSavingId(null);
    }
  };

  const popup = confirmed ? (
    <ConfirmPopup
      status={confirmed.status}
      image={confirmed.image}
      schedule={confirmed.schedule}
      onImageError={() => setConfirmed({ ...confirmed, image: null })}
      onClose={() => setConfirmed(null)}
    />
  ) : null;

  return { respond, savingId, popup };
}

function ConfirmPopup({
  status,
  image,
  schedule,
  onImageError,
  onClose,
}: {
  status: AttendanceStatus;
  image: string | null;
  schedule: Schedule;
  onImageError: () => void;
  onClose: () => void;
}) {
  return (
    <div className="modal-backdrop modal-backdrop-center" onClick={onClose}>
      <div className="modal-card modal-card-center confirm-modal" onClick={(e) => e.stopPropagation()}>
        {image ? (
          <img className="confirm-modal-image" src={image} alt="" onError={onImageError} />
        ) : (
          <svg
            className={`confirm-modal-icon icon-${STATUS_CLASS[status]}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="16 9 10.5 15 8 12.5"></polyline>
          </svg>
        )}
        <div className="modal-title">{status}으로 저장되었어요</div>
        <span className={`status-pill ${STATUS_CLASS[status]}`}>{status}</span>
        <p className="modal-desc" style={{ marginTop: 12 }}>
          {schedule.title} · {formatDateWithWeekday(schedule.date)}
        </p>
        <button type="button" className="submit-button" onClick={onClose}>
          확인
        </button>
      </div>
    </div>
  );
}
