-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "employeeId" TEXT NOT NULL,
    "department" TEXT,
    "designation" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Driver" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "licenseNumber" TEXT NOT NULL,
    "licenseExpiry" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "operationalStatus" TEXT NOT NULL DEFAULT 'AWAITING_CONFIRMATION',
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "VehicleType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "registrationNumber" TEXT NOT NULL,
    "vehicleTypeId" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Vehicle_vehicleTypeId_fkey" FOREIGN KEY ("vehicleTypeId") REFERENCES "VehicleType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TransportRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestNumber" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "startDateTime" DATETIME NOT NULL,
    "endDateTime" DATETIME NOT NULL,
    "requestedVehicleTypeId" TEXT NOT NULL,
    "passengerCount" INTEGER NOT NULL,
    "destination" TEXT NOT NULL,
    "specialInstructions" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "approvedBy" TEXT,
    "approvedAt" DATETIME,
    "approvalComment" TEXT,
    "rejectedBy" TEXT,
    "rejectedAt" DATETIME,
    "rejectionReason" TEXT,
    "assignedVehicleTypeId" TEXT,
    "alternativeReason" TEXT,
    "alternativeExplanation" TEXT,
    "cancelledBy" TEXT,
    "cancelledAt" DATETIME,
    "cancellationReason" TEXT,
    "cancellationActorRole" TEXT,
    "cancellationNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TransportRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TransportRequest_requestedVehicleTypeId_fkey" FOREIGN KEY ("requestedVehicleTypeId") REFERENCES "VehicleType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TransportRequest_assignedVehicleTypeId_fkey" FOREIGN KEY ("assignedVehicleTypeId") REFERENCES "VehicleType" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RequestApproval" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RequestApproval_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "TransportRequest" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RequestApproval_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Passenger" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pickupLocation" TEXT NOT NULL,
    "destination" TEXT,
    "specialInstructions" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Passenger_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "TransportRequest" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VehicleBooking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "startDateTime" DATETIME NOT NULL,
    "endDateTime" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "assignedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VehicleBooking_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "TransportRequest" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "VehicleBooking_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DriverAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "startDateTime" DATETIME NOT NULL,
    "endDateTime" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "assignedBy" TEXT,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DriverAssignment_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "TransportRequest" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DriverAssignment_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DriverAvailabilityHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "driverId" TEXT NOT NULL,
    "previousStatus" TEXT,
    "newStatus" TEXT NOT NULL,
    "reason" TEXT,
    "changedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DriverAvailabilityHistory_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "driverId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "refType" TEXT,
    "refId" TEXT,
    "readAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Notification_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actorId" TEXT,
    "actorKind" TEXT,
    "actorName" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "previousData" TEXT,
    "newData" TEXT,
    "reason" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ImportJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fileName" TEXT NOT NULL,
    "importType" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "successfulRows" INTEGER NOT NULL DEFAULT 0,
    "failedRows" INTEGER NOT NULL DEFAULT 0,
    "skippedRows" INTEGER NOT NULL DEFAULT 0,
    "updatedRows" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "duplicateMode" TEXT NOT NULL DEFAULT 'SKIP',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    CONSTRAINT "ImportJob_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ImportRow" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "importJobId" TEXT NOT NULL,
    "sheet" TEXT,
    "rowNumber" INTEGER NOT NULL,
    "valid" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "errors" TEXT,
    "data" TEXT,
    CONSTRAINT "ImportRow_importJobId_fkey" FOREIGN KEY ("importJobId") REFERENCES "ImportJob" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Sequence" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" INTEGER NOT NULL DEFAULT 0
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_employeeId_key" ON "User"("employeeId");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE INDEX "User_department_idx" ON "User"("department");

-- CreateIndex
CREATE UNIQUE INDEX "Driver_email_key" ON "Driver"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Driver_licenseNumber_key" ON "Driver"("licenseNumber");

-- CreateIndex
CREATE INDEX "Driver_status_idx" ON "Driver"("status");

-- CreateIndex
CREATE INDEX "Driver_operationalStatus_idx" ON "Driver"("operationalStatus");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleType_name_key" ON "VehicleType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_registrationNumber_key" ON "Vehicle"("registrationNumber");

-- CreateIndex
CREATE INDEX "Vehicle_status_idx" ON "Vehicle"("status");

-- CreateIndex
CREATE INDEX "Vehicle_vehicleTypeId_idx" ON "Vehicle"("vehicleTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "TransportRequest_requestNumber_key" ON "TransportRequest"("requestNumber");

-- CreateIndex
CREATE INDEX "TransportRequest_status_idx" ON "TransportRequest"("status");

-- CreateIndex
CREATE INDEX "TransportRequest_requesterId_idx" ON "TransportRequest"("requesterId");

-- CreateIndex
CREATE INDEX "TransportRequest_startDateTime_idx" ON "TransportRequest"("startDateTime");

-- CreateIndex
CREATE INDEX "TransportRequest_endDateTime_idx" ON "TransportRequest"("endDateTime");

-- CreateIndex
CREATE INDEX "RequestApproval_requestId_idx" ON "RequestApproval"("requestId");

-- CreateIndex
CREATE INDEX "Passenger_requestId_idx" ON "Passenger"("requestId");

-- CreateIndex
CREATE INDEX "VehicleBooking_requestId_idx" ON "VehicleBooking"("requestId");

-- CreateIndex
CREATE INDEX "VehicleBooking_vehicleId_idx" ON "VehicleBooking"("vehicleId");

-- CreateIndex
CREATE INDEX "VehicleBooking_status_idx" ON "VehicleBooking"("status");

-- CreateIndex
CREATE INDEX "VehicleBooking_startDateTime_idx" ON "VehicleBooking"("startDateTime");

-- CreateIndex
CREATE INDEX "VehicleBooking_endDateTime_idx" ON "VehicleBooking"("endDateTime");

-- CreateIndex
CREATE INDEX "DriverAssignment_requestId_idx" ON "DriverAssignment"("requestId");

-- CreateIndex
CREATE INDEX "DriverAssignment_driverId_idx" ON "DriverAssignment"("driverId");

-- CreateIndex
CREATE INDEX "DriverAssignment_status_idx" ON "DriverAssignment"("status");

-- CreateIndex
CREATE INDEX "DriverAssignment_startDateTime_idx" ON "DriverAssignment"("startDateTime");

-- CreateIndex
CREATE INDEX "DriverAssignment_endDateTime_idx" ON "DriverAssignment"("endDateTime");

-- CreateIndex
CREATE INDEX "DriverAvailabilityHistory_driverId_idx" ON "DriverAvailabilityHistory"("driverId");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_driverId_idx" ON "Notification"("driverId");

-- CreateIndex
CREATE INDEX "Notification_readAt_idx" ON "Notification"("readAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "ImportJob_importType_idx" ON "ImportJob"("importType");

-- CreateIndex
CREATE INDEX "ImportJob_status_idx" ON "ImportJob"("status");

-- CreateIndex
CREATE INDEX "ImportRow_importJobId_idx" ON "ImportRow"("importJobId");
