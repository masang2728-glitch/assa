import type { Part, AttendanceStatus } from "./constants";

export interface Member {
  id: string;
  name: string;
  part: Part;
  role: "MEMBER" | "ADMIN";
  active: boolean;
}

export interface Schedule {
  id: string;
  date: string; // "YYYY-MM-DD"
  title: string;
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  place: string;
  description?: string;
  createdAt: number; // epoch millis
}

export interface AttendanceRecord {
  id: string;
  scheduleId: string;
  memberName: string;
  status: AttendanceStatus;
  updatedAt: number; // epoch millis
}

// 관리자 알림 팝업용 - 누가(본인 또는 관리자) 누구의 참석 여부를 언제 바꿨는지 기록.
export interface AttendanceChange {
  id: string;
  scheduleId: string;
  scheduleTitle: string;
  scheduleDate: string; // "YYYY-MM-DD"
  memberName: string;
  part: Part;
  oldStatus: AttendanceStatus | null; // 이전 기록이 없었으면 null (= 미응답 상태였음)
  newStatus: AttendanceStatus;
  changedBy: string;
  createdAt: number; // epoch millis
}
