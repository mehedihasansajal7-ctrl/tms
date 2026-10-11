// Central source of truth for all domain constants and "enum" values.
// The database stores these as strings (SQLite has no native enums); the
// values are validated here and in the Zod schemas, so they map 1:1 to native
// enums if the project is moved to PostgreSQL.

export const ROLES = { ADMIN: "ADMIN", USER: "USER", DRIVER: "DRIVER" } as const;
export type Role = (typeof ROLES)[keyof typeof ROLES];

export const USER_STATUS = { ACTIVE: "ACTIVE", INACTIVE: "INACTIVE" } as const;
export type UserStatus = (typeof USER_STATUS)[keyof typeof USER_STATUS];

export const DRIVER_STATUS = { ACTIVE: "ACTIVE", INACTIVE: "INACTIVE" } as const;

export const VEHICLE_STATUS = {
  AVAILABLE: "AVAILABLE",
  MAINTENANCE: "MAINTENANCE",
  INACTIVE: "INACTIVE",
} as const;
export type VehicleStatus = (typeof VEHICLE_STATUS)[keyof typeof VEHICLE_STATUS];

export const DRIVER_OPERATIONAL_STATUS = {
  AVAILABLE: "AVAILABLE",
  UNAVAILABLE: "UNAVAILABLE",
  AWAITING_CONFIRMATION: "AWAITING_CONFIRMATION",
} as const;
export type DriverOperationalStatus =
  (typeof DRIVER_OPERATIONAL_STATUS)[keyof typeof DRIVER_OPERATIONAL_STATUS];

export const REQUEST_STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  ASSIGNED: "ASSIGNED",
  ON_TRIP: "ON_TRIP",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
  REJECTED: "REJECTED",
} as const;
export type RequestStatus = (typeof REQUEST_STATUS)[keyof typeof REQUEST_STATUS];

export const APPROVAL_ACTION = {
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  REOPENED: "REOPENED",
} as const;
export type ApprovalAction = (typeof APPROVAL_ACTION)[keyof typeof APPROVAL_ACTION];

export const BOOKING_STATUS = {
  ACTIVE: "ACTIVE",
  RELEASED: "RELEASED",
  CANCELLED: "CANCELLED",
  COMPLETED: "COMPLETED",
} as const;

export const ALTERNATIVE_REASONS = {
  REQUESTED_VEHICLE_UNAVAILABLE: "REQUESTED_VEHICLE_UNAVAILABLE",
  REQUESTED_VEHICLE_ALREADY_BOOKED: "REQUESTED_VEHICLE_ALREADY_BOOKED",
  VEHICLE_UNDER_MAINTENANCE: "VEHICLE_UNDER_MAINTENANCE",
  OPERATIONAL_REQUIREMENT: "OPERATIONAL_REQUIREMENT",
  PASSENGER_CAPACITY_REQUIREMENT: "PASSENGER_CAPACITY_REQUIREMENT",
  OTHER: "OTHER",
} as const;
export type AlternativeReason =
  (typeof ALTERNATIVE_REASONS)[keyof typeof ALTERNATIVE_REASONS];

export const IMPORT_TYPES = {
  USERS: "USERS",
  DRIVERS: "DRIVERS",
  VEHICLES: "VEHICLES",
  COMBINED: "COMBINED",
} as const;
export type ImportType = (typeof IMPORT_TYPES)[keyof typeof IMPORT_TYPES];

// Allowed request state transitions (spec §46).
export const STATUS_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  [REQUEST_STATUS.PENDING]: [
    REQUEST_STATUS.APPROVED,
    REQUEST_STATUS.REJECTED,
    REQUEST_STATUS.CANCELLED,
  ],
  [REQUEST_STATUS.APPROVED]: [
    REQUEST_STATUS.ASSIGNED,
    REQUEST_STATUS.PENDING,
    REQUEST_STATUS.CANCELLED,
  ],
  [REQUEST_STATUS.ASSIGNED]: [
    REQUEST_STATUS.ON_TRIP,
    REQUEST_STATUS.CANCELLED,
    REQUEST_STATUS.ASSIGNED,
  ],
  [REQUEST_STATUS.ON_TRIP]: [REQUEST_STATUS.COMPLETED],
  [REQUEST_STATUS.COMPLETED]: [],
  [REQUEST_STATUS.REJECTED]: [REQUEST_STATUS.PENDING],
  [REQUEST_STATUS.CANCELLED]: [REQUEST_STATUS.PENDING],
};

export function canTransition(from: RequestStatus, to: RequestStatus): boolean {
  return (STATUS_TRANSITIONS[from] ?? []).includes(to);
}

// Human-friendly labels for UI badges/selects.
export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  ASSIGNED: "Assigned",
  ON_TRIP: "On Trip",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  REJECTED: "Rejected",
};

export const DRIVER_OPERATIONAL_LABELS: Record<DriverOperationalStatus, string> = {
  AVAILABLE: "Available",
  UNAVAILABLE: "Unavailable",
  AWAITING_CONFIRMATION: "Awaiting Confirmation",
};

export const VEHICLE_STATUS_LABELS: Record<VehicleStatus, string> = {
  AVAILABLE: "Available",
  MAINTENANCE: "Maintenance",
  INACTIVE: "Inactive",
};

export const ALTERNATIVE_REASON_LABELS: Record<AlternativeReason, string> = {
  REQUESTED_VEHICLE_UNAVAILABLE: "Requested vehicle unavailable",
  REQUESTED_VEHICLE_ALREADY_BOOKED: "Requested vehicle already booked",
  VEHICLE_UNDER_MAINTENANCE: "Vehicle under maintenance",
  OPERATIONAL_REQUIREMENT: "Operational requirement",
  PASSENGER_CAPACITY_REQUIREMENT: "Passenger capacity requirement",
  OTHER: "Other",
};
