import { LOCK_AFTER_MS, shouldLock } from '@/domain/lockPolicy';
import { passwordProblem } from '@/domain/passwordPolicy';

test('política de contraseñas: largo, letras y números', () => {
  expect(passwordProblem('abc12')).toBe('Usá al menos 8 caracteres');
  expect(passwordProblem('12345678')).toBe('Agregá al menos una letra');
  expect(passwordProblem('solamenteletras')).toBe('Agregá al menos un número');
  expect(passwordProblem('secreto123')).toBeNull();
  expect(passwordProblem('contraseñá9')).toBeNull();
});

test('bloqueo por inactividad', () => {
  const now = 1_000_000_000;
  expect(shouldLock(null, now)).toBe(false);
  expect(shouldLock(now - LOCK_AFTER_MS, now)).toBe(false);
  expect(shouldLock(now - LOCK_AFTER_MS - 1, now)).toBe(true);
});
