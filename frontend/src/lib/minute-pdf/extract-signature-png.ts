import { Resvg } from "@resvg/resvg-js";

/** Extrae PNG embebido en SVG de Topaz, o renderiza el SVG vectorial a PNG. */
export async function extractSignaturePng(svg: string | null | undefined): Promise<Buffer | null> {
  if (!svg || typeof svg !== "string") return null;

  // Fast path: Topaz embeds a PNG inside the SVG as data:image/png;base64
  const match = svg.match(/data:image\/png;base64,([A-Za-z0-9+/=]+)/i);
  if (match?.[1]) {
    try {
      const buf = Buffer.from(match[1], "base64");
      if (buf.length > 50) return buf;
    } catch {
      // fall through to SVG render
    }
  }

  // Fallback: render the vector SVG to PNG via resvg (WebAssembly, no native deps)
  try {
    const resvg = new Resvg(svg, {
      fitTo: { mode: "width", value: 400 },
      font: { loadSystemFonts: false },
    });
    const png = resvg.render();
    const buf = Buffer.from(png.asPng());
    return buf.length > 50 ? buf : null;
  } catch {
    return null;
  }
}
