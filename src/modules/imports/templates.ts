import * as XLSX from "xlsx";

// Downloadable import templates (spec §56). Each template has a header row and
// one example row.

const USER_HEADERS = ["Name", "Email", "Phone", "Employee ID", "Department", "Designation", "Role", "Status"];
const DRIVER_HEADERS = ["Name", "Email", "Phone", "License Number", "License Expiry (YYYY-MM-DD)", "Status", "Operational Status"];
const VEHICLE_HEADERS = ["Registration Number", "Vehicle Type", "Capacity", "Status"];

const USER_EXAMPLE = ["Rahim Uddin", "rahim@company.com", "01710000000", "EMP-1001", "Finance", "Officer", "USER", "ACTIVE"];
const DRIVER_EXAMPLE = ["Karim Driver", "karim@company.com", "01810000000", "DL-123456", "2027-12-31", "ACTIVE", "AVAILABLE"];
const VEHICLE_EXAMPLE = ["DHA-M-1122", "MEDIUM", "5", "AVAILABLE"];

function csv(headers: string[], example: string[]): string {
  const esc = (s: string) => `"${String(s).replace(/"/g, '""')}"`;
  return [headers.map(esc).join(","), example.map(esc).join(",")].join("\n");
}

export function userTemplateCsv(): string {
  return csv(USER_HEADERS, USER_EXAMPLE);
}
export function driverTemplateCsv(): string {
  return csv(DRIVER_HEADERS, DRIVER_EXAMPLE);
}
export function vehicleTemplateCsv(): string {
  return csv(VEHICLE_HEADERS, VEHICLE_EXAMPLE);
}

// Combined workbook with Users / Drivers / Vehicles sheets (spec §55, §65).
export function combinedTemplateBuffer(): Buffer {
  const wb = XLSX.utils.book_new();
  const users = XLSX.utils.aoa_to_sheet([USER_HEADERS, USER_EXAMPLE]);
  const drivers = XLSX.utils.aoa_to_sheet([DRIVER_HEADERS, DRIVER_EXAMPLE]);
  const vehicles = XLSX.utils.aoa_to_sheet([VEHICLE_HEADERS, VEHICLE_EXAMPLE]);
  XLSX.utils.book_append_sheet(wb, users, "Users");
  XLSX.utils.book_append_sheet(wb, drivers, "Drivers");
  XLSX.utils.book_append_sheet(wb, vehicles, "Vehicles");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

export function workbookToBuffer(aoaBySheet: Record<string, unknown[][]>): Buffer {
  const wb = XLSX.utils.book_new();
  for (const [name, aoa] of Object.entries(aoaBySheet)) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), name);
  }
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

export function csvToBuffer(text: string): Buffer {
  return Buffer.from("\uFEFF" + text, "utf-8"); // BOM for Excel
}
