import { AppError, ErrorCodes } from "@/lib/errors";
import { handle, json } from "@/lib/api";
import { requireAdmin } from "@/lib/rbac";
import { requireSession } from "@/lib/session";
import { parseImportFile, stageImport } from "@/modules/imports/import.service";

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

export const POST = handle(async (req) => {
  const session = requireAdmin(await requireSession());
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) throw new AppError("No file uploaded", 400, ErrorCodes.VALIDATION);

  if (file.size > MAX_FILE_BYTES) {
    throw new AppError("File exceeds the 10 MB limit", 400, ErrorCodes.VALIDATION);
  }
  const name = file.name.toLowerCase();
  if (!name.endsWith(".xlsx") && !name.endsWith(".csv")) {
    throw new AppError("Only .xlsx and .csv files are supported", 400, ErrorCodes.VALIDATION);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const { sheets, detectedType } = parseImportFile(buffer);

  const importType = (form.get("importType") as string)?.toUpperCase() || detectedType;
  const result = await stageImport({ id: session.sub, name: session.name }, file.name, importType as never, sheets);

  return json(result);
});
