export const COMMITMENT_STATUSES = ["pendiente", "en_progreso", "cumplido", "vencido"] as const;

export type CommitmentStatus = (typeof COMMITMENT_STATUSES)[number];

const STATUS_LABELS: Record<CommitmentStatus, string> = {
  pendiente: "Pendiente",
  en_progreso: "En progreso",
  cumplido: "Cumplido",
  vencido: "Vencido",
};

export function commitmentStatusLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return STATUS_LABELS[value as CommitmentStatus] ?? value;
}

const PRIORITY_LABELS: Record<string, string> = {
  alta: "Alta",
  media: "Media",
  baja: "Baja",
};

export function priorityLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return PRIORITY_LABELS[value] ?? value;
}

export function asCommitmentStatus(value: string | null | undefined): CommitmentStatus {
  return (COMMITMENT_STATUSES as readonly string[]).includes(value ?? "")
    ? (value as CommitmentStatus)
    : "pendiente";
}
