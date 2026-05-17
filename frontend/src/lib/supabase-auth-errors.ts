/** Si es true, muestra ayuda extra en la UI (pasos en dashboard). */
export function isSupabaseAuthRateLimitError(message: string): boolean {
  const m = message.toLowerCase().trim();
  return (
    m.includes("email rate limit exceeded") ||
    m.includes("over_email_send_rate_limit") ||
    (m.includes("rate limit") && (m.includes("email") || m.includes("signup")))
  );
}

const NEXT_AUTH_ERROR_MESSAGES: Record<string, string> = {
  CredentialsSignin:
    "No se pudo iniciar sesión. Revisa correo y contraseña. Si usas Supabase local, ese usuario debe existir ahí (Studio → Authentication → Users o «Crear cuenta»); no se copian desde la nube. Comprueba también que el API Nest esté en marcha y NEXT_PUBLIC_API_URL.",
  Configuration:
    "Configuración de sesiones incompleta en el servidor. Define NEXTAUTH_URL y NEXTAUTH_SECRET en frontend/.env.local y reinicia Next.js.",
  AccessDenied: "Acceso denegado.",
  Verification: "El enlace de verificación no es válido o ha caducado.",
  OAuthSignin: "No se pudo iniciar sesión con el proveedor externo.",
  OAuthCallback: "Error al completar el inicio de sesión con el proveedor externo.",
  OAuthAccountNotLinked:
    "Esta cuenta ya está vinculada a otro método de inicio de sesión.",
  EmailSignin: "No se pudo enviar el correo de acceso.",
  Callback: "Error al procesar la respuesta del servidor de autenticación.",
  SessionRequired: "Debes iniciar sesión para acceder a esta página.",
  Default: "No se pudo iniciar sesión. Inténtalo de nuevo.",
};

function normalizeAuthErrorCode(code: string): string {
  return code.trim().replace(/^Error:\s*/i, "").trim().replace(/[\s_-]/g, "").toLowerCase();
}

function humanizeNextAuthErrorCode(message: string): string | null {
  const key = normalizeAuthErrorCode(message);
  const entry = Object.entries(NEXT_AUTH_ERROR_MESSAGES).find(
    ([k]) => normalizeAuthErrorCode(k) === key,
  );
  return entry ? entry[1] : null;
}

/** Traduce errores frecuentes de Supabase Auth y NextAuth a texto útil en la UI. */
export function humanizeSupabaseAuthError(message: string): string {
  const m = message.toLowerCase().trim();

  const nextAuth = humanizeNextAuthErrorCode(message);
  if (nextAuth) return nextAuth;

  if (/invalid\s+login\s+credentials|invalid\s+credentials/i.test(message.trim())) {
    return (
      "Correo o contraseña incorrectos, o el usuario no existe en este entorno. " +
      "Con Supabase en Docker los usuarios de la nube no aparecen solos: créalos en Studio (http://127.0.0.1:54323 → Authentication) o con «Crear cuenta»."
    );
  }

  if (m.includes("fetch failed") || m.includes("econnrefused") || m.includes("networkerror")) {
    return (
      "No hay conexión con el servidor de la aplicación (API Nest). " +
      "Arranca el backend, confirma NEXT_PUBLIC_API_URL en .env y reinicia el frontend."
    );
  }

  if (m.includes("url and api key are required") || m.includes("required to create a supabase client")) {
    return (
      "Falta la configuración de Supabase en el frontend. Añade NEXT_PUBLIC_SUPABASE_URL y " +
      "NEXT_PUBLIC_SUPABASE_ANON_KEY (o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) en frontend/.env.local y reinicia el servidor de desarrollo."
    );
  }

  if (isSupabaseAuthRateLimitError(message)) {
    return (
      "Se alcanzó el límite temporal de Supabase para registros o envío de correos (protección contra abuso). " +
      "Espera unos minutos, prueba con otro correo o en el panel: Authentication → Rate Limits (ajústalos en desarrollo). " +
      "Si envías confirmación por correo en cada alta, desactivarla en desarrollo reduce estos bloqueos."
    );
  }

  return message;
}
