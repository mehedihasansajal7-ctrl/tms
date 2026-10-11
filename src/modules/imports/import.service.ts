import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { AppError, ErrorCodes } from "@/lib/errors";
import { ROLES, VEHICLE_STATUS, DRIVER_OPERATIONAL_STATUS } from "@/lib/constants";
import { hashPassword } from "../auth/auth.service";
import { writeAudit } from "@/lib/audit";

export type ImportType = "USERS" | "DRIVERS" | "VEHICLES" | "COMBINED";
export type DuplicateMode = "SKIP" | "UPDATE" | "REJECT";

interface RawSheet {
  name: string;
  rows: Record<string, unknown>[];
}

// --- Parsing ---------------------------------------------------------------

function normalizeKey(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const SHEET_TYPE: Record<string, ImportType> = {
  users: "USERS",
  drivers: "DRIVERS",
  vehicles: "VEHICLES",
};

export function parseImportFile(buffer: Buffer): { sheets: RawSheet[]; detectedType: ImportType } {
  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(buffer, { type: "buffer" });
  } catch {
    throw new AppError("Could not parse file. Upload a valid .xlsx or .csv file.", 400, ErrorCodes.VALIDATION);
  }

  const sheets: RawSheet[] = wb.SheetNames.map((name) => {
    const sheet = wb.Sheets[name];
    const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
    const rows = raw.map((r) => {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(r)) out[normalizeKey(String(k))] = v;
      return out;
    });
    return { name, rows };
  }).filter((s) => s.rows.length > 0);

  if (sheets.length === 0) throw new AppError("No data rows found in the file", 400, ErrorCodes.VALIDATION);

  const isCombined = sheets.length > 1;
  const firstType = SHEET_TYPE[normalizeKey(sheets[0].name)] ?? detectType(sheets[0]);
  const detectedType: ImportType = isCombined ? "COMBINED" : firstType;
  return { sheets, detectedType };
}

function detectType(sheet: RawSheet): ImportType {
  const keys = Object.keys(sheet.rows[0] || {});
  if (keys.includes("licensenumber")) return "DRIVERS";
  if (keys.includes("registrationnumber")) return "VEHICLES";
  return "USERS";
}

const str = (v: unknown): string => (v == null ? "" : String(v).trim());
const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const isDate = (v: unknown): v is Date => v instanceof Date;

// --- Validation ------------------------------------------------------------

interface ValidatedRow {
  sheet: string;
  rowNumber: number;
  data: Record<string, unknown>;
  valid: boolean;
  status: "VALID" | "ERROR" | "DUPLICATE";
  errors: string[];
}

async function validateUsers(sheet: RawSheet, existing: { emails: Set<string>; employeeIds: Set<string> }): Promise<ValidatedRow[]> {
  const seenEmail = new Set<string>();
  const seenEmp = new Set<string>();
  return sheet.rows.map((r, i) => {
    const errors: string[] = [];
    const email = str(r.email).toLowerCase();
    const employeeId = str(r.employeeid);
    const name = str(r.name);
    const role = str(r.role).toUpperCase() || ROLES.USER;
    const status = str(r.status).toUpperCase() || "ACTIVE";

    if (!name) errors.push("Name is required");
    if (!email) errors.push("Email is required");
    else if (!emailOk(email)) errors.push("Invalid email address");
    if (!employeeId) errors.push("Employee ID is required");
    if (role !== ROLES.ADMIN && role !== ROLES.USER) errors.push(`Invalid role: ${role}`);
    if (status !== "ACTIVE" && status !== "INACTIVE") errors.push(`Invalid status: ${status}`);

    let statusFlag: ValidatedRow["status"] = "VALID";
    if (email && (existing.emails.has(email) || seenEmail.has(email))) { statusFlag = "DUPLICATE"; errors.push("Duplicate email"); }
    if (employeeId && (existing.employeeIds.has(employeeId) || seenEmp.has(employeeId))) { statusFlag = "DUPLICATE"; errors.push("Duplicate employee ID"); }
    seenEmail.add(email);
    seenEmp.add(employeeId);

    return {
      sheet: sheet.name,
      rowNumber: i + 2,
      data: { name, email, phone: str(r.phone), employeeId, department: str(r.department), designation: str(r.designation), role, status },
      valid: errors.length === 0,
      status: statusFlag,
      errors,
    };
  });
}

async function validateDrivers(sheet: RawSheet, existing: { emails: Set<string>; licenses: Set<string> }): Promise<ValidatedRow[]> {
  const seenEmail = new Set<string>();
  const seenLic = new Set<string>();
  return sheet.rows.map((r, i) => {
    const errors: string[] = [];
    const name = str(r.name);
    const email = str(r.email).toLowerCase();
    const licenseNumber = str(r.licensenumber);
    const status = str(r.status).toUpperCase() || "ACTIVE";
    const operational = str(r.operationalstatus).toUpperCase() || DRIVER_OPERATIONAL_STATUS.AWAITING_CONFIRMATION;
    const expiry = r.licenseexpiry;

    if (!name) errors.push("Name is required");
    if (!email) errors.push("Email is required");
    else if (!emailOk(email)) errors.push("Invalid email address");
    if (!licenseNumber) errors.push("License number is required");
    if (status !== "ACTIVE" && status !== "INACTIVE") errors.push(`Invalid status: ${status}`);
    if (!Object.values(DRIVER_OPERATIONAL_STATUS).includes(operational as never)) errors.push(`Invalid operational status: ${operational}`);
    if (expiry && expiry !== "" && !isDate(expiry) && isNaN(Date.parse(str(expiry)))) errors.push("Invalid license expiry date");

    let statusFlag: ValidatedRow["status"] = "VALID";
    if (email && (existing.emails.has(email) || seenEmail.has(email))) { statusFlag = "DUPLICATE"; errors.push("Duplicate email"); }
    if (licenseNumber && (existing.licenses.has(licenseNumber) || seenLic.has(licenseNumber))) { statusFlag = "DUPLICATE"; errors.push("Duplicate license number"); }
    seenEmail.add(email);
    seenLic.add(licenseNumber);

    const licenseExpiry = isDate(expiry) ? expiry : expiry && expiry !== "" ? new Date(str(expiry)) : null;
    return {
      sheet: sheet.name,
      rowNumber: i + 2,
      data: { name, email, phone: str(r.phone), licenseNumber, licenseExpiry, status, operationalStatus: operational },
      valid: errors.length === 0,
      status: statusFlag,
      errors,
    };
  });
}

async function validateVehicles(sheet: RawSheet, existing: { registrations: Set<string> }, typesByName: Map<string, { id: string; capacity: number }>): Promise<ValidatedRow[]> {
  const seenReg = new Set<string>();
  return sheet.rows.map((r, i) => {
    const errors: string[] = [];
    const registrationNumber = str(r.registrationnumber).toUpperCase();
    const vehicleType = str(r.vehicletype).toUpperCase();
    const status = str(r.status).toUpperCase() || VEHICLE_STATUS.AVAILABLE;
    const type = typesByName.get(vehicleType);

    if (!registrationNumber) errors.push("Registration number is required");
    if (!vehicleType) errors.push("Vehicle type is required");
    else if (!type) errors.push(`Unknown vehicle type: ${vehicleType}`);
    if (status !== VEHICLE_STATUS.AVAILABLE && status !== VEHICLE_STATUS.MAINTENANCE && status !== VEHICLE_STATUS.INACTIVE) errors.push(`Invalid status: ${status}`);

    let statusFlag: ValidatedRow["status"] = "VALID";
    if (registrationNumber && (existing.registrations.has(registrationNumber) || seenReg.has(registrationNumber))) { statusFlag = "DUPLICATE"; errors.push("Duplicate registration number"); }
    seenReg.add(registrationNumber);

    return {
      sheet: sheet.name,
      rowNumber: i + 2,
      data: { registrationNumber, vehicleType, vehicleTypeId: type?.id ?? null, capacity: type?.capacity ?? null, status },
      valid: errors.length === 0,
      status: statusFlag,
      errors,
    };
  });
}

// --- Stage (preview) -------------------------------------------------------

export async function stageImport(uploader: { id: string; name: string }, fileName: string, importType: ImportType, sheets: RawSheet[]) {
  const [users, drivers, vehicles, vehicleTypes] = await Promise.all([
    prisma.user.findMany({ select: { email: true, employeeId: true } }),
    prisma.driver.findMany({ select: { email: true, licenseNumber: true } }),
    prisma.vehicle.findMany({ select: { registrationNumber: true } }),
    prisma.vehicleType.findMany({ select: { id: true, name: true, capacity: true } }),
  ]);

  const typesByName = new Map(vehicleTypes.map((t) => [t.name, t]));

  const all: ValidatedRow[] = [];
  for (const sheet of sheets) {
    const sheetType = (importType === "COMBINED" ? (SHEET_TYPE[normalizeKey(sheet.name)] ?? detectType(sheet)) : importType);
    if (sheetType === "USERS") {
      all.push(...await validateUsers(sheet, { emails: new Set(users.map((u) => u.email)), employeeIds: new Set(users.map((u) => u.employeeId)) }));
    } else if (sheetType === "DRIVERS") {
      all.push(...await validateDrivers(sheet, { emails: new Set(drivers.map((d) => d.email)), licenses: new Set(drivers.map((d) => d.licenseNumber)) }));
    } else if (sheetType === "VEHICLES") {
      all.push(...await validateVehicles(sheet, { registrations: new Set(vehicles.map((v) => v.registrationNumber)) }, typesByName));
    }
  }

  const job = await prisma.importJob.create({
    data: {
      fileName,
      importType,
      uploadedById: uploader.id,
      totalRows: all.length,
      status: "PENDING",
    },
  });
  await prisma.importRow.createMany({
    data: all.map((r) => ({
      importJobId: job.id,
      sheet: r.sheet,
      rowNumber: r.rowNumber,
      valid: r.valid,
      status: r.status === "ERROR" ? "ERROR" : r.status === "DUPLICATE" ? "DUPLICATE" : "VALID",
      errors: JSON.stringify(r.errors),
      data: JSON.stringify(r.data),
    })),
  });

  const summary = {
    total: all.length,
    valid: all.filter((r) => r.valid).length,
    errors: all.filter((r) => !r.valid && r.status !== "DUPLICATE").length,
    duplicates: all.filter((r) => r.status === "DUPLICATE").length,
  };

  await writeAudit({
    actorId: uploader.id,
    actorKind: "USER",
    actorName: uploader.name,
    action: "IMPORT_STAGED",
    entityType: "ImportJob",
    entityId: job.id,
    metadata: { fileName, importType, ...summary },
  });

  return { importId: job.id, summary };
}

// --- Confirm / import ------------------------------------------------------

export async function confirmImport(importId: string, duplicateMode: DuplicateMode, uploader: { id: string; name: string }) {
  const job = await prisma.importJob.findUnique({ where: { id: importId }, include: { rows: true } });
  if (!job) throw new AppError("Import job not found", 404, ErrorCodes.NOT_FOUND);
  if (job.status === "COMPLETED") throw new AppError("Import already completed", 400, ErrorCodes.VALIDATION);

  await prisma.importJob.update({ where: { id: importId }, data: { status: "PROCESSING", duplicateMode } });

  let successful = 0, failed = 0, skipped = 0, updated = 0;

  for (const row of job.rows) {
    if (!row.valid || row.status === "ERROR") {
      failed += 1;
      await prisma.importRow.update({ where: { id: row.id }, data: { status: "ERROR" } });
      continue;
    }
    const data = JSON.parse(row.data ?? "{}");

    try {
      if (row.status === "DUPLICATE") {
        if (duplicateMode === "REJECT") {
          failed += 1;
          await prisma.importRow.update({ where: { id: row.id }, data: { status: "ERROR", errors: JSON.stringify(["Duplicate — rejected per import settings"]) } });
          continue;
        }
        if (duplicateMode === "SKIP") {
          skipped += 1;
          await prisma.importRow.update({ where: { id: row.id }, data: { status: "SKIPPED" } });
          continue;
        }
        // UPDATE mode falls through to upsert-like update below.
      }

      if (job.importType === "COMBINED" || SHEET_TYPE[normalizeKey(row.sheet ?? "")] || job.importType) {
        const sheetType = job.importType === "COMBINED" ? (SHEET_TYPE[normalizeKey(row.sheet ?? "")] ?? detectTypeFromData(data)) : job.importType;

        if (sheetType === "USERS") await importUser(data, duplicateMode);
        else if (sheetType === "DRIVERS") await importDriver(data, duplicateMode);
        else if (sheetType === "VEHICLES") await importVehicle(data, duplicateMode);
      }

      if (row.status === "DUPLICATE" && duplicateMode === "UPDATE") updated += 1;
      else successful += 1;
      await prisma.importRow.update({ where: { id: row.id }, data: { status: row.status === "DUPLICATE" && duplicateMode === "UPDATE" ? "UPDATED" : "IMPORTED" } });
    } catch (e) {
      failed += 1;
      await prisma.importRow.update({ where: { id: row.id }, data: { status: "ERROR", errors: JSON.stringify([e instanceof Error ? e.message : "Import failed"]) } });
    }
  }

  const completed = await prisma.importJob.update({
    where: { id: importId },
    data: { status: "COMPLETED", completedAt: new Date(), successfulRows: successful, failedRows: failed, skippedRows: skipped, updatedRows: updated },
  });

  await writeAudit({
    actorId: uploader.id,
    actorKind: "USER",
    actorName: uploader.name,
    action: "IMPORT_CONFIRMED",
    entityType: "ImportJob",
    entityId: importId,
    metadata: { duplicateMode, successful, failed, skipped, updated },
  });

  return { importId, successful, failed, skipped, updated, status: completed.status };
}

function detectTypeFromData(data: Record<string, unknown>): ImportType {
  if ("licensenumber" in data) return "DRIVERS";
  if ("registrationnumber" in data) return "VEHICLES";
  return "USERS";
}

async function importUser(data: Record<string, unknown>, mode: DuplicateMode) {
  const email = String(data.email);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (mode !== "UPDATE") return;
    await prisma.user.update({
      where: { email },
      data: { name: String(data.name), phone: String(data.phone) || null, department: String(data.department) || null, designation: String(data.designation) || null, role: String(data.role), status: String(data.status) },
    });
    return;
  }
  await prisma.user.create({
    data: {
      name: String(data.name),
      email,
      phone: String(data.phone) || null,
      employeeId: String(data.employeeId),
      department: String(data.department) || null,
      designation: String(data.designation) || null,
      role: String(data.role),
      status: String(data.status),
      passwordHash: hashPassword("ChangeMe123!"),
    },
  });
}

async function importDriver(data: Record<string, unknown>, mode: DuplicateMode) {
  const email = String(data.email);
  const existing = await prisma.driver.findUnique({ where: { email } });
  if (existing) {
    if (mode !== "UPDATE") return;
    await prisma.driver.update({
      where: { email },
      data: { name: String(data.name), phone: String(data.phone) || null, licenseNumber: String(data.licenseNumber), licenseExpiry: data.licenseExpiry ? new Date(data.licenseExpiry as string | Date) : null, status: String(data.status), operationalStatus: String(data.operationalStatus) },
    });
    return;
  }
  await prisma.driver.create({
    data: {
      name: String(data.name),
      email,
      phone: String(data.phone) || null,
      licenseNumber: String(data.licenseNumber),
      licenseExpiry: data.licenseExpiry ? new Date(data.licenseExpiry as string | Date) : null,
      status: String(data.status),
      operationalStatus: String(data.operationalStatus),
      passwordHash: hashPassword("ChangeMe123!"),
    },
  });
}

async function importVehicle(data: Record<string, unknown>, mode: DuplicateMode) {
  const registrationNumber = String(data.registrationNumber);
  const existing = await prisma.vehicle.findUnique({ where: { registrationNumber } });
  if (existing) {
    if (mode !== "UPDATE") return;
    await prisma.vehicle.update({
      where: { registrationNumber },
      data: { vehicleTypeId: String(data.vehicleTypeId), capacity: Number(data.capacity), status: String(data.status) },
    });
    return;
  }
  await prisma.vehicle.create({
    data: {
      registrationNumber,
      vehicleTypeId: String(data.vehicleTypeId),
      capacity: Number(data.capacity),
      status: String(data.status),
    },
  });
}

export async function listImportHistory() {
  return prisma.importJob.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { uploadedBy: { select: { name: true } } },
  });
}

export async function getImportJob(id: string) {
  const job = await prisma.importJob.findUnique({ where: { id }, include: { rows: { orderBy: { rowNumber: "asc" } }, uploadedBy: { select: { name: true } } } });
  if (!job) throw new AppError("Import job not found", 404, ErrorCodes.NOT_FOUND);
  return job;
}
