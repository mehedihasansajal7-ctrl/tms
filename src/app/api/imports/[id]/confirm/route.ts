import { z } from "zod";
import { handle, json, readJson } from "@/lib/api";
import { requireAdmin } from "@/lib/rbac";
import { requireSession } from "@/lib/session";
import { confirmImport } from "@/modules/imports/import.service";

const schema = z.object({ duplicateMode: z.enum(["SKIP", "UPDATE", "REJECT"]).default("SKIP") });

export const POST = handle(async (req, ctx) => {
  const session = requireAdmin(await requireSession());
  const { id } = await ctx.params;
  const body = schema.parse(await readJson(req));
  return json(await confirmImport(id, body.duplicateMode, { id: session.sub, name: session.name }));
});
