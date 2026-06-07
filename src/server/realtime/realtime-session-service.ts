import { createHash } from "node:crypto";

import { getServerEnv } from "@/server/env";
import { AppError } from "@/server/errors";

type RealtimeClientSecretResponse = {
  value?: string;
  expires_at?: number;
};

export type RealtimeSessionSecret = {
  clientSecret: string;
  expiresAt: number;
};

export async function createRealtimeSessionSecret(userId: string) {
  const { openaiApiKey } = getServerEnv();

  if (!openaiApiKey) {
    throw new AppError(
      "REALTIME_RUNTIME_ERROR",
      "OpenAI API key is required for realtime voice.",
      503
    );
  }

  const response = await fetch(
    "https://api.openai.com/v1/realtime/client_secrets",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
        "OpenAI-Safety-Identifier": safetyIdentifierForUser(userId)
      },
      body: JSON.stringify({
        session: {
          type: "realtime",
          model: "gpt-realtime-2",
          output_modalities: ["audio"],
          reasoning: {
            effort: "low"
          },
          audio: {
            output: {
              voice: "marin"
            },
            input: {
              transcription: {
                model: "gpt-4o-mini-transcribe"
              },
              turn_detection: {
                type: "semantic_vad",
                eagerness: "medium",
                create_response: true,
                interrupt_response: true
              }
            }
          }
        }
      })
    }
  );

  if (!response.ok) {
    throw new AppError(
      "REALTIME_RUNTIME_ERROR",
      "Unable to start realtime voice.",
      502
    );
  }

  const payload = (await response.json()) as RealtimeClientSecretResponse;

  if (!payload.value || typeof payload.expires_at !== "number") {
    throw new AppError(
      "REALTIME_RUNTIME_ERROR",
      "Realtime voice returned an invalid session secret.",
      502
    );
  }

  return {
    clientSecret: payload.value,
    expiresAt: payload.expires_at
  } satisfies RealtimeSessionSecret;
}

function safetyIdentifierForUser(userId: string) {
  return createHash("sha256")
    .update(`ecom-promo-codex:${userId}`)
    .digest("hex");
}
