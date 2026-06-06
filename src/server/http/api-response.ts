import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { AppError, isAppError } from "@/server/errors";

export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function errorResponse(error: unknown) {
  const appError = normalizeError(error);

  return NextResponse.json(
    {
      error: {
        code: appError.code,
        message: appError.message
      }
    },
    { status: appError.status }
  );
}

function normalizeError(error: unknown) {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof ZodError) {
    return new AppError("VALIDATION_ERROR", "Invalid request payload.", 400);
  }

  return new AppError("INTERNAL_ERROR", "Internal server error.", 500);
}
