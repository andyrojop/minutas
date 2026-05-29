/** Extrae PNG embebido en SVG generado por Topaz (data:image/png;base64,...). */
export function extractPngBufferFromSignatureSvg(svg: string | null | undefined): Buffer | null {
  if (!svg || typeof svg !== "string") return null;
  const match = svg.match(/data:image\/png;base64,([A-Za-z0-9+/=]+)/i);
  if (!match?.[1]) return null;
  try {
    const buf = Buffer.from(match[1], "base64");
    return buf.length > 50 ? buf : null;
  } catch {
    return null;
  }
}
