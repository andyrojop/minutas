"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import { isInviteOnlyMode } from "@/lib/env";
import { humanizeSupabaseAuthError } from "@/lib/supabase-auth-errors";
import { resolveSafePostLoginRedirect } from "@/lib/post-login-redirect";

/* ── Icons ─────────────────────────────────────────────────── */

function SpinnerIcon() {
  return (
    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.35)" strokeWidth="3" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg className="mt-0.5 shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function BrandLogo() {
  return (
    <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="28" height="28" rx="8" fill="#000827" />
      <path d="M9 16h14M9 11h10M9 21h7" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function LoginIllustration() {
  return (
  <div>
  </div>
  );
}

/* ── FormField ──────────────────────────────────────────────── */

interface FormFieldProps {
  id: string;
  type: "email" | "password";
  placeholder: string;
  autoComplete?: string;
  value: string;
  onChange: (v: string) => void;
  variant?: "outline" | "filled";
}

function FormField({
  id,
  type,
  placeholder,
  autoComplete,
  value,
  onChange,
  variant = "outline",
}: FormFieldProps) {
  const [focused, setFocused] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const isPassword = type === "password";

  return (
    <div className="relative">
      <div
        className={cn(
          "pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 transition-colors duration-200",
          focused ? "text-[#00BCD4]" : "text-slate-400",
        )}
      >
        {isPassword ? <LockIcon /> : <UserIcon />}
      </div>
      <input
        id={id}
        type={isPassword && showPwd ? "text" : type}
        autoComplete={autoComplete}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={cn(
          "h-12 w-full rounded-xl pr-4 pl-12 text-sm text-slate-800 outline-none transition-all duration-200 placeholder:text-slate-400",
          variant === "filled"
            ? cn(
                "border border-transparent bg-slate-100",
                focused && "bg-white ring-2 ring-[#00BCD4]/25",
              )
            : cn(
                "border bg-white",
                focused
                  ? "border-[#00BCD4] ring-4 ring-[#00BCD4]/12"
                  : "border-slate-200 hover:border-slate-300",
              ),
          isPassword && "pr-12",
        )}
      />
      {isPassword && (
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShowPwd((v) => !v)}
          className={cn(
            "absolute top-1/2 right-4 -translate-y-1/2 transition-colors duration-200",
            focused ? "text-slate-500 hover:text-slate-700" : "text-slate-400 hover:text-slate-600",
          )}
          aria-label={showPwd ? "Ocultar contraseña" : "Mostrar contraseña"}
        >
          <EyeIcon open={showPwd} />
        </button>
      )}
    </div>
  );
}

/* ── LoginForm ──────────────────────────────────────────────── */

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = resolveSafePostLoginRedirect(searchParams.get("next"));
  const inviteOnlyNotice = searchParams.get("notice") === "invite_only";
  const showRegisterLink = !isInviteOnlyMode();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState(0);
  const [loading, setLoading] = useState(false);

  const paramError = searchParams.get("error");
  const urlError = paramError ? humanizeSupabaseAuthError(paramError) : null;
  const error = formError ?? urlError;

  useEffect(() => {
    if (!paramError) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete("error");
    const q = params.toString();
    router.replace(q ? `/login?${q}` : "/login");
  }, [paramError, searchParams, router]);

  function addError(msg: string) {
    setFormError(msg);
    setErrorKey((k) => k + 1);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setLoading(true);
    try {
      const result = await signIn("credentials", { email, password, redirect: false });
      if (!result || result.error) {
        addError(humanizeSupabaseAuthError(result?.error ?? "Credenciales inválidas"));
        return;
      }
      router.push(nextPath);
      router.refresh();
    } catch (err) {
      addError(humanizeSupabaseAuthError(err instanceof Error ? err.message : "Error inesperado al iniciar sesión."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page auth-page--light fixed inset-0 overflow-auto bg-white">
      <header className="absolute top-0 right-0 left-0 z-10 px-8 py-6 lg:px-12">
        <div className="flex items-center gap-3">
          <BrandLogo />
          <span className="text-base font-semibold tracking-tight text-[#000827]">Gestión de minutas</span>
        </div>
      </header>

      <main className="flex min-h-full items-center justify-center px-6 py-24 lg:px-12">
        <div
          className="w-full max-w-5xl"
          style={{ animation: "authFadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both" }}
        >
          <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)] lg:grid lg:grid-cols-2">
            <div className="flex flex-col justify-center px-8 py-12 sm:px-12 lg:px-14 lg:py-16">
              <div className="mx-auto w-full max-w-sm">
                <h1 className="mb-8 text-center text-2xl font-bold tracking-tight text-[#000827]">
                  Iniciar sesión
                </h1>

                {inviteOnlyNotice && (
                  <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-600">
                    El autorregistro está cerrado. Solicita acceso al administrador.
                  </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                  <FormField
                    id="email"
                    type="email"
                    placeholder="Correo electrónico"
                    autoComplete="email"
                    value={email}
                    onChange={setEmail}
                    variant="outline"
                  />
                  <FormField
                    id="password"
                    type="password"
                    placeholder="Contraseña"
                    autoComplete="current-password"
                    value={password}
                    onChange={setPassword}
                    variant="filled"
                  />

                  <div className="flex items-center justify-between pt-1">
                    <label className="flex cursor-pointer items-center gap-2.5 text-xs">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 accent-[#000827]"
                      />
                      <span className="text-slate-600">Recordarme</span>
                    </label>
                  </div>

                  {error && (
                    <div
                      key={errorKey}
                      className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs leading-relaxed text-red-700"
                      style={{ animation: "authShake 0.4s ease" }}
                    >
                      <AlertIcon />
                      <span>{error}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className={cn(
                      "mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white transition-all duration-200",
                      "bg-[#000827] hover:bg-[#0a1535] active:scale-[0.98]",
                      loading && "cursor-not-allowed opacity-60",
                    )}
                  >
                    {loading ? (
                      <>
                        <SpinnerIcon />
                        <span>Entrando…</span>
                      </>
                    ) : (
                      <span>Iniciar sesión</span>
                    )}
                  </button>
                </form>

                {showRegisterLink && (
                  <p className="mt-8 text-center text-sm text-slate-500">
                    ¿No tienes cuenta?{" "}
                    <Link
                      href="/register"
                      className="font-medium text-[#00BCD4] underline decoration-[#00BCD4]/40 underline-offset-2 transition-colors hover:text-[#0097A7] hover:decoration-[#0097A7]"
                    >
                      Regístrate
                    </Link>
                  </p>
                )}
              </div>
            </div>

            <div className="relative hidden items-center justify-center overflow-hidden bg-linear-to-br from-slate-50 to-[#E8F7FA] px-10 py-12 lg:flex">
              <div className="absolute -top-16 -right-16 h-64 w-64 rounded-full bg-[#00BCD4]/10 blur-3xl" aria-hidden="true" />
              <div className="absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-[#000827]/5 blur-2xl" aria-hidden="true" />
              <div className="relative w-full max-w-sm">
                <LoginIllustration />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
