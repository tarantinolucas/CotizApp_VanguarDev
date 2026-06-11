import type { Request, Response } from "express";
import {
  createCompany,
  deactivateCompany,
  getCompanyById,
  listCompanies,
  updateCompany
} from "../models/company.model.js";
import { parseNumericId } from "../utils/request-scope.js";

function toNonEmptyString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export async function listCompaniesHandler(req: Request, res: Response) {
  const includeInactive = req.query?.include_inactive === "true";
  const items = await listCompanies({ includeInactive });
  res.json({
    ok: true,
    items: items.map((item) => ({ ...item, id: Number(item.id) }))
  });
}

export async function getCompanyHandler(req: Request, res: Response) {
  const id = parseNumericId(req.params.id);
  if (!id) {
    res.status(400).json({ ok: false, error: "invalid_id" });
    return;
  }

  const item = await getCompanyById(id);
  if (!item) {
    res.status(404).json({ ok: false, error: "not_found" });
    return;
  }

  res.json({ ok: true, item: { ...item, id: Number(item.id) } });
}

export async function createCompanyHandler(req: Request, res: Response) {
  const nombre = toNonEmptyString(req.body?.nombre);
  if (!nombre) {
    res.status(400).json({ ok: false, error: "nombre_required" });
    return;
  }

  const item = await createCompany({ nombre });
  res.status(201).json({ ok: true, item: { ...item, id: Number(item.id) } });
}

export async function updateCompanyHandler(req: Request, res: Response) {
  const id = parseNumericId(req.params.id);
  if (!id) {
    res.status(400).json({ ok: false, error: "invalid_id" });
    return;
  }

  const nombre = req.body?.nombre === undefined ? undefined : toNonEmptyString(req.body?.nombre);
  if (req.body?.nombre !== undefined && !nombre) {
    res.status(400).json({ ok: false, error: "nombre_required" });
    return;
  }

  const item = await updateCompany(id, {
    nombre: nombre ?? undefined,
    activo: typeof req.body?.activo === "boolean" ? req.body.activo : undefined
  });

  if (!item) {
    res.status(404).json({ ok: false, error: "not_found" });
    return;
  }

  res.json({ ok: true, item: { ...item, id: Number(item.id) } });
}

export async function deactivateCompanyHandler(req: Request, res: Response) {
  const id = parseNumericId(req.params.id);
  if (!id) {
    res.status(400).json({ ok: false, error: "invalid_id" });
    return;
  }

  const ok = await deactivateCompany(id);
  if (!ok) {
    res.status(404).json({ ok: false, error: "not_found" });
    return;
  }

  res.json({ ok: true });
}
