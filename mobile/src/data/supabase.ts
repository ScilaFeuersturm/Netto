import { createClient, type SupabaseClient, type SupportedStorage } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import { openDatabase } from './db';

/**
 * Cliente de Supabase. La URL y la clave pública (anon/publishable) vienen de variables de entorno
 * EXPO_PUBLIC_*, que Expo incluye en la app; la clave pública está pensada para estar en el cliente
 * (la seguridad la dan las políticas RLS del servidor).
 *
 * La sesión (tokens) se guarda en la base local cifrada con SQLCipher, cuya clave vive en el
 * Keychain/Keystore: el mismo nivel de protección que recomienda Supabase (AES + clave en SecureStore)
 * sin sumar otra librería de cifrado.
 */
/**
 * En Android, "127.0.0.1" es el propio teléfono. Para usar el Supabase local desde un emulador o un
 * celular conectado por cable: `adb reverse tcp:54321 tcp:54321` (y `tcp:8081` para Metro).
 */
function supabaseUrl(): string {
  return process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
}

const encryptedStorage: SupportedStorage = {
  async getItem(key) {
    const db = await openDatabase();
    const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM auth_storage WHERE key = ?', key);
    return row?.value ?? null;
  },
  async setItem(key, value) {
    const db = await openDatabase();
    await db.runAsync('INSERT OR REPLACE INTO auth_storage (key, value) VALUES (?, ?)', key, value);
  },
  async removeItem(key) {
    const db = await openDatabase();
    await db.runAsync('DELETE FROM auth_storage WHERE key = ?', key);
  },
};

export const isSupabaseConfigured = Boolean(process.env.EXPO_PUBLIC_SUPABASE_URL && process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

export const supabase: SupabaseClient = createClient(supabaseUrl() || 'http://127.0.0.1:54321', process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'sin-configurar', {
  auth: {
    storage: encryptedStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    // Los links de los emails (confirmar cuenta, recuperar contraseña) vuelven a la app con un código.
    flowType: 'pkce',
  },
});

// Los tokens se renuevan solo con la app en primer plano (recomendación de Supabase para apps móviles).
AppState.addEventListener('change', (state) => {
  if (state === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});
