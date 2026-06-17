export function validarCUIT(cuit: string): boolean {
  const cleaned = cuit.replace(/[- ]/g, "");
  if (cleaned.length !== 11 || !/^\d+$/.test(cleaned)) return false;

  const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  let suma = 0;

  for (let i = 0; i < 10; i++) {
    suma += parseInt(cleaned[i], 10) * pesos[i];
  }

  const resto = suma % 11;
  let resultado = 11 - resto;

  if (resultado === 11) resultado = 0;
  if (resultado === 10) return false;

  return resultado === parseInt(cleaned[10], 10);
}
