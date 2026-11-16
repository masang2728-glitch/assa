import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useSession } from "../session/SessionContext";
import { updateMemberPart } from "../api/members";
import { fetchChangesSince } from "../api/attendance";
import type { AttendanceChange } from "../types";
import { ADMIN_PIN, PARTS, type Part } from "../constants";
import { PageHeader, BottomNav } from "../components/Layout";
import { ChangesModal } from "../components/AlertModals";
import Avatar from "../components/Avatar";

const RECENT_DAYS = 7;

export default function MoreScreen() {
  const { name, part, isAdmin, login, logout } = useSession();
  const navigate = useNavigate();
  const canSeeChanges = isAdmin || part === "지휘자";
  const [editing, setEditing] = useState(false);
  const [newPart, setNewPart] = useState<Part>((part as Part) ?? PARTS[0]);
  const [savingPart, setSavingPart] = useState(false);
  const [recentChanges, setRecentChanges] = useState<AttendanceChange[] | null>(null);
  const [showInfo, setShowInfo] = useState(false);

  const handleSavePart = async () => {
    if (!name) return;
    if (newPart === part) {
      setEditing(false);
      return;
    }
    setSavingPart(true);
    try {
      await updateMemberPart(name, newPart);
      // 기기에 저장된 내 정보도 같이 바꾼다 (관리자 여부는 그대로 유지).
      login(name, newPart, isAdmin ? ADMIN_PIN : "");
      toast.success(`파트를 ${newPart}(으)로 바꿨어요.`);
      setEditing(false);
    } catch {
      toast.error("저장 중 오류가 발생했습니다.");
    } finally {
      setSavingPart(false);
    }
  };

  const openRecentChanges = async () => {
    try {
      const list = await fetchChangesSince(Date.now() - RECENT_DAYS * 86400000);
      setRecentChanges([...list].reverse());
    } catch {
      toast.error("변경 기록을 불러오지 못했습니다.");
    }
  };

  const handleSwitch = () => {
    if (!window.confirm("다른 이름으로 전환할까요? 입장 화면으로 돌아갑니다.")) return;
    logout();
    navigate("/", { replace: true });
  };

  return (
    <div className="screen has-nav">
      <PageHeader title="더보기" backTo="/home" />
      <div className="content">
        <div className="card profile-card">
          {part && <Avatar part={part} size={52} />}
          <div>
            <b>{name}</b>
            <span>
              {part} · {isAdmin ? "관리자" : "단원"}
            </span>
          </div>
        </div>

        <div className="card menu-list">
          <button type="button" className="menu-item" onClick={() => setEditing(true)}>
            <div>
              <b>내 정보 수정</b>
              <small>파트 바꾸기</small>
            </div>
            <span>›</span>
          </button>
          <button type="button" className="menu-item" onClick={() => navigate("/my-attendance")}>
            <div>
              <b>나의 출석</b>
              <small>일정별 내 참석 기록</small>
            </div>
            <span>›</span>
          </button>
          <button type="button" className="menu-item" onClick={handleSwitch}>
            <div>
              <b>다른 이름으로 전환</b>
            </div>
            <span>›</span>
          </button>
          {canSeeChanges && (
            <button type="button" className="menu-item" onClick={openRecentChanges}>
              <div>
                <b>참석 변경 알림</b>
                <small>관리자 · 지휘자 / 최근 {RECENT_DAYS}일</small>
              </div>
              <span>›</span>
            </button>
          )}
          <button type="button" className="menu-item" onClick={() => setShowInfo(true)}>
            <div>
              <b>앱 정보</b>
            </div>
            <span>›</span>
          </button>
        </div>
      </div>

      {editing && (
        <div className="modal-backdrop" onClick={() => !savingPart && setEditing(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">내 정보 수정</div>
            <div className="field-label" style={{ marginTop: 8 }}>
              이름
            </div>
            <div className="readonly-field">{name}</div>
            <p className="hint-text" style={{ marginTop: 6 }}>
              이름은 지난 출석 기록과 연결돼 있어서 여기서 바꾸지 않아요. 이름을 잘못 입력했다면 "다른 이름으로
              전환"으로 다시 입장해주세요.
            </p>
            <div className="field-label">파트</div>
            <div className="part-buttons light">
              {PARTS.map((p) => (
                <button
                  key={p}
                  type="button"
                  className={"part-button" + (newPart === p ? " on" : "")}
                  onClick={() => setNewPart(p)}
                >
                  {p}
                </button>
              ))}
            </div>
            <button type="button" className="submit-button" disabled={savingPart} onClick={handleSavePart}>
              {savingPart ? "저장 중..." : "저장"}
            </button>
            <button type="button" className="modal-cancel" disabled={savingPart} onClick={() => setEditing(false)}>
              취소
            </button>
          </div>
        </div>
      )}

      {recentChanges && (
        <ChangesModal
          changes={recentChanges}
          title="최근 참석 변경"
          desc={`최근 ${RECENT_DAYS}일 동안 바뀐 참석 여부예요.`}
          emptyText="최근 바뀐 참석 여부가 없어요."
          onClose={() => setRecentChanges(null)}
        />
      )}

      {showInfo && (
        <div className="modal-backdrop modal-backdrop-center" onClick={() => setShowInfo(false)}>
          <div className="modal-card modal-card-center" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">ASSA 창원근로자합창단</div>
            <p className="modal-desc">
              연습·공연 일정과 참석 여부를 함께 관리하는 앱이에요. 새 버전이 나오면 앱을 완전히 껐다 켜면 반영돼요.
            </p>
            <button type="button" className="submit-button" onClick={() => setShowInfo(false)}>
              확인
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
