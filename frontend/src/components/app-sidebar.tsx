"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CalendarDays,
  CheckSquare,
  LayoutDashboard,
  ListChecks,
  NotebookPen,
  Settings,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { NavUser } from "@/components/nav-user";
import {
  canManageSystemSettings,
  canManageUsers,
  canSeeMyCommitmentsNav,
  canSeeOrgCommitmentsNav,
  canViewAudit,
  canViewReports,
} from "@/lib/roles";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  visible: (role: string | null) => boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Inicio", icon: LayoutDashboard, visible: () => true },
  { href: "/meetings", label: "Reuniones", icon: CalendarDays, visible: () => true },
  { href: "/commitments", label: "Compromisos", icon: ListChecks, visible: canSeeOrgCommitmentsNav },
  { href: "/my-commitments", label: "Mis compromisos", icon: CheckSquare, visible: canSeeMyCommitmentsNav },
  { href: "/reports", label: "Reportes", icon: BarChart3, visible: canViewReports },
  { href: "/audit", label: "Auditoría", icon: ShieldCheck, visible: canViewAudit },
  { href: "/settings", label: "Configuración", icon: Settings, visible: canManageSystemSettings },
  { href: "/users", label: "Usuarios", icon: Users, visible: canManageUsers },
];

function navActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/";
  if (pathname === href) return true;
  return pathname.startsWith(`${href}/`);
}

type Props = {
  email: string | null;
  role: string | null;
};

export function AppSidebar({ email, role }: Props) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => item.visible(role));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/dashboard" />}>
              <div className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg">
                <NotebookPen className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">Gestión de minutas</span>
                <span className="text-muted-foreground truncate text-xs">
                  Reuniones y compromisos
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Plataforma</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const Icon = item.icon;
                const active = navActive(pathname, item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={active}
                      tooltip={item.label}
                      render={<Link href={item.href} />}
                    >
                      <Icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <NavUser email={email} role={role} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
