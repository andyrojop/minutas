"use client";

import { CheckCircle2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { registerSignatureAction } from "@/actions/signatures";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getTopazComPortName,
  getTopazComPortNumber,
  resolveTopazSigWebScriptUrlForBrowser,
} from "@/lib/env";
import {
  captureSignatureSvg,
  formatSigWebLinkFailure,
  getSigWebWindow,
  isSigWebServiceReachable,
  linkSigWebTablet,
  readTabletPointCount,
  stopSigWebTablet,
} from "@/lib/topaz-sigweb";
import { cn } from "@/lib/utils";

const SIGWEB_CANVAS_ID = "cnv";

type Props = {
  minuteId: string;
  fieldClass: string;
};

export function TopazSignatureForm({ minuteId, fieldClass }: Props) {
  const [svg, setSvg] = useState("");
  const [signerName, setSignerName] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [captureToast, setCaptureToast] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const scriptLoaded = useRef(false);
  const tabletTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const captureToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scriptUrl = process.env.NEXT_PUBLIC_TOPAZ_SIGWEB_SCRIPT_URL?.trim();
  const comHint = getTopazComPortName() ?? `COM${getTopazComPortNumber()}`;

  const hasCapturedStroke = svg.trim().length > 0;

  const resetCapture = useCallback(() => {
    setSvg("");
    setSignerName("");
  }, []);

  const stopTabletRefresh = useCallback(() => {
    const w = getSigWebWindow();
    stopSigWebTablet(w, tabletTimerRef.current);
    tabletTimerRef.current = null;
  }, []);

  const showCaptureToast = useCallback((message: string) => {
    if (captureToastTimerRef.current) {
      clearTimeout(captureToastTimerRef.current);
    }
    setCaptureToast(message);
    captureToastTimerRef.current = setTimeout(() => {
      setCaptureToast(null);
      captureToastTimerRef.current = null;
    }, 3500);
  }, []);

  useEffect(() => {
    return () => {
      stopTabletRefresh();
      if (captureToastTimerRef.current) {
        clearTimeout(captureToastTimerRef.current);
      }
    };
  }, [stopTabletRefresh]);

  useEffect(() => {
    if (!scriptUrl || scriptLoaded.current) return;
    const existing = document.querySelector(`script[data-topaz-sigweb="1"]`);
    if (existing) {
      scriptLoaded.current = true;
      return;
    }
    const s = document.createElement("script");
    s.src = resolveTopazSigWebScriptUrlForBrowser(scriptUrl);
    s.async = true;
    s.dataset.topazSigweb = "1";
    s.onload = () => {
      scriptLoaded.current = true;
    };
    s.onerror = () =>
      setStatus("No se pudo cargar SigWeb. Revisa la configuración del servicio Topaz.");
    document.body.appendChild(s);
  }, [scriptUrl]);

  const clearPad = useCallback(() => {
    stopTabletRefresh();
    const w = getSigWebWindow();
    if (typeof w.ClearTablet === "function") {
      try {
        w.ClearTablet();
      } catch {
        /* ignore */
      }
    }
    resetCapture();
    const canvas = document.getElementById(SIGWEB_CANVAS_ID) as HTMLCanvasElement | null;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setStatus(null);
    setCaptureToast(null);
  }, [resetCapture, stopTabletRefresh]);

  const captureFromPad = useCallback(() => {
    const w = getSigWebWindow();
    const points = readTabletPointCount(w);

    if (points === 0) {
      setStatus("Firma en el pad y vuelve a capturar.");
      return;
    }

    const canvas = document.getElementById(SIGWEB_CANVAS_ID) as HTMLCanvasElement | null;

    void (async () => {
      const captured = await captureSignatureSvg(w, canvas);
      if (captured) {
        setSvg(captured);
        setSignerName("");
        setStatus(null);
        showCaptureToast("Firma capturada. Indica el nombre y guarda.");
        stopTabletRefresh();
        return;
      }
      setStatus("No se pudo capturar el trazo. Intenta de nuevo.");
    })();
  }, [showCaptureToast, stopTabletRefresh]);

  const startTablet = useCallback(() => {
    const w = getSigWebWindow();
    const canvas = document.getElementById(SIGWEB_CANVAS_ID) as HTMLCanvasElement | null;
    if (!canvas) {
      setStatus("Recarga la página e intenta de nuevo.");
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setStatus("El lienzo de firma no está disponible en este navegador.");
      return;
    }
    if (typeof w.SetTabletState !== "function") {
      setStatus("SigWeb no está disponible. Comprueba que el servicio Topaz esté instalado.");
      return;
    }
    if (!isSigWebServiceReachable(w)) {
      setStatus("El servicio SigWeb no responde. Instálalo o reinícialo en Windows.");
      return;
    }

    resetCapture();
    stopTabletRefresh();
    const link = linkSigWebTablet(w, ctx, tabletTimerRef.current);
    tabletTimerRef.current = link.refreshTimer;

    if (!link.refreshTimer || link.tabletState === 0) {
      setStatus(formatSigWebLinkFailure(link));
      return;
    }

    setStatus(
      link.tabletKind === "hsb"
        ? "Pad activo. Firma en el dispositivo y pulsa Capturar."
        : `Pad activo (${comHint}). Firma en el dispositivo y pulsa Capturar.`,
    );
  }, [comHint, resetCapture, stopTabletRefresh]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!hasCapturedStroke) {
      setStatus("Captura el trazo antes de guardar.");
      return;
    }
    const name = signerName.trim();
    if (!name) {
      setStatus("Indica el nombre de quien firma.");
      return;
    }

    const formData = new FormData();
    formData.set("minute_id", minuteId);
    formData.set("signature_svg", svg);
    formData.set("signer_display_name", name);

    startTransition(async () => {
      try {
        await registerSignatureAction(formData);
        clearPad();
        setStatus("Firma guardada.");
      } catch (err) {
        setStatus(err instanceof Error ? err.message : "No se pudo guardar la firma.");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {captureToast ? (
        <div
          role="status"
          className="border-success/30 bg-success/10 text-success-foreground flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
        >
          <CheckCircle2 className="size-4 shrink-0" aria-hidden />
          <span>{captureToast}</span>
        </div>
      ) : null}

      {scriptUrl ? (
        <div className="border-border overflow-hidden rounded-xl border bg-white shadow-xs">
          <canvas id={SIGWEB_CANVAS_ID} width="500" height="200" className="block max-w-full" />
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">
          Falta configurar el pad de firma en el entorno de la aplicación.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
          onClick={startTablet}
          disabled={isPending || !scriptUrl}
        >
          Iniciar pad
        </button>
        <button
          type="button"
          className={cn(buttonVariants({ size: "sm" }))}
          onClick={captureFromPad}
          disabled={isPending || !scriptUrl}
        >
          Capturar
        </button>
        <button
          type="button"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
          onClick={clearPad}
          disabled={isPending}
        >
          Limpiar
        </button>
      </div>

      {status ? (
        <p role="status" className="text-muted-foreground text-sm">
          {status}
        </p>
      ) : null}

      {hasCapturedStroke ? (
        <div className="border-border space-y-3 rounded-xl border p-4">
          <div className="space-y-2">
            <Label htmlFor="signer_display_name">Nombre</Label>
            <Input
              id="signer_display_name"
              name="signer_display_name"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder="Nombre completo"
              className={fieldClass}
              autoComplete="name"
              disabled={isPending}
              required
            />
          </div>
          <button type="submit" className={cn(buttonVariants())} disabled={isPending}>
            {isPending ? "Guardando…" : "Guardar firma"}
          </button>
        </div>
      ) : null}
    </form>
  );
}
