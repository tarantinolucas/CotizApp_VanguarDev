import { pool } from "../config/database.js";

export type ConfigRow = {
  id_empresa?: string | number | null;
  clave: string;
  valor: string;
};

export async function getConfig(clave: string, companyId: number) {
  const result = await pool.query<ConfigRow>(
    "SELECT id_empresa, clave, valor FROM configuraciones WHERE id_empresa = $1 AND clave = $2 LIMIT 1",
    [companyId, clave]
  );
  return result.rows[0] ?? null;
}

export async function setConfig(companyId: number, clave: string, valor: string) {
  const result = await pool.query<ConfigRow>(
    `
      INSERT INTO configuraciones (id_empresa, clave, valor)
      VALUES ($1, $2, $3)
      ON CONFLICT (id_empresa, clave) DO UPDATE SET valor = EXCLUDED.valor
      RETURNING id_empresa, clave, valor
    `,
    [companyId, clave, valor]
  );
  return result.rows[0];
}
