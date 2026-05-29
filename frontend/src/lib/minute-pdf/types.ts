import type { CommitmentRow, MeetingRow, MinuteRow, SignatureRow } from "@/types/database";

export type MinutePdfInput = {
  minute: MinuteRow;
  meeting: MeetingRow | null;
  signatures: SignatureRow[];
  commitments: CommitmentRow[];
  participantLabels: string[];
};
