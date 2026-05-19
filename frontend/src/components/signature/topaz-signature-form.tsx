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
  getTopazTabletKind,
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

/** Superficie que SigWeb espera (nombre/id habituales en ejemplos Topaz). */
const SIGWEB_CANVAS_ID = "cnv";

type Props = {
  minuteId: string;
  fieldClass: string;
};

/**
 * Firma con tablet Topaz vía SigWeb (servicio local).
 * Flujo: activar pad → firmar → capturar trazo → nombre del firmante → confirmar.
 */
export function TopazSignatureForm({ minuteId, fieldClass }: Props) {
  const [svg, setSvg] = useState("");
  const [signerName, setSignerName] = useState("");
  const [sigwebHint, setSigwebHint] = useState<string | null>(null);
  const [pointCount, setPointCount] = useState<number | null>(null);
  const [captureToast, setCaptureToast] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const scriptLoaded = useRef(false);
  const tabletTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const captureToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scriptUrl = process.env.NEXT_PUBLIC_TOPAZ_SIGWEB_SCRIPT_URL?.trim();
  const tabletKind = getTopazTabletKind();
  const comHint = getTopazComPortName() ?? `COM${getTopazComPortNumber()}`;

  const hasCapturedStroke = svg.trim().length > 0;

  const resetCapture = useCallback(() => {
    setSvg("");
    setSignerName("");
    setPointCount(0);
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
      setSigwebHint(
        "No se pudo cargar SigWebTablet.js. Comprueba NEXT_PUBLIC_TOPAZ_SIGWEB_SCRIPT_URL y que el archivo exista en public/.",
      );
    document.body.appendChild(s);
  }, [scriptUrl]);

  const refreshPointCount = useCallback(() => {
    setPointCount(readTabletPointCount());
  }, []);

  const captureFromPad = useCallback(() => {
    const w = getSigWebWindow();
    const points = readTabletPointCount(w);
    setPointCount(points);

    if (points === 0) {
      setSigwebHint(
        "No hay trazo en el pad (0 puntos). Pulsa «Activar pad», firma en el dispositivo hasta ver el trazo en el lienzo y captura de nuevo.",
      );
      return;
    }

    const canvas = document.getElementById(SIGWEB_CANVAS_ID) as HTMLCanvasElement | null;

    void (async () => {
      const captured = await captureSignatureSvg(w, canvas);
      if (captured) {
        setSvg(captured);
        setSignerName("");
        setSigwebHint("Firma capturada. Escribe el nombre del firmante y pulsa «Confirmar firma».");
        showCaptureToast("Trazo capturado correctamente.");
        stopTabletRefresh();
        return;
      }
      setSigwebHint(
        "No se pudo exportar la firma. Mantén el trazo visible en el lienzo y captura de nuevo sin pulsar «Archivar pad» antes.",
      );
    })();
  }, [showCaptureToast, stopTabletRefresh]);

  const startTablet = useCallback(() => {
    const w = getSigWebWindow();
    const canvas = document.getElementById(SIGWEB_CANVAS_ID) as HTMLCanvasElement | null;
    if (!canvas) {
      setSigwebHint("No se encontró el canvas de firma. Recarga la página.");
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setSigwebHint("El navegador no permite contexto 2D en el canvas.");
      return;
    }
    if (typeof w.SetTabletState !== "function") {
      setSigwebHint(
        "SigWeb no está cargado. Verifica NEXT_PUBLIC_TOPAZ_SIGWEB_SCRIPT_URL=/sigweb/SigWebTablet.js y que SigWeb esté instalado.",
      );
      return;
    }
    if (!isSigWebServiceReachable(w)) {
      setSigwebHint(
        "No responde el servicio SigWeb (tablet.sigwebtablet.com:47289). Instala/reinicia SigWeb en Windows y comprueba el archivo hosts de Topaz.",
      );
      return;
    }

    resetCapture();
    stopTabletRefresh();
    const link = linkSigWebTablet(w, ctx, tabletTimerRef.current);
    tabletTimerRef.current = link.refreshTimer;

    const points = readTabletPointCount(w);
    setPointCount(points);

    if (!link.refreshTimer || link.tabletState === 0) {
      setSigwebHint(formatSigWebLinkFailure(link));
      return;
    }

    const linkHint =
      link.tabletKind === "hsb"
        ? `Pad HSB activado (estado ${link.tabletState}, USB)`
        : `Pad BSB activado en ${comHint} (SigWeb puerto ${link.serviceComPort ?? link.configuredComPort}, estado ${link.tabletState})`;
    setSigwebHint(
      `${linkHint}: firma en el dispositivo; el trazo debe verse en el lienzo. Luego «Capturar trazo».`,
    );
  }, [comHint, resetCapture, stopTabletRefresh]);

  const clearTabletOnly = useCallback(() => {
    const w = getSigWebWindow();
    if (typeof w.ClearTablet === "function") {
      try {
        w.ClearTablet();
      } catch {
        /* ignore */
      }
    }
    resetCapture();
    setSigwebHint(null);
  }, [resetCapture]);

  const archivePad = useCallback(() => {
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
    setSigwebHint("Pad archivado: listo para la siguiente firma en el dispositivo.");
  }, [resetCapture, stopTabletRefresh]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!hasCapturedStroke) {
      setSigwebHint("Primero captura el trazo desde el pad.");
      return;
    }
    const name = signerName.trim();
    if (!name) {
      setSigwebHint("Escribe el nombre de la persona que firmó.");
      return;
    }

    const formData = new FormData();
    formData.set("minute_id", minuteId);
    formData.set("signature_svg", svg);
    formData.set("signer_display_name", name);

    startTransition(async () => {
      try {
        await registerSignatureAction(formData);
        resetCapture();
        const canvas = document.getElementById(SIGWEB_CANVAS_ID) as HTMLCanvasElement | null;
        const ctx = canvas?.getContext("2d");
        if (canvas && ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        setSigwebHint("Firma registrada. Activa el pad de nuevo para la siguiente persona.");
      } catch (err) {
        setSigwebHint(err instanceof Error ? err.message : "No se pudo registrar la firma.");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <details className="group border-border bg-muted/30 rounded-lg border text-xs">
        <summary className="text-foreground cursor-pointer list-none px-3 py-2 font-medium marker:content-none [&::-webkit-details-marker]:hidden">
          <span className="inline-flex items-center gap-2">
            Configuración del pad (Topaz / SigWeb)
            <span className="text-muted-foreground font-normal group-open:hidden">— mostrar</span>
          </span>
        </summary>
        <div className="text-muted-foreground space-y-2 border-t px-3 py-2">
          <p>
            Modo: <strong className="text-foreground">{tabletKind.toUpperCase()}</strong> (
            <code className="bg-background rounded px-1">NEXT_PUBLIC_TOPAZ_TABLET_KIND</code> o{" "}
            <code className="bg-background rounded px-1">NEXT_PUBLIC_TOPAZ_MODEL</code>).
          </p>
          {tabletKind === "bsb" ? (
            <p>
              Puerto COM: <strong className="text-foreground">{comHint}</strong>.
            </p>
          ) : (
            <p>Pad HSB: conexión USB (no requiere puerto COM).</p>
          )}
          <p className="text-foreground/90">
            Flujo: activar pad → firmar → capturar trazo → nombre del firmante → confirmar.
          </p>
        </div>
      </details>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
          onClick={startTablet}
          disabled={isPending}
        >
          Activar pad de firma
        </button>
        <button
          type="button"
          className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
          onClick={clearTabletOnly}
          disabled={isPending}
        >
          Limpiar borrador
        </button>
        <button
          type="button"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
          onClick={refreshPointCount}
          disabled={isPending}
        >
          Comprobar puntos
        </button>
        <button
          type="button"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          onClick={captureFromPad}
          disabled={isPending}
        >
          Capturar trazo
        </button>
        <button
          type="button"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          onClick={archivePad}
          disabled={isPending}
        >
          Archivar pad
        </button>
      </div>

      {scriptUrl ? (
        <div className="relative">
          {captureToast ? (
            <div
              role="status"
              aria-live="polite"
              className="pointer-events-none absolute -top-3 right-3 z-10 flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 shadow-sm dark:border-green-900/60 dark:bg-green-950/80 dark:text-green-300"
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              {captureToast}
            </div>
          ) : null}
          <div className="border-muted-foreground/30 overflow-hidden rounded-lg border bg-white">
            <canvas id={SIGWEB_CANVAS_ID} width="500" height="200" className="block max-w-full" />
          </div>
        </div>
      ) : (
        <p className="text-muted-foreground text-xs">
          Define NEXT_PUBLIC_TOPAZ_SIGWEB_SCRIPT_URL para mostrar el lienzo conectado a SigWeb.
        </p>
      )}

      {pointCount != null ? (
        <p className="text-muted-foreground text-xs">
          Puntos en SigWeb: <strong className="text-foreground">{pointCount}</strong>
          {pointCount === 0 ? " — activa el pad y firma en el dispositivo." : ""}
        </p>
      ) : null}

      {sigwebHint ? <p className="text-muted-foreground text-xs">{sigwebHint}</p> : null}

      {hasCapturedStroke ? (
        <>
          <div className="space-y-1">
            <p className="text-muted-foreground text-xs font-medium">Vista previa capturada</p>
            <div
              className="border-border flex min-h-[100px] items-center justify-center overflow-auto rounded-lg border bg-white p-2 [&_svg]:max-h-[160px] [&_svg]:max-w-full"
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="signer_display_name">Nombre del firmante</Label>
            <Input
              id="signer_display_name"
              name="signer_display_name"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder="Ej. Juan Pérez"
              className={fieldClass}
              autoComplete="name"
              disabled={isPending}
              required
            />
            <p className="text-muted-foreground text-xs">
              Este nombre aparecerá en «Firmas registradas» junto al trazo.
            </p>
          </div>

          <button type="submit" className={cn(buttonVariants())} disabled={isPending}>
            {isPending ? "Guardando…" : "Confirmar firma"}
          </button>
        </>
      ) : (
        <p className="text-muted-foreground text-xs">
          Tras capturar el trazo podrás indicar el nombre y confirmar la firma.
        </p>
      )}
    </form>
  );
}
