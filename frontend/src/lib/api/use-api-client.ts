"use client";

import { useSession } from "next-auth/react";
import { useMemo } from "react";

import { getApiClient } from "@/lib/api/get-api-client";

function headersCacheKey(headers?: Record<string, string>): string {
  if (!headers) return "";
  return Object.keys(headers)
    .sort()
    .map((k) => `${k}=${headers[k]}`)
    .join("&");
}

export function useApiClient(additionalHeaders?: Record<string, string>) {
  const { data: session } = useSession();
  const accessToken = session?.accessToken;
  const headersKey = headersCacheKey(additionalHeaders);
  return useMemo(
    () => getApiClient(session, undefined, additionalHeaders),
    [accessToken, headersKey, session, additionalHeaders],
  );
}
