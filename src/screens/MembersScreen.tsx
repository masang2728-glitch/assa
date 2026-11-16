import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useSession } from "../session/SessionContext";
import { subscribeToMembers, deactivateMember } from "../api/members";
import type { Member } from "../types";
import { NON_VOICE_PARTS, VOICE_PARTS } from "../constants";
import { PageHeader, BottomNav } from "../components/Layout";
import Avatar, { PART_STYLE } from "../components/Avatar";

type Tab = "전체" | (typeof VOICE_PARTS)[number];

export default function MembersScreen() {
  const { isAdmin } = useSession();
  const [members, setMembers] = useState<Member[]>([]);
  const [tab, setTab] = useState<Tab>("전체");
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToMembers(setMembers, () => toast.error("단원 명단을 불러오지 못했습니다."));
    return unsubscribe;
  }, []);

  const voiceGroups = useMemo(
    () => VOICE_PARTS.map((part) => ({ part, members: members.filter((m) => m.part === part) })),
    [members]
  );

  const nonVotingMembers = useMemo(
    () => members.filter((m) => (NON_VOICE_PARTS as readonly string[]).includes(m.part)),
    [members]
  );

  const visibleGroups = tab === "전체" ? voiceGroups : voiceGroups.filter((g) => g.part === tab);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deactivateMember(deleteTarget.name);
      toast.success(`${deleteTarget.name}님을 삭제했습니다.`);
      setDeleteTarget(null);
    } catch {
      toast.error("삭제 중 오류가 발생했습니다.");
    } finally {
      setDeleting(false);
    }
  };

  const renderCard = (m: Member) => {
    const inner = (
      <>
        <Avatar part={m.part} size={52} />
        <b>{m.name}</b>
        <small style={{ color: PART_STYLE[m.part]?.main }}>{m.part}</small>
      </>
    );
    return isAdmin ? (
      <button key={m.id} type="button" className="member-card" onClick={() => setDeleteTarget(m)}>
        {inner}
      </button>
    ) : (
      <div key={m.id} className="member-card">
        {inner}
      </div>
    );
  };

  return (
    <div className="screen has-nav">
      <PageHeader title="멤버 현황" backTo="/home" />

      <div className="content">
        <div className="member-total">
          <span>전체 단원</span>
          <b>{members.length}명</b>
        </div>

        <div className="part-tabs">
          {(["전체", ...VOICE_PARTS] as Tab[]).map((t) => {
            const count = t === "전체" ? members.length : members.filter((m) => m.part === t).length;
            return (
              <button key={t} type="button" className={"part-tab" + (tab === t ? " on" : "")} onClick={() => setTab(t)}>
                {t !== "전체" && <i style={{ background: PART_STYLE[t].main }} />}
                {t} {t !== "전체" && count}
              </button>
            );
          })}
        </div>

        {isAdmin && <p className="hint-text">관리자: 이름 카드를 누르면 단원을 삭제할 수 있어요.</p>}

        {members.length === 0 ? (
          <p className="empty-text">등록된 단원이 없습니다.</p>
        ) : (
          <>
            {visibleGroups.map(
              (g) =>
                g.members.length > 0 && (
                  <div key={g.part} className="member-part-group">
                    <div className="member-part-head">
                      <span className="member-part-title" style={{ color: PART_STYLE[g.part].main }}>
                        {g.part}
                      </span>
                      <span className="member-part-count">{g.members.length}명</span>
                    </div>
                    <div className="member-grid">{g.members.map(renderCard)}</div>
                  </div>
                )
            )}

            {tab === "전체" && nonVotingMembers.length > 0 && (
              <div className="member-part-group">
                <div className="member-part-head">
                  <span className="member-part-title" style={{ color: "#B08A3E" }}>
                    지휘자 · 반주자
                  </span>
                  <span className="member-part-count">{nonVotingMembers.length}명</span>
                </div>
                <div className="member-grid">{nonVotingMembers.map(renderCard)}</div>
              </div>
            )}
          </>
        )}
      </div>

      {deleteTarget && (
        <div className="modal-backdrop" onClick={() => !deleting && setDeleteTarget(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">{deleteTarget.name}님을 삭제할까요?</div>
            <p className="modal-desc">
              삭제하면 멤버 목록과 참석 투표 화면에서 더 이상 보이지 않습니다. 기존 참석 기록은 유지됩니다.
            </p>
            <button type="button" className="modal-danger-button" disabled={deleting} onClick={handleDelete}>
              {deleting ? "삭제 중..." : "삭제"}
            </button>
            <button type="button" className="modal-cancel" disabled={deleting} onClick={() => setDeleteTarget(null)}>
              취소
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
