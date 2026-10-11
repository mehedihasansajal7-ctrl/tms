// Application-level error with a safe HTTP status and message.
// Route handlers catch this and return a clean JSON error (never raw internals).

export class AppError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(message: string, status = 400, code?: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function isAppError(e: unknown): e is AppError {
  return e instanceof AppError;
}

// Standard error codes for the frontend to key off of.
export const ErrorCodes = {
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  VALIDATION: "VALIDATION",
  INVALID_TRANSITION: "INVALID_TRANSITION",
  APPROVAL_REQUIRED: "APPROVAL_REQUIRED",
  VEHICLE_UNAVAILABLE: "VEHICLE_UNAVAILABLE",
  DRIVER_UNAVAILABLE: "DRIVER_UNAVAILABLE",
  VEHICLE_CONFLICT: "VEHICLE_CONFLICT",
  DRIVER_CONFLICT: "DRIVER_CONFLICT",
  CAPACITY_EXCEEDED: "CAPACITY_EXCEEDED",
  CANCELLATION_NOT_ALLOWED: "CANCELLATION_NOT_ALLOWED",
  CONFLICT: "CONFLICT",
} as const;
