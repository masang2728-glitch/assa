import { useState } from "react";
import toast from "react-hot-toast";
import { createSchedule, updateSchedule } from "../api/schedules";
import type { Schedule } from "../types";

interface ScheduleFormModalProps {
  defaultDate: string;
  schedule?: Schedule; // when set, the modal edits this schedule instead of creating a new one
  onClose: () => void;
}

export default function ScheduleFormModal({ defaultDate, schedule, onClose }: ScheduleFormModalProps) {
  const isEdit = !!schedule;
  const [date, setDate] = useState(schedule?.date ?? defaultDate);
  const [title, setTitle] = useState(schedule?.title ?? "");
  const [startTime, setStartTime] = useState(schedule?.startTime ?? "19:00");
  const [endTime, setEndTime] = useState(schedule?.endTime ?? "21:00");
  const [place, setPlace] = useState(schedule?.place ?? "");
  const [description, setDescription] = useState(schedule?.description ?? "");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!date || !title.trim() || !startTime || !endTime || !place.trim()) {
      toast.error("일정명, 날짜, 시간, 장소를 모두 입력해주세요.");
      return;
    }
    setSubmitting(true);
    try {
      const payload = { date, title: title.trim(), startTime, endTime, place: place.trim(), description };
      if (isEdit) {
        await updateSchedule(schedule.id, payload);
        toast.success("일정이 수정되었습니다.");
      } else {
        await createSchedule(payload);
        toast.success("일정이 등록되었습니다.");
      }
      onClose();
    } catch {
      toast.error(isEdit ? "수정 중 오류가 발생했습니다." : "등록 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">{isEdit ? "일정 수정" : "새 일정 등록"}</div>

        <div className="field-label" style={{ marginTop: 0 }}>
          일정명
        </div>
        <input className="text-field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 정기연습" />

        <div className="field-label">날짜</div>
        <input className="text-field" type="date" value={date} onChange={(e) => setDate(e.target.value)} />

        <div className="field-label">시간</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            className="text-field"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
          <span>~</span>
          <input className="text-field" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
        </div>

        <div className="field-label">장소</div>
        <input
          className="text-field"
          value={place}
          onChange={(e) => setPlace(e.target.value)}
          placeholder="예: 창원근로자회관"
        />

        <div className="field-label">설명 (선택)</div>
        <input className="text-field" value={description} onChange={(e) => setDescription(e.target.value)} />

        <button type="button" className="submit-button" onClick={handleSubmit} disabled={submitting}>
          {submitting ? (isEdit ? "수정 중..." : "등록 중...") : isEdit ? "수정 완료" : "일정 등록"}
        </button>
        <button type="button" className="modal-cancel" onClick={onClose}>
          닫기
        </button>
      </div>
    </div>
  );
}
