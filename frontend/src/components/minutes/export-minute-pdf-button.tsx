import Link from "next/link";
import { Download } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  minuteId: string;
  className?: string;
};

export function ExportMinutePdfButton({ minuteId, className }: Props) {
  return (
    <Link
      href={`/api/minutes/${minuteId}/pdf`}
      prefetch={false}
      className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-2", className)}
      download
    >
      <Download className="size-4" aria-hidden />
      Exportar PDF
    </Link>
  );
}
