import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";

// 화면 위쪽 남색 머리띠 - 뒤로가기 + 제목 (+ 오른쪽 버튼)
export function PageHeader({
  title,
  sub,
  backTo,
  right,
  children,
}: {
  title: string;
  sub?: string;
  backTo?: string; // 없으면 브라우저 뒤로가기
  right?: ReactNode;
  children?: ReactNode;
}) {
  const navigate = useNavigate();
  const goBack = () => {
    if (backTo) navigate(backTo);
    else if (window.history.length > 1) navigate(-1);
    else navigate("/home");
  };
  return (
    <div className="page-header">
      <div className="page-header-row">
        <button type="button" className="page-back" onClick={goBack} aria-label="뒤로">
          ‹
        </button>
        <div className="page-header-text">
          <h1 className="page-title">{title}</h1>
          {sub && <div className="page-sub">{sub}</div>}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

const NAV_ITEMS = [
  {
    to: "/home",
    label: "홈",
    match: ["/home", "/respond", "/attendance", "/my-attendance"],
    icon: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  },
  {
    to: "/calendar",
    label: "달력",
    match: ["/calendar", "/schedule"],
    icon: (
      <>
        <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
        <path d="M3.5 10h17M8 3v4M16 3v4" />
      </>
    ),
  },
  {
    to: "/members",
    label: "멤버",
    match: ["/members"],
    icon: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-4.4 3.6-7.5 8-7.5s8 3.1 8 7.5" />
      </>
    ),
  },
  {
    to: "/more",
    label: "더보기",
    match: ["/more"],
    icon: (
      <>
        <circle cx="5" cy="12" r="1.6" />
        <circle cx="12" cy="12" r="1.6" />
        <circle cx="19" cy="12" r="1.6" />
      </>
    ),
  },
];

export function BottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  return (
    <nav className="bottom-nav">
      {NAV_ITEMS.map((item) => {
        const active = item.match.some((m) => pathname === m || pathname.startsWith(m + "/"));
        return (
          <button
            key={item.to}
            type="button"
            className={"bottom-nav-item" + (active ? " active" : "")}
            onClick={() => navigate(item.to)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              {item.icon}
            </svg>
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
