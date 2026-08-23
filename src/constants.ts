// 관리자 암호. 배포 전에 반드시 원하는 암호로 바꿔주세요.
export const ADMIN_PIN = "0000";

export const PARTS = ["소프라노", "알토", "테너", "베이스", "지휘자", "반주자"] as const;
export type Part = (typeof PARTS)[number];

export const ATTENDANCE_STATUSES = ["참석", "늦참", "불참", "온라인", "미정"] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];
