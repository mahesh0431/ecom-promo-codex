import { prisma } from "@/server/db/client";
import { AppError } from "@/server/errors";
import type { LoginResult } from "@/server/auth/auth-types";
import { verifyPasswordHash } from "@/server/auth/password";
import { createSession } from "@/server/auth/session-service";

export async function loginWithPassword(
  email: string,
  password: string
): Promise<LoginResult> {
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() }
  });

  if (!user) {
    throw invalidCredentials();
  }

  const isValidPassword = await verifyPasswordHash(password, user.passwordHash);

  if (!isValidPassword) {
    throw invalidCredentials();
  }

  const session = await createSession(user.id);

  return {
    user: {
      id: user.id,
      email: user.email
    },
    sessionToken: session.rawToken,
    expiresAt: session.expiresAt
  };
}

function invalidCredentials() {
  return new AppError(
    "INVALID_CREDENTIALS",
    "Invalid email or password.",
    401
  );
}
