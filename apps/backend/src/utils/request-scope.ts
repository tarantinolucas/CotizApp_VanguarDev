import type { Request } from "express";
import { isSuperAdmin } from "./access.js";

export function parseNumericId(value: unknown) {
  const n = typeof value === "string" ? Number(value) : typeof value === "number" ? value : NaN;
  return Number.isFinite(n) ? n : null;
}

export function getScopedCompanyId(req: Request) {
  return isSuperAdmin(req.user)
    ? (parseNumericId(req.query?.id_empresa) ?? req.user?.empresaId ?? null)
    : (req.user?.empresaId ?? null);
}

export function getCompanyIdForWrite(req: Request) {
  if (!req.user) {
    return null;
  }
  if (isSuperAdmin(req.user)) {
    return parseNumericId(req.body?.id_empresa) ?? req.user.empresaId;
  }
  return req.user.empresaId;
}
