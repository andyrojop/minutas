import PDFDocument from "pdfkit";
import type PDFKit from "pdfkit";

import { extractSignaturePng } from "@/lib/minute-pdf/extract-signature-png";
import type { MinutePdfInput } from "@/lib/minute-pdf/types";
import type { SignatureRow } from "@/types/database";

const MARGIN = 44;
const PAGE_W = 612;
const CONTENT_W = PAGE_W - MARGIN * 2;

const FONT_DISPLAY = 13;
const FONT_SECTION = 9.5;
const FONT_BODY = 9.5;
const FONT_SMALL = 8.5;
const FONT_TINY = 7.5;

const C_NAVY = "#1B3A6B";
const C_GOLD = "#B8942A";
const C_WHITE = "#FFFFFF";
const C_BODY = "#1A1A1A";
const C_MUTED = "#5C6575";
const C_BORDER = "#AABBCC";
const C_ROW = "#EFF2F8";

const ORG_LINE_1 = "Gobierno de la República de Guatemala";
const ORG_LINE_2 = "Ministerio de Gobernación";
const UNIT_NAME = "SUBDIRECCIÓN GENERAL DE TECNOLOGÍAS\nDE LA INFORMACIÓN Y LA COMUNICACIÓN";
const CLOSING = "Reiterando mis muestras de subordinación y respeto.";

const STATUS_ES: Record<string, string> = {
  en_progreso: "En Progreso",
  cumplido: "Cumplido",
  pendiente: "Pendiente",
  completado: "Completado",
  cancelado: "Cancelado",
  en_revision: "En Revisión",
};

function signerLabel(sig: SignatureRow): string {
  return (
    sig.signer_display_name?.trim() ||
    (typeof sig.metadata?.signer_display_name === "string"
      ? sig.metadata.signer_display_name.trim()
      : "") ||
    sig.signer_email?.trim() ||
    "Firmante"
  );
}

function formatMeetingDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-GT", {
    timeZone: "America/Guatemala",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function minuteDocumentNumber(minuteId: string, createdAt: string | null): string {
  const year = createdAt ? new Date(createdAt).getFullYear() : new Date().getFullYear();
  const short = minuteId.replace(/-/g, "").slice(0, 4).toUpperCase();
  return `No. ${short}-${year}`;
}

function statusEs(raw: string): string {
  return STATUS_ES[raw.toLowerCase().replace(/\s+/g, "_")] ?? raw;
}

function drawSection(doc: PDFKit.PDFDocument, title: string, body: string, y: number): number {
  const x = MARGIN;
  const w = CONTENT_W;
  const headerH = 20;
  const pad = 10;
  const text = body || "—";

  // Navy header bar with white bold title
  doc.fillColor(C_NAVY).rect(x, y, w, headerH).fill();
  doc
    .fillColor(C_WHITE)
    .font("Helvetica-Bold")
    .fontSize(FONT_SECTION)
    .text(title, x, y + 5.5, { width: w, align: "center" });

  y += headerH;

  // Body: measure height, draw bordered box, render text
  doc.fillColor(C_BODY).font("Helvetica").fontSize(FONT_BODY);
  const bodyH = doc.heightOfString(text, { width: w - pad * 2 });
  const boxH = Math.max(bodyH + pad * 2, 38);

  doc.strokeColor(C_BORDER).rect(x, y, w, boxH).stroke();
  doc.fillColor(C_BODY).text(text, x + pad, y + pad, { width: w - pad * 2 });

  return y + boxH + 10;
}

function drawHeader(doc: PDFKit.PDFDocument, data: MinutePdfInput, y: number): number {
  const x = MARGIN;
  const w = CONTENT_W;
  const h = 80;
  const c1 = Math.floor(w * 0.30);
  const c2 = Math.floor(w * 0.46);
  const c3 = w - c1 - c2;

  // Outer border + column dividers
  doc.strokeColor(C_BORDER).lineWidth(1).rect(x, y, w, h).stroke();
  doc.strokeColor(C_BORDER)
    .moveTo(x + c1, y).lineTo(x + c1, y + h).stroke()
    .moveTo(x + c1 + c2, y).lineTo(x + c1 + c2, y + h).stroke();

  // Left column: let ORG_LINE_1 wrap naturally, then position ORG_LINE_2 below it
  doc.fillColor(C_NAVY).font("Helvetica-Bold").fontSize(7)
    .text(ORG_LINE_1, x + 8, y + 12, { width: c1 - 16 });
  doc.fillColor(C_MUTED).font("Helvetica").fontSize(7)
    .text(ORG_LINE_2, x + 8, doc.y + 2, { width: c1 - 16 });

  // Center column: document title and number
  const docNo = minuteDocumentNumber(data.minute.id, data.minute.created_at);
  doc.fillColor(C_NAVY).font("Helvetica-Bold").fontSize(FONT_DISPLAY)
    .text("MINUTA DE REUNIÓN", x + c1, y + 12, { width: c2, align: "center" });
  doc.fillColor(C_NAVY).font("Helvetica-Bold").fontSize(FONT_SECTION)
    .text(docNo, x + c1, y + 30, { width: c2, align: "center" });
  doc.fillColor(C_MUTED).font("Helvetica").fontSize(FONT_TINY)
    .text(UNIT_NAME, x + c1, y + 48, { width: c2, align: "center" });

  // Right column: folio + unit acronym
  doc.fillColor(C_MUTED).font("Helvetica").fontSize(FONT_SMALL)
    .text(`Folio ${String(data.minute.version ?? 1).padStart(2, "0")}`, x + c1 + c2 + 6, y + 12, {
      width: c3 - 12,
      align: "right",
    });
  doc.fillColor(C_NAVY).font("Helvetica-Bold").fontSize(11)
    .text("SGTIC", x + c1 + c2 + 6, y + 56, { width: c3 - 12, align: "right" });

  // Gold accent line at bottom of header
  y += h;
  doc.strokeColor(C_GOLD).lineWidth(2).moveTo(x, y).lineTo(x + w, y).stroke();
  doc.lineWidth(1).strokeColor(C_BORDER);

  return y + 10;
}

function drawMetaGrid(doc: PDFKit.PDFDocument, data: MinutePdfInput, y: number): number {
  const x = MARGIN;
  const w = CONTENT_W;
  const rowH = 36;
  const half = w / 2;
  const pad = 8;
  const labelW = 100;
  const content = (data.minute.content ?? {}) as Record<string, unknown>;
  const tipoEvento =
    String(content.tipo_evento ?? "Técnica de trabajo").trim() || "Técnica de trabajo";
  const meeting = data.meeting;
  const fecha = formatMeetingDateTime(meeting?.scheduled_at ?? null);

  const drawMetaRow = (
    ll: string, lv: string,
    rl: string, rv: string,
    ry: number, alt: boolean,
  ) => {
    if (alt) doc.fillColor(C_ROW).rect(x, ry, w, rowH).fill();
    doc.strokeColor(C_BORDER).rect(x, ry, w, rowH).stroke();
    doc.moveTo(x + half, ry).lineTo(x + half, ry + rowH).stroke();

    const ty = ry + 13;

    // Left cell: bold label then regular value
    doc.fillColor(C_NAVY).font("Helvetica-Bold").fontSize(FONT_SMALL)
      .text(ll + ":", x + pad, ty, { width: labelW, lineBreak: false });
    doc.fillColor(C_BODY).font("Helvetica").fontSize(FONT_SMALL)
      .text(lv, x + pad + labelW, ty, { width: half - pad * 2 - labelW });

    // Right cell: bold label then regular value
    doc.fillColor(C_NAVY).font("Helvetica-Bold").fontSize(FONT_SMALL)
      .text(rl + ":", x + half + pad, ty, { width: labelW, lineBreak: false });
    doc.fillColor(C_BODY).font("Helvetica").fontSize(FONT_SMALL)
      .text(rv, x + half + pad + labelW, ty, { width: half - pad * 2 - labelW });
  };

  drawMetaRow("Tipo de Evento", tipoEvento, "Fecha y Hora", fecha, y, false);
  y += rowH;
  drawMetaRow(
    "Nombre del Evento", meeting?.title?.trim() || "—",
    "Lugar", meeting?.location?.trim() || "—",
    y, true,
  );
  y += rowH;

  return y + 10;
}

function buildAcuerdosText(data: MinutePdfInput): string {
  const content = (data.minute.content ?? {}) as Record<string, unknown>;
  const acuerdos = String(content.acuerdos ?? "").trim();
  const parts: string[] = [];
  if (acuerdos) parts.push(acuerdos);
  if (data.commitments.length > 0) {
    const bullets = data.commitments
      .map((c) => {
        const desc = c.description?.trim() || "Compromiso";
        const status = c.status ? `  [${statusEs(c.status)}]` : "";
        return `• ${desc}${status}`;
      })
      .join("\n");
    parts.push(bullets);
  }
  return parts.join("\n\n").trim() || "—";
}

function drawSignatures(
  doc: PDFKit.PDFDocument,
  entries: Array<{ sig: SignatureRow; png: Buffer | null }>,
  startY: number,
): number {
  if (entries.length === 0) return startY;

  const x = MARGIN;
  const w = CONTENT_W;
  const cols = 3;
  const colW = w / cols;
  const sigImgW = Math.min(colW - 32, 128);
  const sigImgH = 48;
  const rowBlockH = sigImgH + 56;

  let rowY = startY;
  let col = 0;

  const ensureRowFits = () => {
    if (rowY + rowBlockH > doc.page.height - MARGIN) {
      doc.addPage();
      rowY = MARGIN;
    }
  };

  for (const { sig, png } of entries) {
    if (col === 0) ensureRowFits();

    const cellX = x + col * colW;
    const centerX = cellX + colW / 2;
    const name = signerLabel(sig);

    if (png) {
      try {
        doc.image(png, centerX - sigImgW / 2, rowY, { fit: [sigImgW, sigImgH] });
      } catch { /* fall through to blank space */ }
    }

    // Single underline beneath signature/image area
    doc.strokeColor(C_NAVY)
      .moveTo(cellX + 20, rowY + sigImgH + 4)
      .lineTo(cellX + colW - 20, rowY + sigImgH + 4)
      .stroke();

    doc.fillColor(C_BODY).font("Helvetica-Bold").fontSize(FONT_SMALL)
      .text(name, cellX + 6, rowY + sigImgH + 14, { width: colW - 12, align: "center" });

    col += 1;
    if (col >= cols) {
      col = 0;
      rowY += rowBlockH;
    }
  }

  if (col > 0) rowY += rowBlockH;
  return rowY + 8;
}

export async function buildMinutePdfBuffer(data: MinutePdfInput): Promise<Buffer> {
  // Pre-resolve all signature images before opening the PDF stream
  const signatureEntries = await Promise.all(
    data.signatures.map(async (sig) => ({
      sig,
      png: await extractSignaturePng(sig.signature_svg),
    })),
  );

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "LETTER", margin: MARGIN, autoFirstPage: true });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const content = (data.minute.content ?? {}) as Record<string, unknown>;
    const agenda = String(content.agenda ?? "").trim();
    const desarrollo = String(content.desarrollo ?? "").trim();
    const observaciones = String(content.observaciones ?? "").trim();
    const participantes =
      data.participantLabels.length > 0
        ? data.participantLabels.map((p) => `• ${p}`).join("\n")
        : "—";

    let y = MARGIN;

    y = drawHeader(doc, data, y);
    y = drawMetaGrid(doc, data, y);
    y = drawSection(doc, "PARTICIPANTES", participantes, y);
    y = drawSection(doc, "DESCRIPCIÓN", agenda || "—", y);
    y = drawSection(doc, "DESARROLLO DE ACTIVIDADES", desarrollo || "—", y);
    y = drawSection(doc, "ACUERDOS", buildAcuerdosText(data), y);

    if (observaciones) {
      y = drawSection(doc, "OBSERVACIONES", observaciones, y);
    }

    if (y > doc.page.height - MARGIN - 140) {
      doc.addPage();
      y = MARGIN;
    }

    y += 16;
    doc.fillColor(C_MUTED).font("Helvetica-Oblique").fontSize(FONT_BODY)
      .text(CLOSING, MARGIN, y, { width: CONTENT_W, align: "center" });
    y += 36;

    drawSignatures(doc, signatureEntries, y);

    doc.end();
  });
}
