import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/get-session";
import { buildMinutePdfBuffer } from "@/lib/minute-pdf/build-minute-pdf";
import { gatherMinutePdfData } from "@/lib/minute-pdf/gather-minute-pdf-data";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

function safeFilename(title: string | undefined, minuteId: string): string {
  const base =
    title
      ?.normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || `minuta-${minuteId.slice(0, 8)}`;
  return `${base}.pdf`;
}

export async function GET(_request: Request, { params }: Params) {
  const session = await getSession();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { id } = await params;

  try {
    const data = await gatherMinutePdfData(id);
    const pdf = await buildMinutePdfBuffer(data);
    const filename = safeFilename(data.meeting?.title, id);

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "No se pudo generar el PDF.";
    const status = message.includes("no encontrada") || message.includes("404") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
