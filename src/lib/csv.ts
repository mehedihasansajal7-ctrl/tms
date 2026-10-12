import * as XLSX from "xlsx";

function toPlain(v: unknown): unknown {
  if (v instanceof Date) return v.toISOString();
  if (v === null || v === undefined) return "";
  return v;
}

function flatten(obj: Record<string, unknown>, prefix = ""): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v) && !(v instanceof Date)) {
      Object.assign(out, flatten(v as Record<string, unknown>, key));
    } else {
      out[key] = toPlain(v);
    }
  }
  return out;
}

// Normalize arbitrary report output into a flat list of rows.
export function normalizeRows(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) {
    return data.map((item) => (item && typeof item === "object" ? flatten(item as Record<string, unknown>) : { value: toPlain(item) }));
  }
  if (data && typeof data === "object") {
    return Object.entries(data as Record<string, unknown>).map(([k, v]) =>
      v && typeof v === "object" && !Array.isArray(v)
        ? { key: k, ...flatten(v as Record<string, unknown>) }
        : { label: k, value: toPlain(v) },
    );
  }
  return [{ value: toPlain(data) }];
}

export function toCsv(rows: Record<string, unknown>[]): string {
  const sheet = XLSX.utils.json_to_sheet(rows);
  return XLSX.utils.sheet_to_csv(sheet);
}

export function toExcelBuffer(rows: Record<string, unknown>[], sheetName = "Report"): Buffer {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), sheetName);
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
