import {
  spawn,
  type ChildProcess,
  type SpawnOptions
} from "node:child_process";
import {
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile
} from "node:fs/promises";
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve
} from "node:path";
import { fileURLToPath } from "node:url";

const currentFilePath = fileURLToPath(import.meta.url);
const rootDir = resolve(dirname(currentFilePath), "..");
const defaultDatabaseUrl = "file:../data/live-integration.sqlite";
const defaultCodexHome = join(rootDir, "output", "codex-runtime", "home");
const defaultCodexWorkspace = join(
  rootDir,
  "output",
  "codex-runtime",
  "workspace"
);
const defaultCodexModel = "gpt-5.5";
const defaultCodexReasoningEffort = "low";
const liveDatabaseNamePattern = /^live-integration.*\.sqlite$/;

type ResolveLiveIntegrationDatabaseInput = {
  rootDir: string;
  liveIntegrationDatabaseUrl?: string;
  envDatabaseUrl?: string;
};

export type ResolvedLiveIntegrationDatabase = {
  databaseUrl: string;
  databasePath: string;
  databaseBasename: string;
};

type DatabaseCounts = {
  users: number;
  sessions: number;
  products: number;
  productSales: number;
  campaigns: number;
  campaignImages: number;
};

type LiveIntegrationReport = {
  timestamp: string;
  appBaseUrl: string;
  databaseBasename: string;
  codexGatewayMode: "sdk";
  codexHome: string;
  codexWorkspace: string;
  codexModel: string;
  codexReasoningEffort: string;
  imageGenerationMode: "openai";
  status: "passed" | "failed" | "skipped-flow";
  healthStatus?: number;
  productCount?: number;
  opportunityCount?: number;
  selectedProductSku?: string;
  campaignId?: string;
  imageId?: string;
  imageMimeType?: string;
  imageByteLength?: number;
  codexSessionFiles?: string[];
  finalCounts?: DatabaseCounts;
  failedStep?: string;
  errorMessage?: string;
  serverLogTail?: string;
  durationMs: number;
  steps: Array<{
    name: string;
    status: "passed" | "failed";
    durationMs: number;
  }>;
};

type ProductOverview = {
  totalProducts: number;
  totalAvailableStock: number;
  unitsSoldThisMonth: number;
};

type Product = {
  productId: string;
  sku: string;
  name: string;
};

type Opportunity = {
  productId: string;
  sku: string;
};

type Campaign = {
  campaignId: string;
  productId: string;
  product: {
    sku: string;
  };
  instagramCaption: string;
  imagePrompt: string;
  codexReasoning: string;
};

type CampaignSummary = {
  campaignId: string;
  productId: string;
  sku: string;
};

type CampaignImage = {
  imageId: string;
  campaignId: string;
  mimeType: string;
  status: string;
};

type StartedServer = {
  process: ChildProcess;
  logs: () => string;
};

export function resolveLiveIntegrationDatabaseUrl(
  input: ResolveLiveIntegrationDatabaseInput
): ResolvedLiveIntegrationDatabase {
  const resolvedRootDir = resolve(input.rootDir);
  const dataDir = join(resolvedRootDir, "data");
  const databaseUrl =
    input.liveIntegrationDatabaseUrl?.trim() || defaultDatabaseUrl;
  const databasePath = resolveSqliteDatabasePath(databaseUrl, resolvedRootDir);

  assertSafeLiveIntegrationDatabasePath(databasePath, dataDir);
  assertDoesNotReuseUnsafeEnvDatabase({
    databasePath,
    envDatabaseUrl: input.envDatabaseUrl,
    rootDir: resolvedRootDir,
    dataDir
  });

  return {
    databaseUrl,
    databasePath,
    databaseBasename: basename(databasePath)
  };
}

export class CookieJar {
  private readonly cookies = new Map<string, string>();

  storeFromSetCookie(value: string | string[] | null | undefined) {
    for (const setCookie of normalizeSetCookieHeaders(value)) {
      const pair = setCookie.split(";", 1)[0];
      const separatorIndex = pair.indexOf("=");

      if (separatorIndex <= 0) {
        continue;
      }

      const name = pair.slice(0, separatorIndex).trim();
      const cookieValue = pair.slice(separatorIndex + 1);

      if (name) {
        this.cookies.set(name, cookieValue);
      }
    }
  }

  toHeader() {
    return Array.from(this.cookies)
      .map(([name, value]) => `${name}=${value}`)
      .join("; ");
  }

  cookieNames() {
    return Array.from(this.cookies.keys());
  }

  isEmpty() {
    return this.cookies.size === 0;
  }
}

export function isJpegBytes(bytes: Uint8Array) {
  return (
    bytes.length > 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  );
}

async function main() {
  if (process.env.RUN_LIVE_INTEGRATION !== "1") {
    console.log(
      "Skipping live integration suite. Set RUN_LIVE_INTEGRATION=1 to run it."
    );
    return;
  }

  const startedAt = Date.now();
  await loadLocalEnvFile(rootDir);

  const database = resolveLiveIntegrationDatabaseUrl({
    rootDir,
    liveIntegrationDatabaseUrl: process.env.LIVE_INTEGRATION_DATABASE_URL,
    envDatabaseUrl: process.env.DATABASE_URL
  });
  const port = getPositiveIntegerEnv("LIVE_INTEGRATION_PORT", 3210);
  const serverTimeoutMs = getPositiveIntegerEnv(
    "LIVE_INTEGRATION_SERVER_TIMEOUT_MS",
    60000
  );
  const stepTimeoutMs = getPositiveIntegerEnv(
    "LIVE_INTEGRATION_STEP_TIMEOUT_MS",
    180000
  );
  const skipFlow = process.env.LIVE_INTEGRATION_SKIP_FLOW === "1";
  const appBaseUrl = `http://127.0.0.1:${port}`;
  const report = createInitialReport({
    appBaseUrl,
    databaseBasename: database.databaseBasename,
    startedAt
  });
  let server: StartedServer | undefined;
  let artifactPath: string | undefined;

  try {
    if (!skipFlow) {
      assertOpenAiApiKeyReady();
    }

    const liveEnv = buildLiveEnvironment(database.databaseUrl);
    applyLiveEnvironmentToCurrentProcess(liveEnv);

    await prepareLiveDatabase({
      database,
      env: liveEnv
    });

    server = await startAppServer({
      appBaseUrl,
      env: liveEnv,
      port,
      serverTimeoutMs
    });

    report.healthStatus = 200;

    if (skipFlow) {
      report.status = "skipped-flow";
      report.finalCounts = await readDatabaseCounts();
      return;
    }

    await runHttpWorkflow({
      appBaseUrl,
      report,
      stepTimeoutMs
    });
    const codexSessionFiles = await findCodexSessionFiles(startedAt, Date.now());

    if (codexSessionFiles.length === 0) {
      throw new Error("Live integration did not find Codex SDK session JSONL files.");
    }

    report.codexSessionFiles = codexSessionFiles;
    report.finalCounts = await readDatabaseCounts();
    report.status = "passed";
  } catch (error) {
    report.status = "failed";
    report.errorMessage = cleanErrorMessage(error);
    report.serverLogTail = server ? cleanErrorMessage(server.logs()) : undefined;
    throw error;
  } finally {
    if (server) {
      await stopAppServer(server);
    }

    report.durationMs = Date.now() - startedAt;
    artifactPath = await writeReport(report);
    printSummary(report, artifactPath);
  }
}

function resolveSqliteDatabasePath(databaseUrl: string, repoRootDir: string) {
  if (!databaseUrl.startsWith("file:")) {
    throw new Error(
      "Live integration DATABASE_URL must use only file: SQLite URLs."
    );
  }

  if (databaseUrl.startsWith("file:///")) {
    return resolve(fileURLToPath(databaseUrl));
  }

  const sqlitePath = databaseUrl.slice("file:".length);

  if (!sqlitePath) {
    throw new Error("Live integration DATABASE_URL cannot be empty.");
  }

  if (sqlitePath.startsWith("../data/")) {
    return resolve(repoRootDir, "data", sqlitePath.slice("../data/".length));
  }

  if (sqlitePath.startsWith("./data/")) {
    return resolve(repoRootDir, "data", sqlitePath.slice("./data/".length));
  }

  if (isAbsolute(sqlitePath)) {
    return resolve(sqlitePath);
  }

  return resolve(repoRootDir, "prisma", sqlitePath);
}

function assertSafeLiveIntegrationDatabasePath(
  databasePath: string,
  dataDir: string
) {
  const databaseName = basename(databasePath);

  if (!liveDatabaseNamePattern.test(databaseName)) {
    throw new Error(
      "Live integration database basename must match live-integration*.sqlite."
    );
  }

  if (!isInsideDirectory(databasePath, dataDir)) {
    throw new Error(
      "Live integration database must stay inside the repo data directory."
    );
  }
}

function assertDoesNotReuseUnsafeEnvDatabase(input: {
  databasePath: string;
  envDatabaseUrl?: string;
  rootDir: string;
  dataDir: string;
}) {
  if (!input.envDatabaseUrl) {
    return;
  }

  let envDatabasePath: string;

  try {
    envDatabasePath = resolveSqliteDatabasePath(
      input.envDatabaseUrl,
      input.rootDir
    );
  } catch {
    return;
  }

  if (
    envDatabasePath === input.databasePath &&
    !isGuardedLiveIntegrationPath(envDatabasePath, input.dataDir)
  ) {
    throw new Error(
      "Live integration database must not reuse the current unsafe DATABASE_URL target."
    );
  }
}

function isGuardedLiveIntegrationPath(databasePath: string, dataDir: string) {
  return (
    liveDatabaseNamePattern.test(basename(databasePath)) &&
    isInsideDirectory(databasePath, dataDir)
  );
}

function isInsideDirectory(filePath: string, directoryPath: string) {
  const relativePath = relative(directoryPath, filePath);

  return Boolean(relativePath) && !relativePath.startsWith("..") && !isAbsolute(relativePath);
}

function normalizeSetCookieHeaders(value: string | string[] | null | undefined) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  return value.split(/,(?=\s*[^;,=]+=[^;,]+)/);
}

async function loadLocalEnvFile(repoRootDir: string) {
  let contents: string;

  try {
    contents = await readFile(join(repoRootDir, ".env"), "utf8");
  } catch {
    return;
  }

  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(trimmed);

    if (!match) {
      continue;
    }

    const [, key, rawValue] = match;

    if (process.env[key] !== undefined) {
      continue;
    }

    process.env[key] = unquoteEnvValue(rawValue.trim());
  }
}

function unquoteEnvValue(value: string) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function getPositiveIntegerEnv(name: string, defaultValue: number) {
  const rawValue = process.env[name];

  if (!rawValue) {
    return defaultValue;
  }

  const parsed = Number.parseInt(rawValue, 10);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return parsed;
}

function assertOpenAiApiKeyReady() {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    throw new Error(
      "OPENAI_API_KEY is required for the full live integration suite."
    );
  }
}

function buildLiveEnvironment(databaseUrl: string): NodeJS.ProcessEnv {
  return {
    ...process.env,
    DATABASE_URL: databaseUrl,
    SESSION_COOKIE_NAME:
      process.env.SESSION_COOKIE_NAME ?? "ecom_promo_live_session",
    SESSION_TTL_DAYS: process.env.SESSION_TTL_DAYS ?? "7",
    CODEX_GATEWAY: "sdk",
    IMAGE_GENERATION_MODE: "openai",
    PRISMA_SCHEMA_ENGINE_LOG_LEVEL:
      process.env.PRISMA_SCHEMA_ENGINE_LOG_LEVEL ?? "trace",
    RUST_LOG: process.env.RUST_LOG ?? "trace"
  };
}

function applyLiveEnvironmentToCurrentProcess(env: NodeJS.ProcessEnv) {
  process.env.DATABASE_URL = env.DATABASE_URL;
  process.env.SESSION_COOKIE_NAME = env.SESSION_COOKIE_NAME;
  process.env.SESSION_TTL_DAYS = env.SESSION_TTL_DAYS;
  process.env.CODEX_GATEWAY = env.CODEX_GATEWAY;
  process.env.IMAGE_GENERATION_MODE = env.IMAGE_GENERATION_MODE;
}

async function prepareLiveDatabase(input: {
  database: ResolvedLiveIntegrationDatabase;
  env: NodeJS.ProcessEnv;
}) {
  const prismaEnv = {
    ...input.env,
    PRISMA_SCHEMA_ENGINE_LOG_LEVEL: "trace",
    RUST_LOG: "trace"
  };

  await mkdir(join(rootDir, "data"), { recursive: true });

  for (const path of sqliteSidecarPaths(input.database.databasePath)) {
    await rm(path, { force: true });
  }

  await runCommand("pnpm", ["prisma", "db", "push", "--force-reset"], {
    cwd: rootDir,
    env: prismaEnv,
    label: "Prisma schema setup"
  });
  await runCommand("pnpm", ["tsx", "prisma/seed.ts"], {
    cwd: rootDir,
    env: prismaEnv,
    label: "Seed live integration database"
  });
  await runCommand("pnpm", ["tsx", "scripts/verify-seed.ts"], {
    cwd: rootDir,
    env: prismaEnv,
    label: "Verify live integration seed"
  });
}

function sqliteSidecarPaths(databasePath: string) {
  return [
    databasePath,
    `${databasePath}-journal`,
    `${databasePath}-wal`,
    `${databasePath}-shm`
  ];
}

async function runCommand(
  command: string,
  args: string[],
  options: SpawnOptions & { label: string }
) {
  await new Promise<void>((resolvePromise, reject) => {
    const child = spawn(command, args, {
      ...options,
      stdio: "inherit"
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolvePromise();
        return;
      }

      reject(
        new Error(`${options.label} failed with exit code ${code ?? "unknown"}.`)
      );
    });
  });
}

async function startAppServer(input: {
  appBaseUrl: string;
  env: NodeJS.ProcessEnv;
  port: number;
  serverTimeoutMs: number;
}): Promise<StartedServer> {
  let logs = "";
  const child = spawn(
    "pnpm",
    [
      "exec",
      "next",
      "dev",
      "--hostname",
      "127.0.0.1",
      "--port",
      String(input.port)
    ],
    {
      cwd: rootDir,
      env: input.env,
      stdio: ["ignore", "pipe", "pipe"]
    }
  );

  child.stdout?.setEncoding("utf8");
  child.stderr?.setEncoding("utf8");
  child.stdout?.on("data", (chunk) => {
    logs = trimServerLogs(`${logs}${chunk}`);
  });
  child.stderr?.on("data", (chunk) => {
    logs = trimServerLogs(`${logs}${chunk}`);
  });

  const server = {
    process: child,
    logs: () => logs
  };

  await waitForHealth(input.appBaseUrl, server, input.serverTimeoutMs);

  return server;
}

function trimServerLogs(logs: string) {
  return logs.slice(-20000);
}

async function waitForHealth(
  appBaseUrl: string,
  server: StartedServer,
  timeoutMs: number
) {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;

  while (Date.now() < deadline) {
    if (server.process.exitCode !== null || server.process.signalCode !== null) {
      throw new Error(
        `Next dev server exited before becoming ready.\n${server.logs()}`
      );
    }

    try {
      const response = await fetch(`${appBaseUrl}/api/health`);

      if (response.status === 200) {
        return;
      }

      lastError = new Error(`Health returned HTTP ${response.status}.`);
    } catch (error) {
      lastError = error;
    }

    await delay(500);
  }

  throw new Error(
    `Timed out waiting for Next dev server on ${appBaseUrl}. Try LIVE_INTEGRATION_PORT if the port is busy.\nLast error: ${cleanErrorMessage(lastError)}\n${server.logs()}`
  );
}

async function stopAppServer(server: StartedServer) {
  if (server.process.exitCode !== null || server.process.signalCode !== null) {
    return;
  }

  server.process.kill("SIGTERM");

  if (await waitForProcessClose(server.process, 5000)) {
    return;
  }

  server.process.kill("SIGKILL");
  await waitForProcessClose(server.process, 2000);
}

function waitForProcessClose(
  child: ChildProcess,
  timeoutMs: number
) {
  return new Promise<boolean>((resolvePromise) => {
    if (child.exitCode !== null || child.signalCode !== null) {
      resolvePromise(true);
      return;
    }

    const timer = setTimeout(() => {
      resolvePromise(false);
    }, timeoutMs);

    child.once("close", () => {
      clearTimeout(timer);
      resolvePromise(true);
    });
  });
}

async function runHttpWorkflow(input: {
  appBaseUrl: string;
  report: LiveIntegrationReport;
  stepTimeoutMs: number;
}) {
  const cookieJar = new CookieJar();
  const client = new IntegrationHttpClient(input.appBaseUrl, cookieJar);
  let products: Product[] = [];
  let campaign: Campaign | undefined;
  let image: CampaignImage | undefined;

  await runStep(input.report, "health", input.stepTimeoutMs, async (signal) => {
    const body = await client.requestJson({
      method: "GET",
      path: "/api/health",
      expectedStatus: 200,
      signal
    });
    const data = readData<{ status: string }>(body, "health response");

    if (data.status !== "ok") {
      throw new Error("Health response did not return ok.");
    }
  });

  await runStep(
    input.report,
    "protected products reject anonymous access",
    input.stepTimeoutMs,
    async (signal) => {
      const body = await client.requestJson({
        method: "GET",
        path: "/api/products/overview",
        expectedStatus: 401,
        signal
      });

      assertErrorCode(body, "UNAUTHORIZED", "anonymous products overview");
    }
  );

  await runStep(input.report, "login", input.stepTimeoutMs, async (signal) => {
    const body = await client.requestJson({
      method: "POST",
      path: "/api/auth/login",
      expectedStatus: 200,
      body: {
        email: "demo@promo.test",
        password: "demo-password"
      },
      signal
    });
    const data = readData<{ user: { email: string } }>(body, "login response");

    if (data.user.email !== "demo@promo.test" || cookieJar.isEmpty()) {
      throw new Error("Login did not establish the seeded demo session.");
    }
  });

  await runStep(input.report, "session", input.stepTimeoutMs, async (signal) => {
    const body = await client.requestJson({
      method: "GET",
      path: "/api/auth/session",
      expectedStatus: 200,
      signal
    });
    const data = readData<{ user: { email: string } }>(body, "session response");

    if (data.user.email !== "demo@promo.test") {
      throw new Error("Session did not return the seeded demo user.");
    }
  });

  await runStep(
    input.report,
    "product overview",
    input.stepTimeoutMs,
    async (signal) => {
      const body = await client.requestJson({
        method: "GET",
        path: "/api/products/overview",
        expectedStatus: 200,
        signal
      });
      const overview = readData<ProductOverview>(body, "product overview");

      if (
        overview.totalProducts !== 10 ||
        overview.totalAvailableStock < 1 ||
        overview.unitsSoldThisMonth < 1
      ) {
        throw new Error("Product overview did not match seeded demo data.");
      }
    }
  );

  await runStep(
    input.report,
    "product list",
    input.stepTimeoutMs,
    async (signal) => {
      const body = await client.requestJson({
        method: "GET",
        path: "/api/products",
        expectedStatus: 200,
        signal
      });
      const data = readData<{ products: Product[] }>(body, "product list");

      if (!Array.isArray(data.products) || data.products.length !== 10) {
        throw new Error("Product list did not return 10 seeded products.");
      }

      products = data.products;
      input.report.productCount = products.length;
    }
  );

  await runStep(
    input.report,
    "campaign opportunities",
    input.stepTimeoutMs,
    async (signal) => {
      const body = await client.requestJson({
        method: "POST",
        path: "/api/campaign-opportunities",
        expectedStatus: 200,
        signal
      });
      const data = readData<{ opportunities: Opportunity[] }>(
        body,
        "campaign opportunities"
      );
      const productIds = new Set(products.map((product) => product.productId));

      if (!Array.isArray(data.opportunities) || data.opportunities.length < 1) {
        throw new Error("Codex did not return any campaign opportunities.");
      }

      for (const opportunity of data.opportunities) {
        if (!productIds.has(opportunity.productId)) {
          throw new Error(
            `Codex returned an unknown opportunity product ${opportunity.productId}.`
          );
        }
      }

      const selectedProduct = products.find(
        (product) => product.productId === data.opportunities[0]?.productId
      );

      input.report.opportunityCount = data.opportunities.length;
      input.report.selectedProductSku = selectedProduct?.sku;
    }
  );

  await runStep(
    input.report,
    "campaign generation",
    input.stepTimeoutMs,
    async (signal) => {
      const selectedProduct = products.find(
        (product) => product.sku === input.report.selectedProductSku
      );

      if (!selectedProduct) {
        throw new Error("No selected product is available for campaign generation.");
      }

      const body = await client.requestJson({
        method: "POST",
        path: "/api/campaigns/generate",
        expectedStatus: 201,
        body: {
          productId: selectedProduct.productId,
          optionalInstructions:
            "Keep this concise for a live integration smoke."
        },
        signal
      });
      const data = readData<{ campaign: Campaign }>(body, "campaign generation");

      campaign = data.campaign;

      if (
        !campaign.campaignId ||
        !campaign.instagramCaption ||
        !campaign.imagePrompt ||
        !campaign.codexReasoning ||
        campaign.productId !== selectedProduct.productId ||
        campaign.product.sku !== selectedProduct.sku ||
        hasUngroundedFallbackText(campaign.instagramCaption) ||
        hasUngroundedFallbackText(campaign.imagePrompt) ||
        hasUngroundedFallbackText(campaign.codexReasoning)
      ) {
        throw new Error(
          "Generated campaign is missing grounded Codex fields for the selected product."
        );
      }

      input.report.campaignId = campaign.campaignId;
    }
  );

  await runStep(
    input.report,
    "campaign list",
    input.stepTimeoutMs,
    async (signal) => {
      assertCampaign(campaign);

      const body = await client.requestJson({
        method: "GET",
        path: "/api/campaigns",
        expectedStatus: 200,
        signal
      });
      const data = readData<{ campaigns: CampaignSummary[] }>(
        body,
        "campaign list"
      );

      if (
        !data.campaigns.some(
          (recentCampaign) => recentCampaign.campaignId === campaign?.campaignId
        )
      ) {
        throw new Error("Campaign list did not include the generated campaign.");
      }
    }
  );

  await runStep(
    input.report,
    "campaign detail",
    input.stepTimeoutMs,
    async (signal) => {
      assertCampaign(campaign);

      const body = await client.requestJson({
        method: "GET",
        path: `/api/campaigns/${campaign.campaignId}`,
        expectedStatus: 200,
        signal
      });
      const data = readData<{ campaign: Campaign }>(body, "campaign detail");

      if (
        data.campaign.campaignId !== campaign.campaignId ||
        data.campaign.imagePrompt !== campaign.imagePrompt
      ) {
        throw new Error("Campaign detail did not match the generated campaign.");
      }
    }
  );

  await runStep(
    input.report,
    "image generation",
    input.stepTimeoutMs,
    async (signal) => {
      assertCampaign(campaign);

      const body = await client.requestJson({
        method: "POST",
        path: `/api/campaigns/${campaign.campaignId}/images/generate`,
        expectedStatus: 201,
        body: {
          variants: 1
        },
        signal
      });
      const data = readData<{ images: CampaignImage[] }>(body, "image generation");

      if (!Array.isArray(data.images) || data.images.length !== 1) {
        throw new Error("Image generation did not return one image metadata row.");
      }

      image = data.images[0];

      if (
        !image.imageId ||
        image.campaignId !== campaign.campaignId ||
        image.mimeType !== "image/jpeg" ||
        image.status !== "completed" ||
        "imageData" in image
      ) {
        throw new Error("Image generation returned invalid image metadata.");
      }

      input.report.imageId = image.imageId;
      input.report.imageMimeType = image.mimeType;
    }
  );

  await runStep(
    input.report,
    "image list",
    input.stepTimeoutMs,
    async (signal) => {
      assertCampaign(campaign);
      assertImage(image);

      const body = await client.requestJson({
        method: "GET",
        path: `/api/campaigns/${campaign.campaignId}/images`,
        expectedStatus: 200,
        signal
      });
      const data = readData<{ images: CampaignImage[] }>(body, "image list");

      if (
        !data.images.some((listedImage) => listedImage.imageId === image?.imageId)
      ) {
        throw new Error("Image list did not include the generated image.");
      }
    }
  );

  await runStep(
    input.report,
    "raw image bytes",
    input.stepTimeoutMs,
    async (signal) => {
      assertCampaign(campaign);
      assertImage(image);

      const response = await client.requestBytes({
        path: `/api/campaigns/${campaign.campaignId}/images/${image.imageId}`,
        expectedStatus: 200,
        signal
      });

      if (!response.contentType.includes("image/jpeg")) {
        throw new Error("Raw image response did not return image/jpeg.");
      }

      if (!isJpegBytes(response.bytes)) {
        throw new Error("Raw image response did not contain JPEG bytes.");
      }

      input.report.imageByteLength = response.bytes.length;
      input.report.imageMimeType = response.contentType;
    }
  );

  await runStep(input.report, "logout", input.stepTimeoutMs, async (signal) => {
    const body = await client.requestJson({
      method: "POST",
      path: "/api/auth/logout",
      expectedStatus: 200,
      signal
    });
    const data = readData<{ ok: boolean }>(body, "logout response");

    if (data.ok !== true) {
      throw new Error("Logout did not return ok.");
    }
  });

  await runStep(
    input.report,
    "session after logout",
    input.stepTimeoutMs,
    async (signal) => {
      const body = await client.requestJson({
        method: "GET",
        path: "/api/auth/session",
        expectedStatus: 401,
        signal
      });

      assertErrorCode(body, "UNAUTHORIZED", "session after logout");
    }
  );
}

class IntegrationHttpClient {
  constructor(
    private readonly appBaseUrl: string,
    private readonly cookieJar: CookieJar
  ) {}

  async requestJson(input: {
    method: "GET" | "POST";
    path: string;
    expectedStatus: number;
    body?: unknown;
    signal: AbortSignal;
  }) {
    const response = await this.request(input);
    const body = await response.json().catch(() => {
      throw new Error(`${input.method} ${input.path} did not return JSON.`);
    });

    if (response.status !== input.expectedStatus) {
      throw new Error(
        `${input.method} ${input.path} expected HTTP ${input.expectedStatus} but got ${response.status}: ${JSON.stringify(body)}`
      );
    }

    return body;
  }

  async requestBytes(input: {
    path: string;
    expectedStatus: number;
    signal: AbortSignal;
  }) {
    const response = await this.request({
      method: "GET",
      path: input.path,
      expectedStatus: input.expectedStatus,
      signal: input.signal
    });

    if (response.status !== input.expectedStatus) {
      const body = await response.text();
      throw new Error(
        `GET ${input.path} expected HTTP ${input.expectedStatus} but got ${response.status}: ${body}`
      );
    }

    return {
      contentType: response.headers.get("content-type") ?? "",
      bytes: Buffer.from(await response.arrayBuffer())
    };
  }

  private async request(input: {
    method: "GET" | "POST";
    path: string;
    expectedStatus: number;
    body?: unknown;
    signal: AbortSignal;
  }) {
    const headers: Record<string, string> = {};
    const cookieHeader = this.cookieJar.toHeader();

    if (cookieHeader) {
      headers.Cookie = cookieHeader;
    }

    if (input.body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(`${this.appBaseUrl}${input.path}`, {
      method: input.method,
      headers,
      body: input.body === undefined ? undefined : JSON.stringify(input.body),
      signal: input.signal
    });

    this.cookieJar.storeFromSetCookie(readSetCookieHeaders(response));

    return response;
  }
}

function readSetCookieHeaders(response: Response) {
  const headers = response.headers as Headers & {
    getSetCookie?: () => string[];
  };

  return headers.getSetCookie?.() ?? response.headers.get("set-cookie");
}

async function runStep<T>(
  report: LiveIntegrationReport,
  name: string,
  timeoutMs: number,
  work: (signal: AbortSignal) => Promise<T>
) {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const result = await work(controller.signal);

    report.steps.push({
      name,
      status: "passed",
      durationMs: Date.now() - startedAt
    });

    return result;
  } catch (error) {
    report.failedStep = name;
    report.steps.push({
      name,
      status: "failed",
      durationMs: Date.now() - startedAt
    });

    if (controller.signal.aborted) {
      throw new Error(`Step "${name}" timed out after ${timeoutMs}ms.`, {
        cause: error
      });
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function readData<T>(body: unknown, context: string): T {
  const envelope = assertRecord(body, context);

  if (!("data" in envelope)) {
    throw new Error(`${context} did not include a data envelope.`);
  }

  return envelope.data as T;
}

function assertErrorCode(body: unknown, code: string, context: string) {
  const envelope = assertRecord(body, context);
  const error = assertRecord(envelope.error, `${context} error`);

  if (error.code !== code) {
    throw new Error(`${context} did not return error code ${code}.`);
  }
}

function assertRecord(value: unknown, context: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${context} was not an object.`);
  }

  return value as Record<string, unknown>;
}

function assertCampaign(campaign: Campaign | undefined): asserts campaign is Campaign {
  if (!campaign) {
    throw new Error("Generated campaign is not available.");
  }
}

function assertImage(image: CampaignImage | undefined): asserts image is CampaignImage {
  if (!image) {
    throw new Error("Generated image is not available.");
  }
}

export function hasUngroundedFallbackText(value: string) {
  return /\bUNAVAILABLE\b/i.test(value) || /product was not found/i.test(value);
}

async function findCodexSessionFiles(startedAt: number, endedAt: number) {
  const codexHome = resolveCodexHome();
  const sessionDirs = getCodexSessionDateDirs(codexHome, startedAt, endedAt);
  const sessionFiles: string[] = [];

  for (const sessionDir of sessionDirs) {
    let entries;

    try {
      entries = await readdir(sessionDir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".jsonl")) {
        continue;
      }

      const filePath = join(sessionDir, entry.name);
      const fileStats = await stat(filePath);

      if (
        fileStats.mtimeMs < startedAt - 5000 ||
        fileStats.mtimeMs > endedAt + 5000
      ) {
        continue;
      }

      if (await isCodexSdkSessionFile(filePath)) {
        sessionFiles.push(relative(codexHome, filePath));
      }
    }
  }

  return sessionFiles.sort();
}

function resolveCodexHome() {
  return defaultCodexHome;
}

function resolveCodexWorkspace() {
  return defaultCodexWorkspace;
}

function resolveCodexModel() {
  return defaultCodexModel;
}

function resolveCodexReasoningEffort() {
  return defaultCodexReasoningEffort;
}

function getCodexSessionDateDirs(
  codexHome: string,
  startedAt: number,
  endedAt: number
) {
  const dirs = new Set<string>();
  const dayMs = 24 * 60 * 60 * 1000;

  for (let time = startOfLocalDay(startedAt); time <= endedAt; time += dayMs) {
    const date = new Date(time);
    const year = String(date.getFullYear());
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    dirs.add(join(codexHome, "sessions", year, month, day));
  }

  return Array.from(dirs);
}

function startOfLocalDay(timestamp: number) {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);

  return date.getTime();
}

async function isCodexSdkSessionFile(filePath: string) {
  const firstLine = (await readFile(filePath, "utf8")).split(/\r?\n/, 1)[0];

  if (!firstLine) {
    return false;
  }

  try {
    const parsed = JSON.parse(firstLine) as {
      type?: string;
      payload?: {
        cwd?: string;
        source?: unknown;
      };
    };

    return (
      parsed.type === "session_meta" &&
      parsed.payload?.cwd === resolveCodexWorkspace() &&
      parsed.payload.source === "exec"
    );
  } catch {
    return false;
  }
}

async function readDatabaseCounts(): Promise<DatabaseCounts> {
  const { prisma } = await import("@/server/db/client");

  try {
    const [users, sessions, products, productSales, campaigns, campaignImages] =
      await Promise.all([
        prisma.user.count(),
        prisma.session.count(),
        prisma.product.count(),
        prisma.productSale.count(),
        prisma.campaign.count(),
        prisma.campaignImage.count()
      ]);

    return {
      users,
      sessions,
      products,
      productSales,
      campaigns,
      campaignImages
    };
  } finally {
    await prisma.$disconnect();
  }
}

function createInitialReport(input: {
  appBaseUrl: string;
  databaseBasename: string;
  startedAt: number;
}): LiveIntegrationReport {
  return {
    timestamp: new Date(input.startedAt).toISOString(),
    appBaseUrl: input.appBaseUrl,
    databaseBasename: input.databaseBasename,
    codexGatewayMode: "sdk",
    codexHome: resolveCodexHome(),
    codexWorkspace: resolveCodexWorkspace(),
    codexModel: resolveCodexModel(),
    codexReasoningEffort: resolveCodexReasoningEffort(),
    imageGenerationMode: "openai",
    status: "failed",
    durationMs: 0,
    steps: []
  };
}

async function writeReport(report: LiveIntegrationReport) {
  const outputDir = join(rootDir, "output", "live-integration");
  const safeTimestamp = report.timestamp.replaceAll(":", "-").replace(".", "-");
  const reportPath = join(outputDir, `${safeTimestamp}.json`);

  await mkdir(outputDir, { recursive: true });
  await writeFile(`${reportPath}.tmp`, `${JSON.stringify(report, null, 2)}\n`);
  await rm(reportPath, { force: true });
  await rename(`${reportPath}.tmp`, reportPath);

  return reportPath;
}

function printSummary(report: LiveIntegrationReport, artifactPath: string) {
  const relativeArtifactPath = relative(rootDir, artifactPath);

  if (report.status === "skipped-flow") {
    console.log(
      `Live integration server smoke passed: health=${report.healthStatus}, artifact=${relativeArtifactPath}`
    );
    return;
  }

  if (report.status === "passed") {
    console.log(
      [
        "Live integration passed:",
        `products=${report.productCount}`,
        `sku=${report.selectedProductSku}`,
        `campaign=${report.campaignId}`,
        `image=${report.imageId}`,
        `bytes=${report.imageByteLength}`,
        `artifact=${relativeArtifactPath}`
      ].join(" ")
    );
    return;
  }

  console.error(
    [
      "Live integration failed:",
      `step=${report.failedStep ?? "setup"}`,
      `message=${report.errorMessage ?? "unknown error"}`,
      `artifact=${relativeArtifactPath}`
    ].join(" ")
  );
}

function cleanErrorMessage(error: unknown) {
  let message =
    error instanceof Error ? error.message : String(error ?? "unknown error");
  const secrets = [process.env.OPENAI_API_KEY];

  for (const secret of secrets) {
    if (!secret) {
      continue;
    }

    message = message.replaceAll(secret, "[redacted]");
  }

  return message;
}

function delay(ms: number) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

if (resolve(process.argv[1] ?? "") === currentFilePath) {
  main().catch((error) => {
    console.error(cleanErrorMessage(error));
    process.exit(1);
  });
}
