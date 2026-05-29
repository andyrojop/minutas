import type { MeetingStatus, MinuteStatus } from "@/types/database";

const MEETING_STATUS_LABELS: Record<MeetingStatus, string> = {
  SCHEDULED: "Programada",
  ONGOING: "En curso",
  FINISHED: "Finalizada",
  CANCELLED: "Cancelada",
};

const MINUTE_STATUS_LABELS: Record<MinuteStatus, string> = {
  DRAFT: "Borrador",
  SIGNING: "En firma",
  SIGNED: "Firmada",
  CLOSED: "Cerrada",
};

export function meetingStatusLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return MEETING_STATUS_LABELS[value as MeetingStatus] ?? value;
}

export function minuteStatusLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return MINUTE_STATUS_LABELS[value as MinuteStatus] ?? value;
}
