export const MIN_PASSWORD_LENGTH = 8;

export const PASSWORD_HINT = `Mínimo ${MIN_PASSWORD_LENGTH} caracteres, con letras y números`;

/** Devuelve qué le falta a la contraseña, o null si cumple la política. */
export function passwordProblem(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) return `Usá al menos ${MIN_PASSWORD_LENGTH} caracteres`;
  if (!/\p{L}/u.test(password)) return 'Agregá al menos una letra';
  if (!/\d/.test(password)) return 'Agregá al menos un número';
  return null;
}
