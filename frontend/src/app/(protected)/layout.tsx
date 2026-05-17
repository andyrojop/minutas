import { redirect } from "next/navigation";

import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { adminRequiresAal2 } from "@/lib/env";
import { isJwtAal2 } from "@/lib/jwt-aal";
import { getMyRole } from "@/lib/session-role";
import { getSession } from "@/lib/auth/get-session";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session?.user || session.error === "RefreshAccessTokenError") {
    redirect("/login");
  }

  const email = session.user.email ?? null;
  const role = await getMyRole();

  if (role === "admin" && adminRequiresAal2()) {
    if (!isJwtAal2(session.accessToken)) {
      redirect("/account/mfa");
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar email={email} role={role} />
      <SidebarInset>
        <SiteHeader email={email} />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-5 sm:py-10">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
