import {
  getTopazComPortName,
  getTopazComPortNumber,
  getTopazTabletKind,
  type TopazTabletKind,
} from "@/lib/env";

/** API global que expone SigWebTablet.js en el navegador. */
export type SigWebWindow = Window &
  Partial<{
    OpenTablet: (v: number) => void;
    CloseTablet: () => void;
    SetTabletState: (
      state: number,
      ctxOrTimer: unknown,
      tv?: number,
    ) => ReturnType<typeof setInterval> | null;
    ClearTablet: () => void;
    GetSigImageB64: (callback: (b64: string) => void) => void;
    GetSigString: () => string;
    SetTabletComPort: (port: number) => void;
    SetTabletComTest: (state: boolean) => void;
    SetTabletType: (type: number) => void;
    SetServerTabletType: (type: number) => void;
    NumberOfTabletPoints: () => number;
    GetTabletState: () => string | number;
    GetTabletComPort: () => string | number;
    IsSigWebInstalled: () => boolean;
    GetSigWebVersion: () => string;
    Reset: () => void;
  }>;

export type SigWebLinkResult = {
  refreshTimer: ReturnType<typeof setInterval> | null;
  tabletState: number;
  tabletKind: TopazTabletKind;
  configuredComPort: number | null;
  serviceComPort: string | null;
  sigWebVersion: string | null;
};

export function getSigWebWindow(): SigWebWindow {
  return window as SigWebWindow;
}

/** Puerto COM numérico para SetTabletComPort (p. ej. COM9 → 9). */
export function resolveTopazComPortNumber(): number {
  const byName = getTopazComPortName();
  if (byName) {
    const m = /^COM(\d+)$/i.exec(byName.trim());
    if (m) return Number.parseInt(m[1], 10);
  }
  return getTopazComPortNumber();
}

function parseSigWebNumber(raw: string | number | undefined | null): number {
  if (raw == null) return 0;
  const text = String(raw).trim().replace(/^["']|["']$/g, "");
  const n = Number.parseInt(text, 10);
  return Number.isFinite(n) ? n : 0;
}

export function readTabletState(w: SigWebWindow = getSigWebWindow()): number {
  if (typeof w.GetTabletState !== "function") return -1;
  try {
    return parseSigWebNumber(w.GetTabletState());
  } catch {
    return 0;
  }
}

function readServiceComPort(w: SigWebWindow): string | null {
  if (typeof w.GetTabletComPort !== "function") return null;
  try {
    const raw = String(w.GetTabletComPort()).trim();
    return raw.length > 0 ? raw : null;
  } catch {
    return null;
  }
}

function readSigWebVersion(w: SigWebWindow): string | null {
  if (typeof w.GetSigWebVersion !== "function") return null;
  try {
    const v = String(w.GetSigWebVersion()).trim();
    return v.length > 0 ? v : null;
  } catch {
    return null;
  }
}

/** Debe llamarse con SetTabletState en 0 (apagado). */
export function configureSigWebComPort(w: SigWebWindow = getSigWebWindow()): void {
  if (typeof w.SetTabletComPort !== "function") return;
  w.SetTabletComPort(resolveTopazComPortNumber());
}

function setComTestMode(w: SigWebWindow, enabled: boolean): void {
  if (typeof w.SetTabletComTest !== "function") return;
  try {
    w.SetTabletComTest(enabled);
  } catch {
    /* ignore */
  }
}

const HSB_TABLET_TYPE = 6;

function prepareBsbTablet(w: SigWebWindow): void {
  if (typeof w.SetServerTabletType === "function") {
    try {
      w.SetServerTabletType(0);
    } catch {
      /* ignore */
    }
  }
}

function prepareHsbTablet(w: SigWebWindow): void {
  if (typeof w.SetTabletType === "function") {
    try {
      w.SetTabletType(HSB_TABLET_TYPE);
    } catch {
      /* ignore */
    }
  }
}

function prepareTabletForLink(w: SigWebWindow, kind: TopazTabletKind): void {
  if (kind === "hsb") {
    prepareHsbTablet(w);
    return;
  }
  prepareBsbTablet(w);
  configureSigWebComPort(w);
}

function deactivateTablet(
  w: SigWebWindow,
  refreshTimer: ReturnType<typeof setInterval> | null,
  kind: TopazTabletKind,
): void {
  setComTestMode(w, false);
  if (typeof w.SetTabletState === "function") {
    w.SetTabletState(0, refreshTimer ?? 0, 0);
  }
  // CloseTablet es asíncrono y puede cortar la conexión USB en pads HSB.
  if (kind === "bsb" && typeof w.CloseTablet === "function") {
    try {
      w.CloseTablet();
    } catch {
      /* ignore */
    }
  }
}

/** Apaga captura y deja listo para reactivar. */
export function stopSigWebTablet(
  w: SigWebWindow,
  refreshTimer: ReturnType<typeof setInterval> | null,
): void {
  deactivateTablet(w, refreshTimer, getTopazTabletKind());
}

function activateTabletState(
  w: SigWebWindow,
  ctx: CanvasRenderingContext2D,
): ReturnType<typeof setInterval> | null {
  if (typeof w.SetTabletState !== "function") return null;
  return w.SetTabletState(1, ctx, 50);
}

function clearTabletSurface(w: SigWebWindow): void {
  if (typeof w.ClearTablet !== "function") return;
  try {
    w.ClearTablet();
  } catch {
    /* ignore */
  }
}

function openHsbTablet(w: SigWebWindow): void {
  if (typeof w.OpenTablet !== "function") return;
  try {
    w.OpenTablet(1);
  } catch {
    /* ignore */
  }
}

/** Flujo oficial T-S460-HSB-R: SetTabletType(6) → ClearTablet → SetTabletState(1). Sin ComTest ni COM. */
function linkHsbTablet(
  w: SigWebWindow,
  ctx: CanvasRenderingContext2D,
  refreshTimer: ReturnType<typeof setInterval> | null,
): SigWebLinkResult {
  const tabletKind = "hsb" as const;

  deactivateTablet(w, refreshTimer, tabletKind);
  prepareHsbTablet(w);
  openHsbTablet(w);
  clearTabletSurface(w);

  let tmr = activateTabletState(w, ctx);

  if (!tmr || readTabletState(w) === 0) {
    deactivateTablet(w, tmr, tabletKind);
    prepareHsbTablet(w);
    openHsbTablet(w);
    tmr = activateTabletState(w, ctx);
  }

  return {
    refreshTimer: tmr,
    tabletState: readTabletState(w),
    tabletKind,
    configuredComPort: null,
    serviceComPort: readServiceComPort(w),
    sigWebVersion: readSigWebVersion(w),
  };
}

/**
 * Enlaza el pad. BSB: COM + ComTest. HSB: USB HID sin ComTest (guía T-S460-HSB-R).
 */
export function linkSigWebTablet(
  w: SigWebWindow,
  ctx: CanvasRenderingContext2D,
  refreshTimer: ReturnType<typeof setInterval> | null,
): SigWebLinkResult {
  const tabletKind = getTopazTabletKind();
  if (tabletKind === "hsb") {
    return linkHsbTablet(w, ctx, refreshTimer);
  }

  const configuredComPort = resolveTopazComPortNumber();

  deactivateTablet(w, refreshTimer, tabletKind);

  if (typeof w.Reset === "function") {
    try {
      w.Reset();
    } catch {
      /* ignore */
    }
  }

  prepareTabletForLink(w, tabletKind);

  setComTestMode(w, false);
  setComTestMode(w, true);

  let tmr = activateTabletState(w, ctx);

  if (!tmr || readTabletState(w) === 0) {
    deactivateTablet(w, null, tabletKind);
    prepareTabletForLink(w, tabletKind);
    setComTestMode(w, true);
    tmr = activateTabletState(w, ctx);
  }

  if (!tmr || readTabletState(w) === 0) {
    deactivateTablet(w, null, tabletKind);
    if (typeof w.OpenTablet === "function") {
      try {
        w.OpenTablet(1);
      } catch {
        /* ignore */
      }
    }
    if (typeof w.SetTabletState === "function") {
      w.SetTabletState(0, 0, 0);
    }
    prepareTabletForLink(w, tabletKind);
    setComTestMode(w, true);
    tmr = activateTabletState(w, ctx);
  }

  setComTestMode(w, false);

  return {
    refreshTimer: tmr,
    tabletState: readTabletState(w),
    tabletKind,
    configuredComPort,
    serviceComPort: readServiceComPort(w),
    sigWebVersion: readSigWebVersion(w),
  };
}

/** @deprecated Usar linkSigWebTablet */
export function startSigWebTablet(
  w: SigWebWindow,
  ctx: CanvasRenderingContext2D,
  refreshTimer: ReturnType<typeof setInterval> | null,
): ReturnType<typeof setInterval> | null {
  return linkSigWebTablet(w, ctx, refreshTimer).refreshTimer;
}

export function readTabletPointCount(w: SigWebWindow = getSigWebWindow()): number {
  if (typeof w.NumberOfTabletPoints !== "function") return 0;
  try {
    const n = Number(w.NumberOfTabletPoints());
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

export function isSigWebServiceReachable(w: SigWebWindow = getSigWebWindow()): boolean {
  if (typeof w.IsSigWebInstalled !== "function") return true;
  try {
    return w.IsSigWebInstalled();
  } catch {
    return false;
  }
}

/** SVG con imagen PNG embebida (compatible con vista previa y almacenamiento). */
export function buildSignatureSvgFromPngBase64(
  b64: string,
  width: number,
  height: number,
): string {
  const dataUri = `data:image/png;base64,${b64}`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ` +
    `width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<image xlink:href="${dataUri}" href="${dataUri}" width="${width}" height="${height}"/>` +
    `</svg>`
  );
}

function tryReadSigStringSvg(w: SigWebWindow): string | null {
  if (typeof w.GetSigString !== "function") return null;
  try {
    const raw = w.GetSigString()?.trim() ?? "";
    if (raw.includes("<svg") || (raw.startsWith("<") && raw.includes(">"))) {
      return raw;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function fetchSigImageBase64(w: SigWebWindow): Promise<string | null> {
  return new Promise((resolve) => {
    if (typeof w.GetSigImageB64 !== "function") {
      resolve(null);
      return;
    }
    const timeout = setTimeout(() => resolve(null), 10_000);
    try {
      w.GetSigImageB64((b64: string) => {
        clearTimeout(timeout);
        const clean = (b64 ?? "").trim();
        resolve(clean.length > 100 ? clean : null);
      });
    } catch {
      clearTimeout(timeout);
      resolve(null);
    }
  });
}

function canvasHasVisibleInk(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return false;
  const { width, height } = canvas;
  if (width === 0 || height === 0) return false;
  const { data } = ctx.getImageData(0, 0, width, height);
  for (let i = 0; i < data.length; i += 16) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    if (a > 16 && (r < 240 || g < 240 || b < 240)) return true;
  }
  return false;
}

/** Captura el lienzo visible (mismo trazo que ve el usuario). */
export function captureSignatureSvgFromCanvas(canvas: HTMLCanvasElement): string | null {
  if (!canvasHasVisibleInk(canvas)) return null;
  try {
    const b64 = canvas.toDataURL("image/png").replace(/^data:image\/png;base64,/, "");
    if (b64.length < 100) return null;
    return buildSignatureSvgFromPngBase64(b64, canvas.width, canvas.height);
  } catch {
    return null;
  }
}

/**
 * Captura la firma sin apagar el pad antes (apagar vacía SigImage en el servicio).
 * Orden: SigString → GetSigImageB64 → canvas visible.
 */
export async function captureSignatureSvg(
  w: SigWebWindow,
  canvas: HTMLCanvasElement | null,
): Promise<string | null> {
  const sigString = tryReadSigStringSvg(w);
  if (sigString) return sigString;

  const b64 = await fetchSigImageBase64(w);
  if (b64) {
    const wImg = canvas?.width ?? 500;
    const hImg = canvas?.height ?? 200;
    return buildSignatureSvgFromPngBase64(b64, wImg, hImg);
  }

  if (canvas) {
    return captureSignatureSvgFromCanvas(canvas);
  }

  return null;
}

export function formatSigWebLinkFailure(result: SigWebLinkResult): string {
  const parts = [
    `No se pudo enlazar el pad (estado ${result.tabletState}, modo ${result.tabletKind.toUpperCase()}).`,
  ];
  if (result.tabletKind === "bsb" && result.configuredComPort != null) {
    parts.push(`COM configurado: ${result.configuredComPort}.`);
    if (result.serviceComPort != null) {
      parts.push(`SigWeb reporta puerto: ${result.serviceComPort}.`);
    }
  }
  if (result.sigWebVersion != null) {
    parts.push(`SigWeb v${result.sigWebVersion}.`);
  }
  if (result.tabletKind === "hsb") {
    parts.push(
      "Para pads HSB (p. ej. T-S460-HSB-R): USB conectado, drivers SigWeb HSB instalados, NEXT_PUBLIC_TOPAZ_TABLET_KIND=hsb, y en %WINDOWS%\\SigPlus.ini → [Tablet] TabletType=6 (no uses COM).",
    );
  } else {
    parts.push(
      "Comprueba el COM real del Topaz, que SigWeb esté en ejecución, en %WINDOWS%\\SigPlus.ini → [Tablet] ServerTabletType=0 y TabletType=0, y hosts: 127.0.0.1 tablet.sigwebtablet.com",
    );
  }
  return parts.join(" ");
}
