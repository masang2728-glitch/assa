// 관리자 암호. 배포 전에 반드시 원하는 암호로 바꿔주세요.
export const ADMIN_PIN = "0000";

export const PARTS = ["소프라노", "알토", "테너", "베이스", "지휘자", "반주자"] as const;
export type Part = (typeof PARTS)[number];

export const VOICE_PARTS = ["소프라노", "알토", "테너", "베이스"] as const;
// 성부가 아닌 파트 - 파트별 참석 현황 칸에는 안 나오고, 멤버 현황에서는 따로 묶어 보여준다.
export const NON_VOICE_PARTS = ["지휘자", "반주자"] as const;
// 참석 투표를 하지 않는 파트 - 지휘자는 투표하므로 반주자만 남는다.
export const NON_VOTING_PARTS = ["반주자"] as const;

export const ATTENDANCE_STATUSES = ["참석", "늦참", "불참", "온라인", "미정"] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

// 참석 여부를 누르면 뜨는 확인 팝업의 짤 목록. 이미지 파일은 public/popup 폴더에 넣고
// 여기에 "/popup/파일이름"으로 적으면 된다. 목록을 한 바퀴씩 섞어서 골고루 돌아가며 뜨고, 비어 있으면 체크 아이콘이 뜬다.
// attend1 그만 좀 봅시다 · attend2 오이시 · attend5 와 이래 많이 봅니까 · attend6 라라라라라 · attend7 씨익 고릴라 · attend8 쿵짝쿵짝
// absent1 굶어라 · absent2 절단났네 · absent4 페페 · absent5 김정은(움짤) · absent6 절레절레 · absent7 퉤
// 팝업에서는 작게 보이므로 긴 쪽 640px 이하로 줄여서 넣는다 - 크면 휴대폰에서 늦게 뜬다.
// 움짤은 gif 대신 움직이는 webp로 바꿔 넣으면 용량이 훨씬 작다 (오이시: 3.5MB gif -> 0.6MB webp).
const ATTEND_IMAGES = [
  "/popup/attend1.jpg",
  "/popup/attend2.webp",
  "/popup/attend5.jpg",
  "/popup/attend6.jpg",
  "/popup/attend7.jpg",
  "/popup/attend8.jpg",
];
const ABSENT_IMAGES = [
  "/popup/absent1.jpg",
  "/popup/absent2.jpg",
  "/popup/absent4.png",
  "/popup/absent5.webp",
  "/popup/absent6.jpg",
  "/popup/absent7.jpg",
];

export const POPUP_IMAGES: Record<AttendanceStatus, string[]> = {
  참석: ATTEND_IMAGES,
  늦참: ATTEND_IMAGES,
  불참: ABSENT_IMAGES,
  온라인: [],
  미정: [],
};
