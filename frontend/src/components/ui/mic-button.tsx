"use client";

import { Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface MicButtonProps {
  listening: boolean;
  supported: boolean;
  onToggle: () => void;
  className?: string;
}

export function MicButton({ listening, supported, onToggle, className }: MicButtonProps) {
  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={onToggle}
      title={listening ? "Detener dictado" : "Iniciar dictado"}
      className={cn(
        "inline-flex items-center justify-center rounded-md p-1.5 transition-colors",
        listening
          ? "bg-red-100 text-red-600 hover:bg-red-200 animate-pulse dark:bg-red-900/30 dark:text-red-400"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
        className,
      )}
    >
      {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
    </button>
  );
}
