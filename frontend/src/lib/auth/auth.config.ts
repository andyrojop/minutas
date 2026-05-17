import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import { ApiError } from "@/lib/api/generated/core/ApiError";
import type { TokenResponseDto } from "@/lib/api/generated/models/TokenResponseDto";
import { getApiClient } from "@/lib/api/get-api-client";
import { humanizeSupabaseAuthError } from "@/lib/supabase-auth-errors";
import { REFRESH_MARGIN_SECONDS, SESSION_MAX_AGE_SECONDS } from "@/lib/constants";

/**
 * Si `authorize` lanza, NextAuth (v4) pone `error.message` en la query y con
 * `signIn({ redirect: false })` el cliente recibe ese texto en `result.error`.
 */
async function login(email: string, password: string): Promise<TokenResponseDto> {
  try {
    return await getApiClient().auth.authControllerLogin({ email, password });
  } catch (e) {
    console.error("[auth] login failed", e);
    if (e instanceof ApiError) {
      const raw =
        e.body != null &&
        typeof e.body === "object" &&
        "message" in e.body &&
        typeof (e.body as { message: unknown }).message === "string"
          ? (e.body as { message: string }).message
          : e.message;
      throw new Error(humanizeSupabaseAuthError(raw));
    }
    throw new Error(
      humanizeSupabaseAuthError(e instanceof Error ? e.message : "Error inesperado al iniciar sesión."),
    );
  }
}

const refreshRequests = new Map<string, Promise<TokenResponseDto | null>>();

async function refreshTokens(refreshToken: string): Promise<TokenResponseDto | null> {
  const inFlight = refreshRequests.get(refreshToken);
  if (inFlight) return inFlight;

  const request = (async () => {
    try {
      return await getApiClient().auth.authControllerRefresh({ refreshToken });
    } catch (e) {
      console.error("[auth] refresh failed", e);
      return null;
    }
  })();
  refreshRequests.set(refreshToken, request);
  try {
    return await request;
  } finally {
    refreshRequests.delete(refreshToken);
  }
}

async function logout(refreshToken: string): Promise<void> {
  try {
    await getApiClient().auth.authControllerLogout({ refreshToken });
  } catch (e) {
    console.error("[auth] logout failed", e);
  }
}

const isProd = process.env.NODE_ENV === "production";

export const nextAuthOptions: NextAuthOptions = {
  /** Sin esto estable, la cookie JWT puede fallar al descifrar (JWT_SESSION_ERROR). */
  secret: process.env.NEXTAUTH_SECRET,
  /**
   * Nombre propio para no leer cookies legacy `next-auth.session-token` cifradas con otro
   * NEXTAUTH_SECRET (o sin secret): evita JWEDecryptionFailed en cada arranque hasta que el usuario borre datos del sitio.
   */
  cookies: {
    sessionToken: {
      name: isProd ? "__Secure-app-minutes.session" : "app-minutes.session",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProd,
      },
    },
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const response = await login(credentials.email, credentials.password);
        if (!response.accessToken || !response.refreshToken) return null;
        return {
          id: response.user.id,
          email: response.user.email,
          accessToken: response.accessToken,
          refreshToken: response.refreshToken,
          expiresAt: response.expiresAt,
          role: response.user.role,
        } as unknown as { id: string };
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: SESSION_MAX_AGE_SECONDS },
  callbacks: {
    jwt: async ({ token, user }) => {
      const credUser = user as
        | {
            accessToken?: string;
            refreshToken?: string;
            expiresAt?: number;
            email?: string;
            id?: string;
            role?: string;
          }
        | undefined;

      if (credUser?.accessToken && credUser?.refreshToken) {
        return {
          ...token,
          sub: credUser.id ?? token.sub,
          email: credUser.email ?? token.email,
          role: credUser.role,
          accessToken: credUser.accessToken,
          refreshToken: credUser.refreshToken,
          expiresAt: credUser.expiresAt,
          error: undefined,
        };
      }

      const accessToken = token.accessToken;
      const refreshToken = token.refreshToken;
      const expiresAt = token.expiresAt;
      if (!accessToken || !refreshToken || typeof expiresAt !== "number") {
        return token;
      }

      const nowSec = Date.now() / 1000;
      if (nowSec < expiresAt - REFRESH_MARGIN_SECONDS) {
        return token;
      }

      const refreshed = await refreshTokens(refreshToken);
      if (!refreshed) {
        return { ...token, error: "RefreshAccessTokenError" };
      }
      return {
        ...token,
        sub: refreshed.user.id,
        email: refreshed.user.email,
        role: refreshed.user.role,
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken,
        expiresAt: refreshed.expiresAt,
        error: undefined,
      };
    },
    session: async ({ session, token }) => {
      if (token.error === "RefreshAccessTokenError") {
        session.error = "RefreshAccessTokenError";
        session.accessToken = undefined;
        return session;
      }
      session.accessToken = token.accessToken;
      session.user = {
        id: (token.sub as string) ?? "",
        email: (token.email as string | undefined) ?? session.user?.email ?? "",
        role: ((token as { role?: string }).role as string) ?? "",
      };
      return session;
    },
  },
  events: {
    async signOut({ token }) {
      const refreshToken = token.refreshToken;
      if (!refreshToken) return;
      await logout(refreshToken);
    },
  },
  pages: { signIn: "/login", error: "/login" },
};
