// 멤버 현황 이름 카드에 쓰는 파트별 2등신 캐릭터 (SVG 직접 그림 - 외부 그림 없음).
// 파트마다 고정 색이라 색만 봐도 파트를 알 수 있다.
export const PART_STYLE: Record<string, { g: string; main: string; soft: string; hair: string; acc: string }> = {
  소프라노: { g: "f", main: "#F27BA5", soft: "#FFE3EE", hair: "#6B3E2E", acc: "bow" },
  알토: { g: "f", main: "#A67CE8", soft: "#EFE6FF", hair: "#3B2A4F", acc: "band" },
  테너: { g: "m", main: "#4BA3F0", soft: "#E1F1FF", hair: "#3A2A22", acc: "tuft" },
  베이스: { g: "m", main: "#2F5FB3", soft: "#E1E9F8", hair: "#1F1A17", acc: "brow" },
  지휘자: { g: "m", main: "#C9A050", soft: "#FBF1DC", hair: "#2B2522", acc: "baton" },
  반주자: { g: "f", main: "#C9A050", soft: "#FBF1DC", hair: "#5A3A28", acc: "keys" },
};
function avatarSvg(part: string, size: number): string {
  const s = PART_STYLE[part] || PART_STYLE["테너"];
  const id = `a${size}${part}`;
  const skin = "#FFDCC2";
  let hairBack = "", hairFront = "", acc = "", extra = "";
  if (s.g === "f") {
    hairBack = `<path d="M9 23c0-10 5-15.500 11-15.500S31 13 31 23v12H9z" fill="${s.hair}"/>`;
    hairFront = `<path d="M11 21c1.500-6.500 5-9 9-9s7.500 2.500 9 9c-3.500 0-7-1.700-9-4.300-2 2.600-5.500 4.300-9 4.300z" fill="${s.hair}"/>`;
    if (s.acc === "bow") acc = `<g fill="${s.main}"><path d="M25 10.500l5-3v6z"/><path d="M25 10.500l-1 5.500 4.500-1.500z" opacity=".0"/><path d="M25.200 10.600l5.300 3.200-1 1.800z" opacity="0"/></g><path d="M24.500 10.800l-4.500-3v6zM24.500 10.800l4.500-3v6z" fill="${s.main}"/><circle cx="24.500" cy="10.800" r="1.400" fill="#fff" opacity=".9"/>`;
    if (s.acc === "band") acc = `<path d="M11.500 15.500c2-4.500 5-6.300 8.500-6.300s6.500 1.800 8.500 6.300" stroke="${s.main}" stroke-width="2.200" fill="none" stroke-linecap="round"/><circle cx="27" cy="13" r="1.800" fill="#FFD447"/>`;
    if (s.acc === "keys") extra = `<g transform="translate(26 30)"><rect width="12" height="7" rx="1.200" fill="#fff" stroke="#2B2522" stroke-width=".7"/><path d="M3 0v7M6 0v7M9 0v7" stroke="#2B2522" stroke-width=".5"/><rect x="2" width="1.600" height="4" fill="#2B2522"/><rect x="5" width="1.600" height="4" fill="#2B2522"/><rect x="8" width="1.600" height="4" fill="#2B2522"/></g>`;
  } else {
    hairFront = `<path d="M10.500 21.500c-.500-8 4-12.500 9.500-12.500s10 4.500 9.500 12.500c-1.500-3.200-5-5.200-9.500-5.200s-8 2-9.500 5.200z" fill="${s.hair}"/>`;
    if (s.acc === "tuft") acc = `<path d="M20 9c1-3 3.500-4 5-3.500-2 .500-3 2-3.300 3.500z" fill="${s.hair}"/>`;
    if (s.acc === "brow") acc = `<path d="M14.500 19.300l3.300-.6M25.500 19.300l-3.300-.6" stroke="${s.hair}" stroke-width="1.200" stroke-linecap="round"/>`;
    if (s.acc === "baton") extra = `<path d="M30 32l7-10" stroke="#2B2522" stroke-width="1.500" stroke-linecap="round"/><path d="M37 19.500l.6 1.300 1.400.2-1 1 .2 1.400-1.200-.7-1.200.7.2-1.400-1-1 1.400-.2z" fill="#FFD447"/>`;
  }
  // 2등신: 머리 크게(반지름 9.5), 몸 작게
  const body = s.acc === "baton"
    ? `<path d="M11 40c0-6 4-9.500 9-9.500s9 3.500 9 9.500z" fill="#2B2522"/><path d="M17.500 30.800l2.500 3 2.500-3z" fill="#fff"/><path d="M18.300 31.200l1.700 1 1.700-1-1.700 1.100z" fill="${s.main}"/>`
    : `<path d="M11 40c0-6 4-9.500 9-9.500s9 3.500 9 9.500z" fill="${s.main}"/><path d="M17 31l3 2.500 3-2.500" fill="none" stroke="#fff" stroke-width="1.200" stroke-linecap="round"/>`;
  const face = `<circle cx="20" cy="21" r="9.500" fill="${skin}"/>
    <ellipse cx="16.400" cy="22.200" rx="1.300" ry="1.600" fill="#2B2522"/><ellipse cx="23.600" cy="22.200" rx="1.300" ry="1.600" fill="#2B2522"/>
    <circle cx="16.900" cy="21.600" r=".5" fill="#fff"/><circle cx="24.100" cy="21.600" r=".5" fill="#fff"/>
    <ellipse cx="14" cy="25" rx="1.700" ry="1.100" fill="#FF9DB0" opacity=".65"/><ellipse cx="26" cy="25" rx="1.700" ry="1.100" fill="#FF9DB0" opacity=".65"/>
    <path d="M18.300 25.300q1.700 1.600 3.400 0" stroke="#C0505E" stroke-width="1" fill="none" stroke-linecap="round"/>`;
  return `<svg width="${size}" height="${size}" viewBox="0 0 40 40" aria-hidden="true">
    <circle cx="20" cy="20" r="20" fill="${s.soft}"/>
    <clipPath id="${id}"><circle cx="20" cy="20" r="20"/></clipPath>
    <g clip-path="url(#${id})">${hairBack}${body}${face}${hairFront}${acc}</g>${extra}
    <circle cx="20" cy="20" r="19" fill="none" stroke="${s.main}" stroke-width="2"/></svg>`;
}

export default function Avatar({ part, size = 52 }: { part: string; size?: number }) {
  return <span className="avatar" dangerouslySetInnerHTML={{ __html: avatarSvg(part, size) }} />;
}
