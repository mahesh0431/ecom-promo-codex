export function getBackendRuntimeReadiness(
  env: NodeJS.ProcessEnv = process.env
) {
  const openAiApiKeyConfigured = Boolean(env["OPENAI_API_KEY"]?.trim());

  return {
    ready: openAiApiKeyConfigured,
    openAiApiKeyConfigured,
    codex: {
      ready: openAiApiKeyConfigured
    },
    imageGeneration: {
      ready: openAiApiKeyConfigured
    }
  };
}
