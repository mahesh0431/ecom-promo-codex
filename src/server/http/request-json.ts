import { AppError } from "@/server/errors";

export async function readJsonRequest(request: Request) {
  const body = await readBodyText(request);

  if (!body.trim()) {
    throw new AppError("VALIDATION_ERROR", "Invalid request payload.", 400);
  }

  return parseJsonBody(body);
}

export async function readOptionalJsonRequest(request: Request) {
  const body = await readBodyText(request);

  if (!body.trim()) {
    return undefined;
  }

  return parseJsonBody(body);
}

async function readBodyText(request: Request) {
  try {
    return await request.text();
  } catch {
    throw new AppError("VALIDATION_ERROR", "Invalid request payload.", 400);
  }
}

function parseJsonBody(body: string) {
  try {
    return JSON.parse(body);
  } catch {
    throw new AppError("VALIDATION_ERROR", "Invalid request payload.", 400);
  }
}
