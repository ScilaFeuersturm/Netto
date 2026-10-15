import { Paths } from 'expo-file-system';

import { notifyDataChanged } from './db';
import { deleteSecureItem, getSecureItem, setSecureItem } from './secureStorage';

/**
 * Guarda qué usuario tiene la sesión abierta, en Keychain/Keystore. La sesión persiste hasta que el
 * usuario cierra sesión (con bloqueo por inactividad, ver AppLock).
 */
const USER_ID_KEY = 'session_user_id';

/** ID (UUID de Supabase) del usuario con la sesión abierta en este dispositivo. */
export function currentUserId(): string | null {
  return getSecureItem(USER_ID_KEY);
}

export function requireUserId(): string {
  const id = currentUserId();
  if (id == null) throw new Error('No hay una sesión activa');
  return id;
}

export async function startSession(userId: string): Promise<void> {
  setSecureItem(USER_ID_KEY, userId);
  notifyDataChanged();
}

export async function clearSession(): Promise<void> {
  await deleteSecureItem(USER_ID_KEY);
  clearTemporaryFiles();
  notifyDataChanged();
}

/** Borra la caché de la app: fotos de facturas escaneadas e imágenes procesadas. */
function clearTemporaryFiles(): void {
  try {
    for (const item of Paths.cache.list()) {
      try {
        item.delete();
      } catch {
        // Un archivo en uso no impide borrar el resto.
      }
    }
  } catch {
    // Sin caché no hay nada que borrar.
  }
}
