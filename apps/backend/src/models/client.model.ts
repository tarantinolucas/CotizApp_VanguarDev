import { pool } from "../config/database.js";

export type ClientRow = {
  id: string | number;
  id_empresa?: string | number;
  nombre_empresa: string;
  contacto_principal: string | null;
  cuit_tax_id: string | null;
  clasificacion: string | null;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  codigo_postal: string | null;
  pais: string | null;
  provincia: string | null;
  estado: string;
  ult_contacto: Date | string | null;
};

export type ClientInput = {
  nombre_empresa: string;
  contacto_principal: string | null;
  cuit_tax_id: string | null;
  clasificacion: string | null;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  codigo_postal: string | null;
  pais: string | null;
  provincia: string | null;
  estado: string;
  ult_contacto: Date | string | null;
};

export async function listClients(companyId?: number | null) {
  const values: unknown[] = [];
  const whereSql =
    companyId !== undefined && companyId !== null
      ? (() => {
          values.push(companyId);
          return `where id_empresa = $${values.length}`;
        })()
      : "";
  const result = await pool.query<ClientRow>(
    `select id, nombre_empresa, contacto_principal, cuit_tax_id, clasificacion, email, telefono, direccion, codigo_postal, pais, provincia, estado, ult_contacto
     from clientes
     ${whereSql}
     order by id desc`,
    values
  );
  return result.rows;
}

export async function getClientById(id: number, companyId?: number | null) {
  const values: unknown[] = [id];
  const companySql =
    companyId !== undefined && companyId !== null
      ? (() => {
          values.push(companyId);
          return `and id_empresa = $${values.length}`;
        })()
      : "";
  const result = await pool.query<ClientRow>(
    `select id, nombre_empresa, contacto_principal, cuit_tax_id, clasificacion, email, telefono, direccion, codigo_postal, pais, provincia, estado, ult_contacto
     from clientes
     where id = $1
     ${companySql}
     limit 1`,
    values
  );
  return result.rows[0] ?? null;
}

export async function createClient(companyId: number, input: ClientInput) {
  const result = await pool.query<ClientRow>(
    `
      insert into clientes (id_empresa, nombre_empresa, contacto_principal, cuit_tax_id, clasificacion, email, telefono, direccion, codigo_postal, pais, provincia, estado, ult_contacto)
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      returning id, nombre_empresa, contacto_principal, cuit_tax_id, clasificacion, email, telefono, direccion, codigo_postal, pais, provincia, estado, ult_contacto
    `,
    [
      companyId,
      input.nombre_empresa,
      input.contacto_principal,
      input.cuit_tax_id,
      input.clasificacion,
      input.email,
      input.telefono,
      input.direccion,
      input.codigo_postal,
      input.pais,
      input.provincia,
      input.estado,
      input.ult_contacto
    ]
  );
  return result.rows[0];
}

export async function updateClient(id: number, input: ClientInput, companyId?: number | null) {
  const values: unknown[] = [
    id,
    input.nombre_empresa,
    input.contacto_principal,
    input.cuit_tax_id,
    input.clasificacion,
    input.email,
    input.telefono,
    input.direccion,
    input.codigo_postal,
    input.pais,
    input.provincia,
    input.estado,
    input.ult_contacto
  ];
  const companySql =
    companyId !== undefined && companyId !== null
      ? (() => {
          values.push(companyId);
          return `and id_empresa = $${values.length}`;
        })()
      : "";
  const result = await pool.query<ClientRow>(
    `
      update clientes
      set
        nombre_empresa = $2,
        contacto_principal = $3,
        cuit_tax_id = $4,
        clasificacion = $5,
        email = $6,
        telefono = $7,
        direccion = $8,
        codigo_postal = $9,
        pais = $10,
        provincia = $11,
        estado = $12,
        ult_contacto = $13
      where id = $1
      ${companySql}
      returning id, nombre_empresa, contacto_principal, cuit_tax_id, clasificacion, email, telefono, direccion, codigo_postal, pais, provincia, estado, ult_contacto
    `,
    values
  );
  return result.rows[0] ?? null;
}

export async function deleteClient(id: number, companyId?: number | null) {
  const values: unknown[] = [id];
  const companySql =
    companyId !== undefined && companyId !== null
      ? (() => {
          values.push(companyId);
          return `and id_empresa = $${values.length}`;
        })()
      : "";
  const result = await pool.query<{ id: string | number }>(
    `delete from clientes where id = $1 ${companySql} returning id`,
    values
  );
  return (result.rows[0]?.id ?? null) !== null;
}
