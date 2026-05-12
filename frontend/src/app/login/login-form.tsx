"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";

import { cn } from "@/lib/utils";
import { isInviteOnlyMode } from "@/lib/env";
import { humanizeSupabaseAuthError } from "@/lib/supabase-auth-errors";
import { resolveSafePostLoginRedirect } from "@/lib/post-login-redirect";
import { createClient } from "@/lib/supabase/client";

/* ── Icons ─────────────────────────────────────────────────── */

function SpinnerIcon() {
  return (
    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.25)" strokeWidth="3" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14" /><path d="M12 5l7 7-7 7" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg className="shrink-0 mt-px" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

/* ── FormField ──────────────────────────────────────────────── */

interface FormFieldProps {
  id: string;
  type: "email" | "password";
  label: string;
  autoComplete?: string;
  value: string;
  onChange: (v: string) => void;
  minLength?: number;
}

function FormField({ id, type, label, autoComplete, value, onChange, minLength }: FormFieldProps) {
  const [focused, setFocused] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const isPassword = type === "password";

  return (
    <div>
      <label
        htmlFor={id}
        className="block mb-2.5 font-semibold tracking-[0.11em] uppercase"
        style={{
          fontSize: "10px",
          color: focused ? "oklch(0.72 0.14 250)" : "rgba(255,255,255,0.3)",
          transition: "color 0.2s ease",
        }}
      >
        {label}
      </label>
      <div className="relative">
        <div
          className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{
            color: focused ? "oklch(0.65 0.14 250)" : "rgba(255,255,255,0.2)",
            transition: "color 0.2s ease",
          }}
        >
          {isPassword ? <LockIcon /> : <MailIcon />}
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
          aria-label={label}
          className="w-full rounded-xl text-sm outline-none"
          style={{
            height: "50px",
            paddingLeft: "42px",
            paddingRight: isPassword ? "48px" : "16px",
            background: focused ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.038)",
            border: `1px solid ${focused ? "oklch(0.55 0.16 250 / 0.7)" : "rgba(255,255,255,0.09)"}`,
            boxShadow: focused
              ? "0 0 0 3.5px oklch(0.55 0.16 250 / 0.12), inset 0 1px 0 rgba(255,255,255,0.06)"
              : "inset 0 1px 0 rgba(255,255,255,0.04)",
            color: "rgba(255,255,255,0.9)",
            caretColor: "oklch(0.7 0.14 250)",
            transition: "background 0.2s ease, border-color 0.2s ease, box-shadow 0.25s ease",
          }}
        />
        {isPassword && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPwd((v) => !v)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2"
            style={{
              color: focused ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.22)",
              transition: "color 0.2s ease",
            }}
            aria-label={showPwd ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            <EyeIcon open={showPwd} />
          </button>
        )}
      </div>
    </div>
  );
}

/* ── LoginForm ──────────────────────────────────────────────── */

type Mode = "login" | "register";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = resolveSafePostLoginRedirect(searchParams.get("next"));
  const inviteOnlyNotice = searchParams.get("notice") === "invite_only";
  const showTabs = !isInviteOnlyMode();

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState(0);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setInfo(null);
    setPassword("");
    setPassword2("");
  }

  function addError(msg: string) {
    setError(msg);
    setErrorKey((k) => k + 1);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
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

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
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

  const isLogin = mode === "login";

  const cardTopGlow = {
    background: "radial-gradient(ellipse 130% 50% at 50% 0%, oklch(0.18 0.06 250 / 0.14) 0%, transparent 60%)",
  };

  return (
    <div className="auth-page fixed inset-0 flex overflow-hidden">

      {/* ── Aurora panel (desktop) ───────────────────────────── */}
      <div
        className="hidden lg:block relative overflow-hidden shrink-0"
        style={{ width: "42%", background: "#050511" }}
      >
        <div className="auth-blob auth-blob-1" />
        <div className="auth-blob auth-blob-2" />
        <div className="auth-blob auth-blob-3" />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <svg width="44" height="44" viewBox="0 0 44 44" fill="none" aria-hidden="true">
            <rect x="1.5" y="1.5" width="41" height="41" rx="11" stroke="rgba(255,255,255,0.22)" strokeWidth="1.5" />
            <path d="M12 22h20M12 15.5h14M12 28.5h10" stroke="rgba(255,255,255,0.22)" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      {/* ── Form panel ──────────────────────────────────────────── */}
      <div
        className="flex-1 flex items-center justify-center overflow-auto py-12 px-6"
        style={{
          background: "#0b0b18",
          backgroundImage: "radial-gradient(ellipse 80% 55% at 50% 25%, oklch(0.16 0.07 250 / 0.4) 0%, transparent 70%)",
        }}
      >
        <div
          className="w-full max-w-[360px]"
          style={{ animation: "authFadeUp 0.65s cubic-bezier(0.16,1,0.3,1) both" }}
        >
          {/* Mobile-only logo */}
          <div className="lg:hidden mb-8 flex justify-center">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <rect x="1.5" y="1.5" width="29" height="29" rx="8" stroke="rgba(255,255,255,0.35)" strokeWidth="1.25" />
              <path d="M9 16h14M9 11h10M9 21h7" stroke="rgba(255,255,255,0.35)" strokeWidth="1.25" strokeLinecap="round" />
            </svg>
          </div>

          {/* Invite-only notice */}
          {inviteOnlyNotice && (
            <div
              className="mb-4 rounded-xl px-4 py-3 text-xs leading-relaxed"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
                color: "rgba(255,255,255,0.4)",
              }}
            >
              El autorregistro está cerrado. Solicita acceso al administrador.
            </div>
          )}

          {/* ── Glass card ── */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: "rgba(255,255,255,0.028)",
              border: "1px solid rgba(255,255,255,0.09)",
              boxShadow: "0 40px 70px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.07)",
            }}
          >
            {/* Top gradient accent */}
            <div
              style={{
                height: "1.5px",
                background: "linear-gradient(90deg, transparent 0%, oklch(0.58 0.18 250 / 0.85) 28%, oklch(0.52 0.22 265 / 0.85) 72%, transparent 100%)",
              }}
            />

            <div className="px-8 pt-7 pb-8" style={cardTopGlow}>

              {/* ── Mode tabs ── */}
              {showTabs && (
                <div
                  className="relative flex rounded-xl p-1 mb-7"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  {/* Sliding pill */}
                  <div
                    className="absolute top-1 bottom-1 rounded-[10px] transition-all duration-300 ease-out"
                    style={{
                      width: "calc(50% - 4px)",
                      left: isLogin ? "4px" : "calc(50%)",
                      background: "rgba(255,255,255,0.09)",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.09)",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => switchMode("login")}
                    className="relative flex-1 py-2.5 text-xs font-medium z-10 transition-colors duration-200 rounded-[10px]"
                    style={{ color: isLogin ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.32)" }}
                  >
                    Iniciar sesión
                  </button>
                  <button
                    type="button"
                    onClick={() => switchMode("register")}
                    className="relative flex-1 py-2.5 text-xs font-medium z-10 transition-colors duration-200 rounded-[10px]"
                    style={{ color: !isLogin ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.32)" }}
                  >
                    Crear cuenta
                  </button>
                </div>
              )}

              {/* ── Success state (register email confirmation) ── */}
              {info ? (
                <div
                  key="success"
                  className="flex flex-col items-center text-center gap-5 py-4"
                  style={{ animation: "authFadeUp 0.35s cubic-bezier(0.16,1,0.3,1) both" }}
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{
                      background: "oklch(0.55 0.16 250 / 0.14)",
                      border: "1px solid oklch(0.55 0.16 250 / 0.35)",
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="oklch(0.75 0.14 250)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.42)" }}>
                    {info}
                  </p>
                  <button
                    type="button"
                    onClick={() => { setInfo(null); switchMode("login"); }}
                    className="text-xs text-white/30 hover:text-white/60 transition-colors duration-200"
                  >
                    Ir a inicio de sesión
                  </button>
                </div>
              ) : (
                /* ── Animated form content ── */
                <div key={mode} style={{ animation: "authFadeUp 0.3s cubic-bezier(0.16,1,0.3,1) both" }}>

                  {/* Heading */}
                  <div className="mb-6">
                    <h1
                      className="text-[22px] font-semibold leading-tight"
                      style={{ color: "rgba(255,255,255,0.92)", letterSpacing: "-0.01em" }}
                    >
                      {isLogin ? "Bienvenido" : "Crear cuenta"}
                    </h1>
                    <p className="mt-1.5 text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.38)" }}>
                      {isLogin
                        ? "Inicia sesión con tus credenciales para continuar."
                        : "Completa los campos para registrarte en la plataforma."}
                    </p>
                  </div>

                  {/* Form */}
                  <form onSubmit={isLogin ? handleLogin : handleRegister}>
                    <div className="space-y-4">
                      <FormField
                        id="email"
                        type="email"
                        label="Correo electrónico"
                        autoComplete="email"
                        value={email}
                        onChange={setEmail}
                      />
                      <FormField
                        id="password"
                        type="password"
                        label="Contraseña"
                        autoComplete={isLogin ? "current-password" : "new-password"}
                        value={password}
                        onChange={setPassword}
                        minLength={isLogin ? undefined : 6}
                      />
                      {!isLogin && (
                        <FormField
                          id="password2"
                          type="password"
                          label="Repetir contraseña"
                          autoComplete="new-password"
                          value={password2}
                          onChange={setPassword2}
                          minLength={6}
                        />
                      )}
                    </div>

                    {error && (
                      <div
                        key={errorKey}
                        className="mt-4 flex items-start gap-2.5 rounded-xl px-4 py-3 text-xs leading-relaxed"
                        style={{
                          animation: "authShake 0.4s ease",
                          background: "oklch(0.72 0.18 25 / 0.08)",
                          border: "1px solid oklch(0.72 0.18 25 / 0.22)",
                          color: "oklch(0.78 0.15 25)",
                        }}
                      >
                        <AlertIcon />
                        <span>{error}</span>
                      </div>
                    )}

                    <div
                      className="mt-7 pt-5"
                      style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
                    >
                      <button
                        type="submit"
                        disabled={loading}
                        className={cn(
                          "w-full h-[50px] rounded-xl text-sm font-semibold text-white",
                          "flex items-center justify-center gap-2.5",
                          "transition-all duration-200 active:scale-[0.98]",
                          loading
                            ? "opacity-55 cursor-not-allowed"
                            : "hover:brightness-110 hover:shadow-[0_8px_32px_rgba(58,110,214,0.45)]",
                        )}
                        style={{
                          background: "linear-gradient(135deg, oklch(0.56 0.18 248) 0%, oklch(0.49 0.22 265) 100%)",
                          letterSpacing: "0.04em",
                        }}
                      >
                        {loading ? (
                          <>
                            <SpinnerIcon />
                            <span>{isLogin ? "Entrando" : "Creando cuenta"}</span>
                          </>
                        ) : (
                          <>
                            <span>{isLogin ? "Entrar" : "Registrarse"}</span>
                            <ArrowIcon />
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
