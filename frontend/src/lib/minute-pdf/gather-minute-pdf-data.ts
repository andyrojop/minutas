import { listCommitments } from "@/actions/commitments";
import { getMeeting, listMeetingAttendees } from "@/actions/meetings";
import { getMinute } from "@/actions/minutes";
import { listSignaturesByMinute } from "@/actions/signatures";
import { listUsers } from "@/actions/users";
import type { MinutePdfInput } from "@/lib/minute-pdf/types";

export async function gatherMinutePdfData(minuteId: string): Promise<MinutePdfInput> {
  const minute = await getMinute(minuteId);
  const meeting = await getMeeting(minute.meeting_id).catch(() => null);
  const signatures = await listSignaturesByMinute(minuteId).catch(() => []);
  const commitments = await listCommitments(minuteId).catch(() => []);

  const attendees = await listMeetingAttendees(minute.meeting_id).catch(() => []);
  const users = await listUsers().catch(() => []);

  const emailOf = (uid: string) => users.find((u) => u.id === uid)?.email?.trim() || null;

  const participantLabels = attendees
    .map((a) => emailOf(a.user_id) || `Participante ${a.user_id.slice(0, 8)}`)
    .filter(Boolean);

  return {
    minute,
    meeting,
    signatures,
    commitments,
    participantLabels,
  };
}
