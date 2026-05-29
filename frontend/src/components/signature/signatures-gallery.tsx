import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SignatureRow } from "@/types/database";

type Props = {
  signatures: SignatureRow[];
};

function isLikelySvg(s: string | null): boolean {
  if (!s || typeof s !== "string") return false;
  const t = s.trim().toLowerCase();
  return t.startsWith("<svg") || t.includes("<svg");
}

export function SignaturesGallery({ signatures }: Props) {
  if (signatures.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Firmas</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Firmas</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {signatures.map((sig, index) => {
            const label =
              sig.signer_display_name?.trim() ||
              (typeof sig.metadata?.signer_display_name === "string"
                ? sig.metadata.signer_display_name.trim()
                : "") ||
              sig.signer_email?.trim() ||
              (sig.signer_id ? `${sig.signer_id.slice(0, 8)}…` : "Firmante");
            const when = sig.signed_at
              ? new Date(sig.signed_at).toLocaleString("es-GT", {
                  dateStyle: "short",
                  timeStyle: "short",
                })
              : "—";
            const raw = sig.signature_svg?.trim() ?? "";
            const showSvg = isLikelySvg(raw);

            return (
              <div
                key={sig.id}
                className="border-border flex flex-col overflow-hidden rounded-lg border bg-card shadow-xs"
              >
                <div className="border-b px-3 py-2">
                  <p className="text-foreground text-sm font-medium leading-tight" title={label}>
                    {label}
                  </p>
                  <p className="text-muted-foreground mt-0.5 text-[11px]">
                    #{index + 1} · {when}
                  </p>
                </div>
                <div className="bg-white p-2">
                  {showSvg ? (
                    <div
                      className="flex min-h-[120px] max-h-[200px] items-center justify-center overflow-auto [&_svg]:max-h-[180px] [&_svg]:max-w-full"
                      dangerouslySetInnerHTML={{ __html: raw }}
                    />
                  ) : (
                    <p className="text-muted-foreground text-center text-xs">Sin vista previa de trazo</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
