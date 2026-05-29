import { redirect } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CommitmentStatusForm } from "@/components/commitments/commitment-status-form";
import { listMyCommitments } from "@/actions/commitments";
import { asCommitmentStatus, priorityLabel } from "@/lib/commitments";
import { getMyRole } from "@/lib/session-role";
import { canSeeMyCommitmentsNav } from "@/lib/roles";
import type { CommitmentRow } from "@/types/database";

export default async function MyCommitmentsPage() {
  const role = await getMyRole();
  if (!canSeeMyCommitmentsNav(role)) redirect("/dashboard");
  let rows: CommitmentRow[] = [];
  let err: string | null = null;
  try {
    rows = await listMyCommitments();
  } catch (e) {
    err = e instanceof Error ? e.message : "No se pudo cargar.";
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Mis compromisos</h1>
        <p className="text-muted-foreground text-sm">
          Actualiza el estado de lo que te han asignado.
        </p>
      </div>

      {err ? (
        <p className="text-destructive text-sm">{err}</p>
      ) : rows.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Nada pendiente aquí</CardTitle>
            <CardDescription>Cuando seas responsable de un compromiso, aparecerá en esta lista.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <ul className="space-y-4">
          {rows.map((c) => (
            <li key={c.id}>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium">{c.description ?? "Compromiso"}</CardTitle>
                  <CardDescription>
                    Vence:{" "}
                    {c.due_date
                      ? new Date(c.due_date).toLocaleDateString("es-GT", { dateStyle: "long" })
                      : "Sin fecha"}
                    {c.priority ? ` · Prioridad: ${priorityLabel(c.priority)}` : null}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CommitmentStatusForm commitmentId={c.id} initialStatus={asCommitmentStatus(c.status)} />
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
