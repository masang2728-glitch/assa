import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useSession } from "../session/SessionContext";
import { upsertMember } from "../api/members";
import { PARTS, type Part } from "../constants";

export default function NameEntryScreen() {
  const { login } = useSession();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [part, setPart] = useState<Part>(PARTS[0]);
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [entering, setEntering] = useState(false);

  const handleEnter = async () => {
    if (!name.trim()) {
      toast.error("이름을 입력해주세요.");
      return;
    }
    const result = login(name, part, pin);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setEntering(true);
    try {
      await upsertMember(name.trim(), part);
    } catch {
      toast.error("입장 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
      setEntering(false);
      return;
    }
    navigate("/calendar", { replace: true });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleEnter();
  };

  return (
    <div className="entry-screen">
      <div className="entry-card">
        <h1 className="entry-title">ASSA</h1>
        <p className="entry-subtitle">창원근로자합창단</p>

        <input
          className="entry-input"
          placeholder="이름"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={onKeyDown}
          autoFocus
        />

        <div className="field-label" style={{ marginTop: 14 }}>
          파트
        </div>
        <select className="text-field" value={part} onChange={(e) => setPart(e.target.value as Part)}>
          {PARTS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>

        {showPin ? (
          <input
            className="entry-input"
            placeholder="관리자 암호"
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            onKeyDown={onKeyDown}
          />
        ) : (
          <button type="button" className="entry-admin-link" onClick={() => setShowPin(true)}>
            관리자이신가요?
          </button>
        )}

        <button type="button" className="entry-button" onClick={handleEnter} disabled={entering}>
          {entering ? "입장 중..." : "입장하기"}
        </button>
      </div>
    </div>
  );
}
