import { createHash, randomBytes } from "node:crypto";

import { prisma } from "@/server/db/client";
import { getServerEnv } from "@/server/env";
import type { SessionResult } from "@/server/auth/auth-types";

export function hashSessionToken(rawToken: string) {
  return createHash("sha256").update(rawToken).digest("hex");
}

export async function createSession(userId: string) {
  const rawToken = randomBytes(32).toString("base64url");
  const tokenHash = hashSessionToken(rawToken);
  const { sessionTtlDays } = getServerEnv();
  const expiresAt = new Date(Date.now() + sessionTtlDays * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt
    }
  });

  return { rawToken, expiresAt };
}

export async function getSession(rawToken: string): Promise<SessionResult | null> {
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashSessionToken(rawToken) },
    include: { user: true }
  });

  if (!session) {
    return null;
  }

  if (session.expiresAt <= new Date()) {
    await prisma.session.delete({ where: { id: session.id } });
    return null;
  }

  return {
    user: {
      id: session.user.id,
      email: session.user.email
    },
    expiresAt: session.expiresAt
  };
}

export async function destroySession(rawToken: string) {
  await prisma.session.deleteMany({
    where: { tokenHash: hashSessionToken(rawToken) }
  });
}
