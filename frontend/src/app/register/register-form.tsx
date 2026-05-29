"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { humanizeSupabaseAuthError } from "@/lib/supabase-auth-errors";

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

function CheckIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
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

function RainbowPanel() {
  return (
    <div className="auth-rainbow-panel relative hidden items-center justify-center overflow-hidden lg:flex">
      <div className="auth-rainbow-blob auth-rainbow-blob-1" aria-hidden="true" />
      <div className="auth-rainbow-blob auth-rainbow-blob-2" aria-hidden="true" />
      <div className="auth-rainbow-blob auth-rainbow-blob-3" aria-hidden="true" />
      <div className="auth-rainbow-arc" aria-hidden="true" />

      <div className="relative z-10 px-10 text-center">
        <p className="text-sm font-medium tracking-[0.2em] text-white/70 uppercase">
          Bienvenido
        </p>
        <h2 className="mt-3 text-3xl leading-tight font-bold text-white">
          Organiza tus reuniones con claridad
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-white/75">
          Crea tu cuenta y empieza a gestionar minutas y compromisos en un solo lugar.
        </p>
      </div>
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
  minLength?: number;
}

function FormField({
  id,
  type,
  placeholder,
  autoComplete,
  value,
  onChange,
  variant = "outline",
  minLength,
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
        minLength={minLength}
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

/* ── RegisterForm ───────────────────────────────────────────── */

export function RegisterForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState(0);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function addError(msg: string) {
    setError(msg);
    setErrorKey((k) => k + 1);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (password !== password2) {
      addError("Las contraseñas no coinciden.");
      return;
    }
    if (password.length < 6) {
      addError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: signError } = await supabase.auth.signUp({ email, password });
      if (signError) {
        addError(humanizeSupabaseAuthError(signError.message));
        return;
      }
      if (data.session) {
        router.push("/dashboard");
        router.refresh();
        return;
      }
      setInfo("Revisa tu correo para confirmar la cuenta.");
    } catch (err) {
      addError(humanizeSupabaseAuthError(err instanceof Error ? err.message : "Error inesperado al registrarse."));
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
                {info ? (
                  <div
                    className="flex flex-col items-center gap-5 py-4 text-center"
                    style={{ animation: "authFadeUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) both" }}
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#00BCD4]/10 text-[#00BCD4] ring-1 ring-[#00BCD4]/30">
                      <CheckIcon />
                    </div>
                    <div>
                      <h1 className="text-xl font-bold text-[#000827]">¡Cuenta creada!</h1>
                      <p className="mt-2 text-sm leading-relaxed text-slate-500">{info}</p>
                    </div>
                    <Link
                      href="/login"
                      className="text-sm font-medium text-[#00BCD4] underline decoration-[#00BCD4]/40 underline-offset-2 transition-colors hover:text-[#0097A7]"
                    >
                      Ir a inicio de sesión
                    </Link>
                  </div>
                ) : (
                  <>
                    <h1 className="mb-2 text-center text-2xl font-bold tracking-tight text-[#000827]">
                      Crear cuenta
                    </h1>
                    <p className="mb-8 text-center text-sm text-slate-500">
                      Completa los campos para registrarte en la plataforma.
                    </p>

                    <form onSubmit={onSubmit} className="space-y-4">
                      <FormField
                        id="reg-email"
                        type="email"
                        placeholder="Correo electrónico"
                        autoComplete="email"
                        value={email}
                        onChange={setEmail}
                        variant="outline"
                      />
                      <FormField
                        id="reg-password"
                        type="password"
                        placeholder="Contraseña"
                        autoComplete="new-password"
                        value={password}
                        onChange={setPassword}
                        variant="filled"
                        minLength={6}
                      />
                      <FormField
                        id="reg-password2"
                        type="password"
                        placeholder="Repetir contraseña"
                        autoComplete="new-password"
                        value={password2}
                        onChange={setPassword2}
                        variant="filled"
                        minLength={6}
                      />

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
                            <span>Creando cuenta…</span>
                          </>
                        ) : (
                          <span>Registrarse</span>
                        )}
                      </button>
                    </form>

                    <p className="mt-8 text-center text-sm text-slate-500">
                      ¿Ya tienes cuenta?{" "}
                      <Link
                        href="/login"
                        className="font-medium text-[#00BCD4] underline decoration-[#00BCD4]/40 underline-offset-2 transition-colors hover:text-[#0097A7] hover:decoration-[#0097A7]"
                      >
                        Inicia sesión
                      </Link>
                    </p>
                  </>
                )}
              </div>
            </div>

            <RainbowPanel />
          </div>
        </div>
      </main>
    </div>
  );
}
