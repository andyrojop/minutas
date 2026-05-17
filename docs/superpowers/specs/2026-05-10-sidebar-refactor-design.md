# Refactor del chrome: Sidebar shadcn + Header limpio + tokens de tema

**Fecha:** 2026-05-10
**Alcance:** `frontend/`
**Tipo:** Refactor de layout y limpieza de tokens (sin tocar contenido de páginas internas).

## Objetivo

Reemplazar el `AppHeader` horizontal actual por una composición `Sidebar + Header` de shadcn, con un footer que aloje el bloque de usuario, un toggle de modo claro/oscuro funcional, y limpieza de los pocos colores hardcodeados para que todo respete los tokens de `globals.css`.

## No-objetivos

- No rediseñar páginas internas (dashboard, reuniones, minutas, formularios, firmas).
- No cambiar tipografía actual (Geist Sans/Mono se mantienen).
- No tocar `lib/roles.ts` ni middleware/auth.
- No agregar breadcrumbs, títulos derivados de ruta, ni acciones por página en el header (queda como slot vacío para una iteración futura).

## Arquitectura

`(protected)/layout.tsx` queda así:

```
SidebarProvider (estado persistido en cookie, defaultOpen)
├── AppSidebar (variant="sidebar", collapsible="icon", side="left")
│   ├── SidebarHeader     → marca: icono NotebookPen + "Gestión de minutas"
│   ├── SidebarContent    → SidebarGroup "Plataforma" con items filtrados por rol
│   └── SidebarFooter     → ThemeToggle + NavUser
└── SidebarInset
    ├── SiteHeader        → SidebarTrigger + Separator vertical + slot título (vacío por ahora)
    └── <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-5 sm:py-10">
         {children}
```

`SidebarTrigger` colapsa el sidebar a iconos (con tooltip al hover). El `<main>` actual con `max-w-6xl` se preserva tal cual; solo cambia el chrome alrededor.

## Navegación e iconos (lucide-react)

Un único `SidebarGroup` con label **"Plataforma"**. Filtros de visibilidad usan `lib/roles.ts` sin modificarlo.

| Item | Ruta | Icono | Visible si |
|---|---|---|---|
| Inicio | `/dashboard` | `LayoutDashboard` | siempre |
| Reuniones | `/meetings` | `CalendarDays` | siempre |
| Compromisos | `/commitments` | `ListChecks` | `canSeeOrgCommitmentsNav(role)` |
| Mis compromisos | `/my-commitments` | `CheckSquare` | `canSeeMyCommitmentsNav(role)` |
| Reportes | `/reports` | `BarChart3` | `canViewReports(role)` |
| Auditoría | `/audit` | `ShieldCheck` | `canViewAudit(role)` |
| Configuración | `/settings` | `Settings` | `canManageSystemSettings(role)` |
| Usuarios | `/users` | `Users` | `canManageUsers(role)` |

`SidebarMenuButton` recibe `isActive` calculado con `usePathname()` usando la misma lógica que `navActive` de `app-header.tsx` actual:

```ts
function navActive(pathname, href) {
  if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
```

## Footer del sidebar

**ThemeToggle** (`src/components/theme-toggle.tsx`)
- Botón con icono `Sun`/`Moon` (alternados por tema actual) que abre `DropdownMenu` con: Claro / Oscuro / Sistema.
- Implementado con `next-themes`. En modo colapsado del sidebar muestra solo el icono con tooltip.

**NavUser** (`src/components/nav-user.tsx`)
- `SidebarMenuButton` `size="lg"` con: avatar circular (iniciales del email como fallback) + email (línea 1) + rol traducido vía `roleLabel(role)` (línea 2 pequeña).
- Click abre `DropdownMenu` (lado `right` cuando expandido, `top` cuando colapsado) con:
  - "Configurar MFA" → navega a `/account/mfa`
  - separador
  - "Cerrar sesión" → `supabase.auth.signOut()` + `router.push("/login")` + `router.refresh()` (idéntico al `handleSignOut` actual de `app-header.tsx`).
- En modo colapsado solo se ve el avatar.

`AppSidebar` recibe `email: string | null` y `role: string | null` como props desde el server component `(protected)/layout.tsx` (mismo patrón de hoy).

## Identidad visual: tokens

Modificación de `src/app/globals.css`. Se agrega un **acento azul institucional** y un **token semántico de éxito** (para reemplazar los verdes hardcodeados de los banners).

```css
:root {
  --primary: oklch(0.55 0.16 250);
  --primary-foreground: oklch(0.985 0 0);
  --ring: oklch(0.55 0.16 250);
  --sidebar-primary: oklch(0.55 0.16 250);
  --sidebar-ring: oklch(0.55 0.16 250);

  --success: oklch(0.62 0.14 150);
  --success-foreground: oklch(0.985 0 0);
}

.dark {
  --primary: oklch(0.7 0.14 250);
  --primary-foreground: oklch(0.145 0 0);
  --ring: oklch(0.7 0.14 250);
  --sidebar-primary: oklch(0.7 0.14 250);
  --sidebar-ring: oklch(0.7 0.14 250);

  --success: oklch(0.72 0.14 150);
  --success-foreground: oklch(0.145 0 0);
}
```

Y dentro de `@theme inline`:
```css
--color-success: var(--success);
--color-success-foreground: var(--success-foreground);
```

Tipografía: Geist Sans + Geist Mono, sin cambios. No se agrega `font-mono` a metadatos en este refactor.

## Limpieza de estilos hardcodeados

Audit completo (`grep` de clases Tailwind con paleta cruda y de literales hex en `frontend/src`):

| Archivo | Línea | Estado | Acción |
|---|---|---|---|
| `app/(protected)/users/page.tsx` | 53 | banner éxito verde | migrar a `border-success/30 bg-success/10 text-success-foreground` |
| `app/(protected)/minutes/[id]/page.tsx` | 159 | banner éxito emerald | migrar a `border-success/30 bg-success/10 text-success-foreground` |
| `app/account/mfa/mfa-setup-form.tsx` | 157 | `bg-white` en QR TOTP | **preservar** (intencional: QR necesita fondo blanco para escaneo) |
| `components/signature/topaz-signature-form.tsx` | 248 | `bg-white` en pad de firma | **preservar** (intencional: superficie de firma) |
| `components/signature/signatures-gallery.tsx` | 67 | `bg-white` en visor de firmas | **preservar** (intencional: firmas se renderizan sobre blanco) |

No hay literales hex en TS/TSX. No hay otros usos de paleta cruda Tailwind.

## Modo claro/oscuro

- `ThemeProvider` (wrapper de `next-themes`) envuelve `<body>` en `src/app/layout.tsx` con `attribute="class"`, `defaultTheme="system"`, `enableSystem`, `disableTransitionOnChange`.
- Se agrega `suppressHydrationWarning` al `<html>` (requerido por `next-themes` para evitar warnings de hydration).
- El sidebar y header consumen únicamente tokens (`--sidebar-*`, `--background`, `--foreground`, `--border`, `--primary`, `--muted`). Cero clases condicionadas a tema.
- Sin flash de tema al primer paint (lo resuelve `next-themes` con su script inline).

## Componentes shadcn a instalar

Vía `npx shadcn@latest add` (o equivalente). Los nombres pueden traer dependencias transitorias (Sheet, Tooltip, Skeleton):

- `sidebar`
- `avatar`
- `tooltip`
- `sheet`

## Nueva dependencia npm

- `next-themes` (workspace `frontend/`)

## Archivos

**Nuevos:**
- `src/components/app-sidebar.tsx` — client component, recibe `email`, `role`. Header de marca + grupo "Plataforma" filtrado por rol + footer.
- `src/components/site-header.tsx` — client component: `SidebarTrigger` + `Separator` vertical + slot `children?` para título futuro.
- `src/components/nav-user.tsx` — bloque usuario en footer.
- `src/components/theme-toggle.tsx` — toggle Sun/Moon con dropdown 3 opciones.
- `src/components/theme-provider.tsx` — wrapper client de `next-themes`.
- (Auto-generados por shadcn) `src/components/ui/sidebar.tsx`, `avatar.tsx`, `tooltip.tsx`, `sheet.tsx`, `skeleton.tsx` (los que no existan).

**Modificados:**
- `src/app/layout.tsx` — envuelve `<body>` con `ThemeProvider`. Añade `suppressHydrationWarning` al `<html>`.
- `src/app/(protected)/layout.tsx` — reemplaza `AppHeader` por `SidebarProvider + AppSidebar + SidebarInset(SiteHeader + main)`. Quita `bg-muted/20`.
- `src/app/globals.css` — actualiza `--primary`, `--ring`, `--sidebar-primary`, `--sidebar-ring` (claro y oscuro). Agrega `--success` / `--success-foreground` y los expone en `@theme inline`.
- `src/app/(protected)/users/page.tsx:53` — banner verde a tokens `success`.
- `src/app/(protected)/minutes/[id]/page.tsx:159` — banner emerald a tokens `success`.
- `frontend/package.json` — agrega `next-themes` (y lo que añada `npx shadcn add`).

**Eliminados:**
- `src/components/app-header.tsx` — sustituido por sidebar + site-header.

**Sin cambios:**
- Todas las páginas internas, server actions, lib, types, middleware, supabase clients, auth, MFA, firmas.

## Verificación

- `npm run verify` (workspace raíz: lint + typecheck en frontend y backend) pasa sin errores.
- `npm run dev:frontend` arranca y se prueba manualmente:
  - Modo claro y oscuro (con toggle en footer del sidebar).
  - Colapso/expansión del sidebar; persistencia entre recargas vía cookie.
  - Navegación visible por rol (login con `secretary` y `admin` para validar).
  - Banner de éxito en `/users` y `/minutes/[id]` se ve correcto en ambos modos.
  - Dropdown de usuario: cerrar sesión redirige a `/login`.
  - Sin flash de tema en el primer paint.
- Confirmar que los `bg-white` de QR/firmas siguen viéndose blancos en modo oscuro.

## Riesgos y mitigaciones

- **Next.js 16 + Tailwind v4 + shadcn**: el proyecto declara que esta versión de Next "no es la que conoces". Antes de escribir código, leer guías relevantes en `node_modules/next/dist/docs/` (en particular layouts, server/client boundaries, fonts) y validar que `next-themes` y los componentes generados por `shadcn add` son compatibles. Si `next-themes` requiere ajustes para Next 16, ajustar el wrapper.
- **Hydration con `next-themes`**: añadir `suppressHydrationWarning` al `<html>` y mantener el `ThemeProvider` como client component.
- **`SidebarMenuButton` activo en rutas dinámicas** (ej. `/meetings/[id]`): la lógica `startsWith` actual lo cubre; verificar que no marque dos items a la vez.
- **Cookie de sidebar en SSR**: `SidebarProvider` la lee del lado servidor; revisar que no rompa el render protegido.
