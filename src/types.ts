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
