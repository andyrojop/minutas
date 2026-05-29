import PDFDocument from "pdfkit";
import type PDFKit from "pdfkit";

import { extractPngBufferFromSignatureSvg } from "@/lib/minute-pdf/extract-signature-png";
import type { MinutePdfInput } from "@/lib/minute-pdf/types";
import type { SignatureRow } from "@/types/database";

const MARGIN = 40;
const PAGE_W = 612;
const CONTENT_W = PAGE_W - MARGIN * 2;
const BODY_FONT = 10;
const SMALL_FONT = 9;
const TITLE_FONT = 11;
const HEADER_FONT = 12;

const ORG_LINE_1 = "Gobierno de la República de Guatemala";
const ORG_LINE_2 = "Ministerio de Gobernación";
const UNIT_NAME =
  "SUBDIRECCIÓN GENERAL DE TECNOLOGÍAS DE LA INFORMACIÓN Y LA COMUNICACIÓN.";
const CLOSING =
  "Reiterando mis muestras de subordinación y respeto.";

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

function drawSection(
  doc: PDFKit.PDFDocument,
  title: string,
  body: string,
  y: number,
): number {
  const x = MARGIN;
  const w = CONTENT_W;
  const headerH = 22;
  const pad = 8;

  doc.rect(x, y, w, headerH).stroke();
  doc
    .font("Helvetica-Bold")
    .fontSize(TITLE_FONT)
    .text(title, x, y + 6, { width: w, align: "center" });

  y += headerH;
  doc.font("Helvetica").fontSize(BODY_FONT);
  const bodyHeight = doc.heightOfString(body || "—", { width: w - pad * 2 });
  const boxH = Math.max(bodyHeight + pad * 2, 36);

  doc.rect(x, y, w, boxH).stroke();
  doc.text(body || "—", x + pad, y + pad, { width: w - pad * 2, align: "left" });
  return y + boxH + 10;
}

function drawHeader(doc: PDFKit.PDFDocument, data: MinutePdfInput, y: number): number {
  const x = MARGIN;
  const w = CONTENT_W;
  const h = 88;
  const colW = w / 3;

  doc.rect(x, y, w, h).stroke();

  doc
    .font("Helvetica-Bold")
    .fontSize(SMALL_FONT)
    .text(ORG_LINE_1, x + 6, y + 10, { width: colW - 12 })
    .font("Helvetica")
    .text(ORG_LINE_2, x + 6, y + 24, { width: colW - 12 });

  const docNo = minuteDocumentNumber(data.minute.id, data.minute.created_at);
  doc
    .font("Helvetica-Bold")
    .fontSize(HEADER_FONT)
    .text("MINUTA DE REUNIÓN", x + colW, y + 14, { width: colW, align: "center" })
    .fontSize(TITLE_FONT)
    .text(docNo, x + colW, y + 30, { width: colW, align: "center" })
    .font("Helvetica")
    .fontSize(7.5)
    .text(UNIT_NAME, x + colW, y + 46, { width: colW, align: "center" });

  doc
    .font("Helvetica")
    .fontSize(SMALL_FONT)
    .text(`Folio ${String(data.minute.version).padStart(2, "0")}`, x + colW * 2 + 6, y + 12, {
      width: colW - 12,
      align: "right",
    })
    .font("Helvetica-Bold")
    .text("SGTIC", x + colW * 2 + 6, y + 52, { width: colW - 12, align: "right" });

  return y + h + 8;
}

function drawMetaGrid(doc: PDFKit.PDFDocument, data: MinutePdfInput, y: number): number {
  const x = MARGIN;
  const w = CONTENT_W;
  const rowH = 28;
  const half = w / 2;
  const content = (data.minute.content ?? {}) as Record<string, unknown>;
  const tipoEvento = String(content.tipo_evento ?? "Técnica de trabajo").trim() || "Técnica de trabajo";
  const meeting = data.meeting;

  doc.rect(x, y, w, rowH).stroke();
  doc.rect(x, y, half, rowH).stroke();
  doc
    .font("Helvetica")
    .fontSize(BODY_FONT)
    .text(`Tipo de Evento: ${tipoEvento}`, x + 8, y + 9, { width: half - 16 });

  const fecha = formatMeetingDateTime(meeting?.scheduled_at ?? null);
  doc.text(`Fecha y Hora: Guatemala, ${fecha}`, x + half + 8, y + 9, { width: half - 16 });

  y += rowH;
  doc.rect(x, y, w, rowH).stroke();
  doc.rect(x, y, half, rowH).stroke();
  doc.text(`Nombre del Evento: ${meeting?.title?.trim() || "—"}`, x + 8, y + 9, { width: half - 16 });
  doc.text(`Lugar: ${meeting?.location?.trim() || "—"}`, x + half + 8, y + 9, { width: half - 16 });

  return y + rowH + 10;
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
        const status = c.status ? ` (${c.status})` : "";
        return `• ${desc}${status}`;
      })
      .join("\n");
    parts.push(bullets);
  }
  return parts.join("\n\n").trim() || "—";
}

function drawSignatures(
  doc: PDFKit.PDFDocument,
  signatures: SignatureRow[],
  startY: number,
): number {
  if (signatures.length === 0) return startY;

  const x = MARGIN;
  const w = CONTENT_W;
  const cols = 3;
  const colW = w / cols;
  const sigImgW = Math.min(colW - 24, 140);
  const sigImgH = 48;
  const rowBlockH = sigImgH + 36;

  let rowY = startY;
  let col = 0;

  const ensureRowFits = () => {
    if (rowY + rowBlockH > doc.page.height - MARGIN) {
      doc.addPage();
      rowY = MARGIN;
    }
  };

  for (const sig of signatures) {
    if (col === 0) ensureRowFits();

    const cellX = x + col * colW;
    const centerX = cellX + colW / 2;
    const name = signerLabel(sig);
    const png = extractPngBufferFromSignatureSvg(sig.signature_svg);

    if (png) {
      try {
        doc.image(png, centerX - sigImgW / 2, rowY, { fit: [sigImgW, sigImgH] });
      } catch {
        doc
          .moveTo(cellX + 16, rowY + sigImgH / 2)
          .lineTo(cellX + colW - 16, rowY + sigImgH / 2)
          .stroke();
      }
    } else {
      doc
        .moveTo(cellX + 16, rowY + sigImgH / 2)
        .lineTo(cellX + colW - 16, rowY + sigImgH / 2)
        .stroke();
    }

    doc
      .font("Helvetica")
      .fontSize(SMALL_FONT)
      .text(name, cellX + 8, rowY + sigImgH + 8, { width: colW - 16, align: "center" });

    col += 1;
    if (col >= cols) {
      col = 0;
      rowY += rowBlockH;
    }
  }

  if (col > 0) rowY += rowBlockH;
  return rowY + 8;
}

export function buildMinutePdfBuffer(data: MinutePdfInput): Promise<Buffer> {
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
        ? data.participantLabels.join(", ")
        : "—";

    let y = MARGIN;

    y = drawHeader(doc, data, y);
    y = drawMetaGrid(doc, data, y);
    y = drawSection(doc, "PARTICIPANTES", `Participantes: ${participantes}`, y);
    y = drawSection(doc, "DESCRIPCIÓN", agenda || "—", y);
    y = drawSection(doc, "DESARROLLO DE ACTIVIDADES", desarrollo || "—", y);
    y = drawSection(doc, "ACUERDOS", buildAcuerdosText(data), y);

    if (observaciones) {
      y = drawSection(doc, "OBSERVACIONES", observaciones, y);
    }

    if (y > doc.page.height - MARGIN - 120) {
      doc.addPage();
      y = MARGIN;
    }

    doc
      .font("Helvetica")
      .fontSize(BODY_FONT)
      .text(CLOSING, MARGIN, y, { width: CONTENT_W, align: "center" });
    y += 28;

    y = drawSignatures(doc, data.signatures, y);

    doc.end();
  });
}
