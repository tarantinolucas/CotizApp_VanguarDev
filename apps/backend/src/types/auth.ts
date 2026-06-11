import type { UserRole } from "./index.js";

export type AuthUser = {
  id: number;
  empresaId: number | null;
  empresaNombre: string | null;
  nombre: string;
  email: string;
  rol: UserRole;
};
