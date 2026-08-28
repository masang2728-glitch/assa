import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useSession } from "../session/SessionContext";
import { subscribeToMembers, deactivateMember } from "../api/members";
import type { Member } from "../types";
import { NON_VOTING_PARTS, VOICE_PARTS } from "../constants";

export default function MembersScreen() {
  const { isAdmin } = useSession();
  const navigate = useNavigate();
  const [members, setMembers] = useState<Member[]>([]);
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
    () => members.filter((m) => (NON_VOTING_PARTS as readonly string[]).includes(m.part)),
    [members]
  );

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

  return (
    <div className="screen">
      <div className="header">
        <div className="header-row">
          <div>
            <h1 className="header-title">멤버 현황</h1>
            <div className="header-sub">전체 {members.length}명</div>
          </div>
          <button type="button" className="header-link" onClick={() => navigate("/calendar")}>
            캘린더로 ›
          </button>
        </div>
      </div>

      <div className="content">
        {members.length === 0 ? (
          <p className="empty-text">등록된 단원이 없습니다.</p>
        ) : (
          <>
            {voiceGroups.map(
              (g) =>
                g.members.length > 0 && (
                  <div key={g.part} className="member-part-group">
                    <div className="member-part-head">
                      <span className="member-part-title">{g.part}</span>
                      <span className="member-part-count">{g.members.length}명</span>
                    </div>
                    <div className="member-chip-row">
                      {g.members.map((m) =>
                        isAdmin ? (
                          <button
                            key={m.id}
                            type="button"
                            className="member-chip"
                            onClick={() => setDeleteTarget(m)}
                          >
                            {m.name}
                          </button>
                        ) : (
                          <span key={m.id} className="member-chip">
                            {m.name}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                )
            )}

            {nonVotingMembers.length > 0 && (
              <div className="member-part-group">
                <div className="member-part-head">
                  <span className="member-part-title">지휘자 · 반주자</span>
                  <span className="member-part-count">{nonVotingMembers.length}명</span>
                </div>
                <div className="member-chip-row">
                  {nonVotingMembers.map((m) =>
                    isAdmin ? (
                      <button
                        key={m.id}
                        type="button"
                        className="member-chip novote"
                        onClick={() => setDeleteTarget(m)}
                      >
                        {m.name} ({m.part})
                      </button>
                    ) : (
                      <span key={m.id} className="member-chip novote">
                        {m.name} ({m.part})
                      </span>
                    )
                  )}
                </div>
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
    </div>
  );
}
