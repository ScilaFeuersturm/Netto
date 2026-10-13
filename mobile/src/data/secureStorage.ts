import { getRandomBytes } from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import Storage from 'expo-sqlite/kv-store';

/**
 * Datos sensibles guardados con las APIs seguras del sistema: Keychain en iOS y
 * Keystore (EncryptedSharedPreferences) en Android. Solo se pueden leer con el
 * dispositivo desbloqueado y no viajan a backups ni a otro dispositivo.
 */
const OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export function getSecureItem(key: string): string | null {
  const value = SecureStore.getItem(key, OPTIONS);
  return value === '' ? null : value;
}

export function setSecureItem(key: string, value: string): void {
  SecureStore.setItem(key, value, OPTIONS);
}

export async function deleteSecureItem(key: string): Promise<void> {
  await SecureStore.deleteItemAsync(key, OPTIONS);
}

const DATABASE_KEY = 'database_key';
const INSTALL_MARKER = 'install_marker';
/** Todo lo que se guarda en el Keychain/Keystore; ver resetSecureStateOnFreshInstall. */
const ALL_SECURE_KEYS = [DATABASE_KEY, 'session_user_id', 'lock_last_active_at', 'lock_biometric_unlock'];

/**
 * En iOS el Keychain sobrevive a la desinstalación de la app. En la primera ejecución después de
 * instalar (el almacenamiento común sí se borra al desinstalar) se descartan la sesión y la clave
 * de la base que hubieran quedado. Tiene que ejecutarse antes de leer cualquier dato seguro.
 */
export function resetSecureStateOnFreshInstall(): void {
  if (Storage.getItemSync(INSTALL_MARKER) === 'true') return;
  for (const key of ALL_SECURE_KEYS) SecureStore.setItem(key, '', OPTIONS);
  Storage.setItemSync(INSTALL_MARKER, 'true');
}

/** Clave de cifrado de la base local (256 bits al azar), creada la primera vez que se abre la app. */
export function getOrCreateDatabaseKey(): string {
  const existing = getSecureItem(DATABASE_KEY);
  if (existing && /^[0-9a-f]{64}$/.test(existing)) return existing;
  const key = Array.from(getRandomBytes(32), (b) => b.toString(16).padStart(2, '0')).join('');
  setSecureItem(DATABASE_KEY, key);
  return key;
}
