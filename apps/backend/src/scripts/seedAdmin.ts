import crypto from "node:crypto";
import { inspect, promisify } from "node:util";
import { pool } from "../config/database.js";
import { isRole } from "../utils/access.js";

const scryptAsync = promisify(crypto.scrypt);

async function hashPassword(password: string) {
  const salt = crypto.randomBytes(16);
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  return `scrypt:${salt.toString("hex")}:${derivedKey.toString("hex")}`;
}

async function main() {
  const nombre = process.env.ADMIN_NAME ?? "Administrador";
  const email = process.env.ADMIN_EMAIL ?? "admin@cotizapp.local";
  const password = process.env.ADMIN_PASSWORD ?? "admin123";
  const roleFromEnv = process.env.ADMIN_ROLE ?? "SuperAdmin";
  const rol = isRole(roleFromEnv) ? roleFromEnv : "SuperAdmin";
  const companyName = process.env.ADMIN_COMPANY_NAME ?? "Empresa Principal";

  const passwordHash = await hashPassword(password);
  const companyResult = await pool.query<{ id: string | number }>(
    `
      insert into empresas (nombre)
      values ($1)
      on conflict (nombre) do update set nombre = excluded.nombre
      returning id
    `,
    [companyName]
  );
  const companyId = Number(companyResult.rows[0]?.id);
  if (!Number.isFinite(companyId)) {
    throw new Error("company_seed_failed");
  }

  await pool.query(
    `
      insert into usuarios (id_empresa, nombre, email, password_hash, rol, activo)
      values ($1, $2, $3, $4, $5, true)
      on conflict (email)
      do update set
        id_empresa = excluded.id_empresa,
        nombre = excluded.nombre,
        password_hash = excluded.password_hash,
        rol = excluded.rol,
        activo = true
    `,
    [companyId, nombre, email, passwordHash, rol]
  );

  process.stdout.write(`Seed OK: usuario listo (${email}) rol=${rol} empresa=${companyName}\n`);
  await pool.end();
}

main().catch(async (error) => {
  const message =
    error instanceof Error
      ? `${error.name}: ${error.message || "(sin mensaje)"}\n${error.stack ?? ""}`
      : inspect(error, { depth: 6, colors: false });
  process.stderr.write(`Seed ERROR:\n${message}\n`);
  try {
    await pool.end();
  } catch {
    // ignore
  }
  process.exit(1);
});

