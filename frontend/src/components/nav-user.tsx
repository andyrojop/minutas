"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initialsFromEmail } from "@/lib/initials";
import { roleLabel } from "@/lib/roles";

type Props = {
  email: string | null;
  role: string | null;
};

export function NavUser({ email, role }: Props) {
  const displayEmail = email ?? "Usuario";
  const initials = initialsFromEmail(email);

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 text-left text-sm">
      <Avatar className="size-8 rounded-lg">
        <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
      </Avatar>
      <div className="grid flex-1 leading-tight group-data-[collapsible=icon]:hidden">
        <span className="truncate font-medium">{displayEmail}</span>
        <span className="text-muted-foreground truncate text-xs">{roleLabel(role)}</span>
      </div>
    </div>
  );
}
