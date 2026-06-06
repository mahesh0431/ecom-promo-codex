import type { NextResponse } from "next/server";

import { getServerEnv } from "@/server/env";
import { AppError } from "@/server/errors";
import { getSession } from "@/server/auth/session-service";

export async function requireSession(request: Request) {
  const rawToken = getSessionCookieFromRequest(request);

  if (!rawToken) {
    throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
  }

  const session = await getSession(rawToken);

  if (!session) {
    throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
  }

  return session;
}

export function getSessionCookieFromRequest(request: Request) {
  const cookieHeader = request.headers.get("cookie");

  if (!cookieHeader) {
    return null;
  }

  const { sessionCookieName } = getServerEnv();
  const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());
  const matchingCookie = cookies.find((cookie) =>
    cookie.startsWith(`${sessionCookieName}=`)
  );

  if (!matchingCookie) {
    return null;
  }

  return decodeURIComponent(matchingCookie.slice(sessionCookieName.length + 1));
}

export function setSessionCookie(
  response: NextResponse,
  rawToken: string,
  expiresAt: Date
) {
  const { sessionCookieName } = getServerEnv();

  response.cookies.set({
    name: sessionCookieName,
    value: rawToken,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt
  });
}

export function clearSessionCookie(response: NextResponse) {
  const { sessionCookieName } = getServerEnv();

  response.cookies.set({
    name: sessionCookieName,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
}
