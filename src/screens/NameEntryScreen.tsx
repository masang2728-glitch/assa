import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useSession } from "../session/SessionContext";
import { upsertMember } from "../api/members";
import { PARTS, type Part } from "../constants";
import splashImage from "../assets/splash.jpg";

export default function NameEntryScreen() {
  const { login } = useSession();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [part, setPart] = useState<Part | null>(null);
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [entering, setEntering] = useState(false);

  const handleEnter = async () => {
    if (!name.trim()) {
      toast.error("이름을 입력해주세요.");
      return;
    }
    if (!part) {
      toast.error("파트를 골라주세요.");
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
    navigate("/home", { replace: true });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleEnter();
  };

  return (
    <div className="entry-screen" style={{ ["--splash" as string]: `url(${splashImage})` }}>
      <div className="entry-form">
        <div className="entry-label">이름</div>
        <input
          className="entry-input"
          placeholder="이름을 입력하세요"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={onKeyDown}
        />

        <div className="entry-label">파트</div>
        <div className="part-buttons">
          {PARTS.map((p) => (
            <button
              key={p}
              type="button"
              className={"part-button" + (part === p ? " on" : "")}
              onClick={() => setPart(p)}
            >
              {p}
            </button>
          ))}
        </div>

        {showPin && (
          <input
            className="entry-input"
            placeholder="관리자 암호"
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            onKeyDown={onKeyDown}
            style={{ marginTop: 14 }}
          />
        )}

        <button type="button" className="entry-button" onClick={handleEnter} disabled={entering}>
          {entering ? "입장 중..." : "입장하기"}
        </button>

        {!showPin && (
          <button type="button" className="entry-admin-link" onClick={() => setShowPin(true)}>
            관리자이신가요?
          </button>
        )}
      </div>
    </div>
  );
}
