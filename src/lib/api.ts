import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { isAppError } from "./errors";

export function json(data: unknown, init?: number | ResponseInit) {
  return typeof init === "number" ? NextResponse.json(data, { status: init }) : NextResponse.json(data, init);
}

export type Handler = (req: Request, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>;

// Wrap a route handler: AppError → its status, ZodError → 400, unknown → 500.
export function handle(fn: Handler): Handler {
  return async (req, ctx) => {
    try {
      return await fn(req, ctx);
    } catch (e) {
      if (isAppError(e)) {
        return NextResponse.json({ error: e.message, code: e.code, details: e.details }, { status: e.status });
      }
      if (e instanceof ZodError) {
        const first = e.issues[0];
        return NextResponse.json(
          { error: first?.message ?? "Invalid input", code: "VALIDATION", details: e.issues },
          { status: 400 },
        );
      }
      console.error("[api]", e);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  };
}

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const body = await req.json();
    return body ?? {};
  } catch {
    return {};
  }
}
