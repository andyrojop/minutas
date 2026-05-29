"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { buttonVariants } from "@/components/ui/button";
import { MicButton } from "@/components/ui/mic-button";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { updateMinuteDraftAction } from "@/actions/minutes";

interface MinuteDraftFormProps {
  minuteId: string;
  defaultValues: {
    agenda: string;
    desarrollo: string;
    acuerdos: string;
    observaciones: string;
  };
  formKey: string;
}

const fieldClass =
  "border-input bg-background ring-ring/24 focus-visible:border-ring focus-visible:ring-ring/50 flex w-full rounded-lg border px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50";

type FieldName = "agenda" | "desarrollo" | "acuerdos" | "observaciones";

const FIELDS: { name: FieldName; label: string; rows: number }[] = [
  { name: "agenda", label: "Agenda", rows: 4 },
  { name: "desarrollo", label: "Desarrollo", rows: 6 },
  { name: "acuerdos", label: "Acuerdos", rows: 4 },
  { name: "observaciones", label: "Observaciones", rows: 3 },
];

export function MinuteDraftForm({ minuteId, defaultValues, formKey }: MinuteDraftFormProps) {
  const [values, setValues] = useState(defaultValues);
  const [activeField, setActiveField] = useState<FieldName | null>(null);

  const refs = {
    agenda: useRef<HTMLTextAreaElement>(null),
    desarrollo: useRef<HTMLTextAreaElement>(null),
    acuerdos: useRef<HTMLTextAreaElement>(null),
    observaciones: useRef<HTMLTextAreaElement>(null),
  };

  const appendTranscript = (field: FieldName) => (text: string) => {
    setValues((prev) => ({
      ...prev,
      [field]: prev[field] ? prev[field] + " " + text : text,
    }));
  };

  const mics = {
    agenda: useSpeechRecognition({ onTranscript: appendTranscript("agenda") }),
    desarrollo: useSpeechRecognition({ onTranscript: appendTranscript("desarrollo") }),
    acuerdos: useSpeechRecognition({ onTranscript: appendTranscript("acuerdos") }),
    observaciones: useSpeechRecognition({ onTranscript: appendTranscript("observaciones") }),
  };

  const handleToggle = (field: FieldName) => {
    const mic = mics[field];
    if (mic.listening) {
      mic.stop();
      setActiveField(null);
    } else {
      if (activeField && activeField !== field) {
        mics[activeField].stop();
      }
      setActiveField(field);
      mic.start();
    }
  };

  return (
    <form key={formKey} action={updateMinuteDraftAction} className="space-y-4">
      <input type="hidden" name="minute_id" value={minuteId} />

      {FIELDS.map(({ name, label, rows }) => (
        <div key={name} className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Label htmlFor={name}>{label}</Label>
            <MicButton
              listening={mics[name].listening}
              supported={mics[name].supported}
              onToggle={() => handleToggle(name)}
            />
          </div>
          <textarea
            ref={refs[name]}
            id={name}
            name={name}
            rows={rows}
            value={values[name]}
            onChange={(e) => setValues((prev) => ({ ...prev, [name]: e.target.value }))}
            className={cn(fieldClass, mics[name].listening && "ring-2 ring-red-400/50 border-red-300")}
          />
        </div>
      ))}

      <button type="submit" className={cn(buttonVariants())}>
        Guardar borrador
      </button>
    </form>
  );
}
