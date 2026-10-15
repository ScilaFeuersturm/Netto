import { hashPassword, verifyPassword } from '@/data/passwordHasher';

jest.mock('expo-crypto', () => ({
  getRandomBytes: (n: number) => Uint8Array.from({ length: n }, (_, i) => (i * 37 + 11) % 256),
}));

// En Jest no hay módulo nativo: se usa el PBKDF2 en JavaScript (120.000 iteraciones), que es lento.
jest.setTimeout(30_000);

test('el hash verifica la contraseña correcta y rechaza otra', async () => {
  const stored = await hashPassword('secreto123');
  expect(stored.split('$')).toHaveLength(4);
  expect(stored.startsWith('PBKDF2WithHmacSHA256$120000$')).toBe(true);
  await expect(verifyPassword('secreto123', stored)).resolves.toBe(true);
  await expect(verifyPassword('otra-clave', stored)).resolves.toBe(false);
});

test('verifica hashes con el formato de la app Android (SHA1, otras iteraciones)', async () => {
  // Generado (con javax.crypto o el pbkdf2Sync de Node) con PBKDF2WithHmacSHA1, 1000 iteraciones, sal "salt1234salt1234", clave "password", 32 bytes.
  const stored = 'PBKDF2WithHmacSHA1$1000$c2FsdDEyMzRzYWx0MTIzNA==$7wvfz0L7fcQhWdeuVCayZy56YtbODbzM7jk4WUeNa8c=';
  await expect(verifyPassword('password', stored)).resolves.toBe(true);
  await expect(verifyPassword('Password', stored)).resolves.toBe(false);
});

test('rechaza formatos inválidos', async () => {
  await expect(verifyPassword('x', 'basura')).resolves.toBe(false);
  await expect(verifyPassword('x', 'MD5$1$YQ==$YQ==')).resolves.toBe(false);
});

