"use client";

import { useState, useTransition } from "react";

import { patchCommitmentAction } from "@/actions/commitments";
import { buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  COMMITMENT_STATUSES,
  type CommitmentStatus,
  commitmentStatusLabel,
} from "@/lib/commitments";
import { cn } from "@/lib/utils";

type Props = {
  commitmentId: string;
  initialStatus: CommitmentStatus;
};

export function CommitmentStatusForm({ commitmentId, initialStatus }: Props) {
  const [status, setStatus] = useState<CommitmentStatus>(initialStatus);
  const [savedStatus, setSavedStatus] = useState<CommitmentStatus>(initialStatus);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  const dirty = status !== savedStatus;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const next = status;
    const formData = new FormData();
    formData.set("commitment_id", commitmentId);
    formData.set("status", next);
    startTransition(async () => {
      try {
        await patchCommitmentAction(formData);
        setSavedStatus(next);
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 2500);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo actualizar.");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <Label htmlFor={`st-${commitmentId}`}>Estado</Label>
        <select
          id={`st-${commitmentId}`}
          name="status"
          value={status}
          onChange={(e) => setStatus(e.target.value as CommitmentStatus)}
          disabled={isPending}
          className="border-input bg-background h-9 rounded-lg border px-3 text-sm"
        >
          {COMMITMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {commitmentStatusLabel(s)}
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        className={cn(buttonVariants({ size: "sm" }))}
        disabled={isPending || !dirty}
      >
        {isPending ? "Guardando…" : "Guardar"}
      </button>
      {justSaved && !dirty ? (
        <span className="text-xs font-medium text-green-700 dark:text-green-400">Guardado</span>
      ) : null}
      {error ? <span className="text-destructive text-xs">{error}</span> : null}
    </form>
  );
}
