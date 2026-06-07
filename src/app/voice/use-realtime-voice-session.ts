"use client";

import type { RealtimeSession } from "@openai/agents/realtime";
import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";

import type { PromoWorkflowCommands } from "@/app/voice/workflow-command-types";
import type { VoiceCommandResult } from "@/app/voice/voice-types";

type ApiEnvelope<T> = {
  data?: T;
  error?: {
    code: string;
    message: string;
  };
};

type RealtimeSessionSecret = {
  clientSecret: string;
  expiresAt: number;
};

type RealtimeSessionInstance = RealtimeSession<unknown>;

const VOICE_IDLE_MESSAGE =
  "I can propose recommendations or create campaigns.";

export type VoiceSessionStatus =
  | "idle"
  | "connecting"
  | "listening"
  | "thinking"
  | "speaking"
  | "executing"
  | "error";

export function useRealtimeVoiceSession(commands: PromoWorkflowCommands) {
  const commandsRef = useRef(commands);
  const sessionRef = useRef<RealtimeSessionInstance | null>(null);
  const [status, setStatus] = useState<VoiceSessionStatus>("idle");
  const [message, setMessage] = useState(VOICE_IDLE_MESSAGE);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    commandsRef.current = commands;
  }, [commands]);

  const stop = useCallback(() => {
    sessionRef.current?.close();
    sessionRef.current = null;
    setConnected(false);
    setStatus("idle");
    setMessage(VOICE_IDLE_MESSAGE);
  }, []);

  useEffect(() => stop, [stop]);

  const start = useCallback(async () => {
    if (sessionRef.current || status === "connecting") {
      return;
    }

    setStatus("connecting");
    setMessage("Starting voice mode...");

    try {
      const [{ RealtimeAgent, RealtimeSession, tool }, token] =
        await Promise.all([import("@openai/agents/realtime"), fetchToken()]);
      const agent = new RealtimeAgent({
        name: "eCommerce Promotion Cockpit Voice",
        instructions: [
          "You control the eCommerce Promotion Cockpit UI through tools.",
          "Always inspect screen context before choosing a product, campaign, or dialog action.",
          "Do not guess product IDs. Prefer exact product names or SKUs. If a product reference is ambiguous, ask a short clarifying question.",
          "Use concise spoken responses. Tell the user what changed in the UI.",
          "Run requested UI actions directly through tools. The app itself shows loading or error dialogs for long-running generation work.",
          "Do not describe hidden implementation details, API keys, database rows, or raw JSON."
        ].join(" "),
        tools: [
          tool({
            name: "get_screen_context",
            description:
              "Return the current page, visible products, suggestions, campaigns, dialogs, loading states, and campaign draft.",
            parameters: z.object({}),
            execute: async () => toolResult(commandsRef.current.getContext())
          }),
          tool({
            name: "open_product",
            description:
              "Open product details for one product by name, SKU, or product ID.",
            parameters: z.object({
              product: z
                .string()
                .describe("Product name, partial product name, SKU, or ID.")
            }),
            execute: async ({ product }) =>
              toolResult(await commandsRef.current.openProduct(product))
          }),
          tool({
            name: "navigate_back",
            description:
              "Navigate back one app step, or close a safe dialog if one is currently open.",
            parameters: z.object({}),
            execute: async () =>
              toolResult(await commandsRef.current.navigateBack())
          }),
          tool({
            name: "generate_promotion_suggestions",
            description:
              "Generate promotion suggestions for the product table.",
            parameters: z.object({}),
            execute: async () =>
              toolResult(
                await commandsRef.current.generatePromotionSuggestions()
              )
          }),
          tool({
            name: "open_recommendation",
            description:
              "Open the recommendation dialog for a suggested product after suggestions exist.",
            parameters: z.object({
              product: z
                .string()
                .describe("Suggested product name, SKU, or product ID.")
            }),
            execute: async ({ product }) =>
              toolResult(await commandsRef.current.openRecommendation(product))
          }),
          tool({
            name: "create_campaign_for_product",
            description:
              "Open the campaign create screen for a product, using suggested offer terms when available.",
            parameters: z.object({
              product: z
                .string()
                .optional()
                .describe(
                  "Product name, SKU, or product ID. Omit to use the current or selected product."
                )
            }),
            execute: async ({ product }) =>
              toolResult(
                await commandsRef.current.createCampaignForProduct(product)
              )
          }),
          tool({
            name: "open_campaign",
            description:
              "Open an existing saved campaign from campaign history. Use this for viewing prior campaigns, not creating a new one.",
            parameters: z.object({
              product: z
                .string()
                .optional()
                .describe(
                  "Product name, SKU, or product ID. Omit to use the current product."
                ),
              campaign: z
                .string()
                .optional()
                .describe(
                  "Campaign reference such as latest, oldest, first campaign, discount percent, quantity limit, image count, or campaign ID."
                )
            }),
            execute: async ({ product, campaign }) =>
              toolResult(
                await commandsRef.current.openCampaign(product, campaign)
              )
          }),
          tool({
            name: "set_campaign_offer",
            description:
              "Set campaign draft fields on the campaign create screen.",
            parameters: z.object({
              discountPercent: z.number().int().min(0).max(100).optional(),
              quantityLimit: z.number().int().min(0).optional(),
              imageVariants: z.union([z.literal(1), z.literal(2)]).optional(),
              aspectRatio: z
                .enum(["Square", "Portrait", "Landscape"])
                .optional(),
              customImagePrompt: z.string().max(500).optional()
            }),
            execute: async (draft) =>
              toolResult(await commandsRef.current.setCampaignOffer(draft))
          }),
          tool({
            name: "generate_campaign",
            description:
              "Generate the campaign from the current campaign draft.",
            parameters: z.object({}),
            execute: async () =>
              toolResult(await commandsRef.current.generateCampaign())
          }),
          tool({
            name: "open_additional_image_dialog",
            description:
              "Open the dialog for generating another image on an existing campaign.",
            parameters: z.object({}),
            execute: async () =>
              toolResult(
                await commandsRef.current.openAdditionalImageDialog()
              )
          }),
          tool({
            name: "generate_another_image",
            description:
              "Generate one more campaign image for the current campaign.",
            parameters: z.object({
              customDirection: z
                .string()
                .max(500)
                .optional()
                .describe("Optional creative direction for the new image.")
            }),
            execute: async ({ customDirection }) =>
              toolResult(
                await commandsRef.current.generateAnotherImage(customDirection)
              )
          }),
          tool({
            name: "close_dialog",
            description:
              "Close the active safe dialog. Do not use this during generation.",
            parameters: z.object({}),
            execute: async () =>
              toolResult(await commandsRef.current.closeDialog())
          })
        ]
      });
      const session = new RealtimeSession(agent, {
        model: "gpt-realtime-2",
        transport: "webrtc",
        config: {
          outputModalities: ["audio"],
          reasoning: {
            effort: "low"
          },
          parallelToolCalls: false,
          audio: {
            output: {
              voice: "marin"
            },
            input: {
              transcription: {
                model: "gpt-4o-mini-transcribe"
              },
              turnDetection: {
                type: "semantic_vad",
                eagerness: "medium",
                createResponse: true,
                interruptResponse: true
              }
            }
          }
        },
        toolErrorFormatter: () =>
          "That action did not work in the current screen. Check the app state and try a valid UI action."
      });

      session.on("agent_start", () => {
        setStatus("thinking");
        setMessage("Understanding the request...");
      });
      session.on("agent_tool_start", (_context, _agent, toolDefinition) => {
        setStatus("executing");
        setMessage(`Running ${toolDefinition.name ?? "app action"}...`);
      });
      session.on("agent_tool_end", (_context, _agent, toolDefinition) => {
        setStatus("listening");
        setMessage(`Finished ${toolDefinition.name ?? "app action"}.`);
      });
      session.on("audio_start", () => {
        setStatus("speaking");
        setMessage("Speaking...");
      });
      session.on("audio_stopped", () => {
        setStatus("listening");
        setMessage("Listening...");
      });
      session.on("error", ({ error }) => {
        setStatus("error");
        setMessage(toVoiceErrorMessage(error));
      });

      await session.connect({ apiKey: token.clientSecret });
      sessionRef.current = session;
      setConnected(true);
      setStatus("thinking");
      setMessage("Greeting...");
      session.sendMessage(createInitialVoicePrompt());
    } catch (error) {
      sessionRef.current?.close();
      sessionRef.current = null;
      setConnected(false);
      setStatus("error");
      setMessage(toVoiceErrorMessage(error));
    }
  }, [status]);

  return {
    status,
    message,
    connected,
    start,
    stop
  };
}

async function fetchToken() {
  const response = await fetch("/api/realtime/session", {
    method: "POST"
  });
  const payload = (await response.json().catch(() => null)) as
    | ApiEnvelope<RealtimeSessionSecret>
    | null;

  if (!response.ok) {
    throw new Error(
      payload?.error?.message ?? "Unable to start realtime voice."
    );
  }

  if (!payload?.data?.clientSecret) {
    throw new Error("Realtime voice did not return a session secret.");
  }

  return payload.data;
}

function toolResult(result: VoiceCommandResult | VoiceCommandResult["context"]) {
  return JSON.stringify(result);
}

function toVoiceErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Voice mode ran into an error.";
}

function createInitialVoicePrompt() {
  return "Say exactly: Hi there, how can I help today?";
}
