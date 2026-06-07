import { afterEach, describe, expect, test, vi } from "vitest";

import { createRealtimeSessionSecret } from "@/server/realtime/realtime-session-service";

const originalOpenAiApiKey = process.env.OPENAI_API_KEY;

describe("realtime session service", () => {
  afterEach(() => {
    vi.unstubAllGlobals();

    if (originalOpenAiApiKey === undefined) {
      delete process.env.OPENAI_API_KEY;
      return;
    }

    process.env.OPENAI_API_KEY = originalOpenAiApiKey;
  });

  test("requires the shared OpenAI API key", async () => {
    delete process.env.OPENAI_API_KEY;

    await expect(createRealtimeSessionSecret("user-1")).rejects.toMatchObject({
      code: "REALTIME_RUNTIME_ERROR",
      status: 503
    });
  });

  test("creates an audio realtime client secret without exposing the key", async () => {
    process.env.OPENAI_API_KEY = "secret-openai-key";
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          value: "ek_realtime_secret",
          expires_at: 1770000000
        }),
        { status: 200 }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const secret = await createRealtimeSessionSecret("user-1");

    expect(secret).toEqual({
      clientSecret: "ek_realtime_secret",
      expiresAt: 1770000000
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit
    ];
    expect(url).toBe("https://api.openai.com/v1/realtime/client_secrets");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({
      Authorization: "Bearer secret-openai-key",
      "Content-Type": "application/json"
    });
    expect(init.headers).toHaveProperty("OpenAI-Safety-Identifier");
    const requestBody = JSON.parse(init.body as string) as unknown;
    expect(JSON.stringify(requestBody)).toContain("gpt-realtime-2");
    expect(JSON.stringify(requestBody)).not.toContain("secret-openai-key");
  });
});
