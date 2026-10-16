import type { AuthError, User as SupabaseUser } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';

import { LEGAL_VERSION } from '@/domain/legal';
import { syncNow } from '@/sync/scheduler';
import { pendingChanges } from '@/sync/engine';

import { getDb, notifyDataChanged, openDatabase, USER_TABLES } from './db';
import { hashPassword, verifyPassword } from './passwordHasher';
import { deleteSecureItem, getSecureItem, setSecureItem } from './secureStorage';
import { clearSession, currentUserId, startSession } from './session';
import { supabase } from './supabase';

/**
 * Cuentas en Supabase (email + contraseña). La contraseña nunca se guarda en el teléfono; solo un
 * verificador PBKDF2 en el Keychain/Keystore, para poder desbloquear la app sin conexión.
 */
export type AuthResult =
  | { ok: true; needsConfirmation?: boolean }
  | { ok: false; message: string };

const UNLOCK_VERIFIER_KEY = 'unlock_verifier';
/** true mientras la app misma cierra sesión (para no reaccionar a su propio evento SIGNED_OUT). */
let signingOut = false;

/** Adonde vuelven los links de los emails (confirmar cuenta, recuperar contraseña). */
export function authRedirectUrl(type?: 'recovery'): string {
  return Linking.createURL('auth/callback', type ? { queryParams: { type } } : undefined);
}

function messageFor(error: AuthError | Error): string {
  const code = 'code' in error ? (error as AuthError).code : undefined;
  if (code === 'invalid_credentials') return 'Email o contraseña incorrectos.';
  if (code === 'email_not_confirmed') return 'Todavía no confirmaste tu email. Revisá tu casilla (y la carpeta de spam).';
  if (code === 'user_already_exists' || code === 'email_exists') return 'Ya existe una cuenta con ese email.';
  if (code === 'weak_password') return 'La contraseña es muy débil: usá al menos 8 caracteres, con letras y números.';
  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit') {
    return 'Hiciste muchos intentos seguidos. Esperá unos minutos y probá de nuevo.';
  }
  if (/network|fetch|timeout/i.test(error.message)) return 'No pudimos conectarnos. Revisá tu conexión a internet.';
  return 'Algo salió mal. Probá de nuevo en unos minutos.';
}

/** Deja todo listo en el teléfono para el usuario que acaba de entrar y baja sus datos. */
async function onSignedIn(user: SupabaseUser, password?: string): Promise<void> {
  await openDatabase();
  if (password) setSecureItem(UNLOCK_VERIFIER_KEY, await hashPassword(password));
  const name = typeof user.user_metadata?.name === 'string' ? user.user_metadata.name : '';
  await getDb().runAsync(
    `INSERT INTO profile (user_id, name, email, updated_at, deleted, dirty) VALUES (?, ?, ?, 0, 0, 0)
     ON CONFLICT(user_id) DO UPDATE SET email = excluded.email`,
    user.id, name, user.email ?? '',
  );
  await startSession(user.id);
  // La primera sincronización baja los datos de la cuenta (si ya existían en otro dispositivo).
  await syncNow().catch(() => {});
  notifyDataChanged();
}

export async function register(name: string, email: string, password: string): Promise<AuthResult> {
  try {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        // Queda registrado qué versión de los términos y la política aceptó y cuándo.
        data: { name: name.trim(), legal_version: LEGAL_VERSION, legal_accepted_at: new Date().toISOString() },
        emailRedirectTo: authRedirectUrl(),
      },
    });
    if (error) return { ok: false, message: messageFor(error) };
    // Supabase no avisa si el email ya existe (para no revelar cuentas): devuelve un usuario sin identidades.
    if (data.user && data.user.identities?.length === 0) {
      return { ok: false, message: 'Ya existe una cuenta con ese email.' };
    }
    if (!data.session || !data.user) return { ok: true, needsConfirmation: true };
    await onSignedIn(data.user, password);
    return { ok: true };
  } catch (error) {
    return { ok: false, message: messageFor(error as Error) };
  }
}

export async function login(email: string, password: string): Promise<AuthResult> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (error || !data.user) return { ok: false, message: messageFor(error ?? new Error('sin usuario')) };
    await onSignedIn(data.user, password);
    return { ok: true };
  } catch (error) {
    return { ok: false, message: messageFor(error as Error) };
  }
}

export type LogoutResult = { ok: true } | { ok: false; pendingChanges: number };

/**
 * Cierra sesión y borra los datos del teléfono (quedan en la nube). Antes intenta subir los cambios
 * pendientes; si no puede, avisa cuántos se perderían salvo que se fuerce.
 */
export async function logout({ force = false }: { force?: boolean } = {}): Promise<LogoutResult> {
  const userId = currentUserId();
  if (userId && !force) {
    await syncNow().catch(() => {});
    const pending = await pendingChanges(userId);
    if (pending > 0) return { ok: false, pendingChanges: pending };
  }
  await signOutLocally();
  return { ok: true };
}

async function signOutLocally(): Promise<void> {
  signingOut = true;
  try {
    await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
    await wipeLocalUserData();
  } finally {
    signingOut = false;
  }
}

async function wipeLocalUserData(): Promise<void> {
  const db = await openDatabase();
  await db.withTransactionAsync(async () => {
    for (const table of USER_TABLES) await db.execAsync(`DELETE FROM ${table}`);
    await db.execAsync('DELETE FROM auth_storage');
  });
  await deleteSecureItem(UNLOCK_VERIFIER_KEY);
  await clearSession();
}

/** Para desbloquear la app sin conexión: compara con el verificador guardado al iniciar sesión. */
export async function verifyCurrentUserPassword(password: string): Promise<boolean> {
  const verifier = getSecureItem(UNLOCK_VERIFIER_KEY);
  return verifier != null && (await verifyPassword(password, verifier));
}

export async function requestPasswordReset(email: string): Promise<AuthResult> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: authRedirectUrl('recovery'),
    });
    if (error) return { ok: false, message: messageFor(error) };
    return { ok: true };
  } catch (error) {
    return { ok: false, message: messageFor(error as Error) };
  }
}

/** Procesa el link de un email (confirmación o recuperación): canjea el código por una sesión. */
export async function completeAuthFromLink(code: string): Promise<AuthResult> {
  try {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error || !data.user) return { ok: false, message: 'El link venció o ya se usó. Pedí uno nuevo.' };
    await onSignedIn(data.user);
    return { ok: true };
  } catch (error) {
    return { ok: false, message: messageFor(error as Error) };
  }
}

export async function updatePassword(password: string): Promise<AuthResult> {
  try {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { ok: false, message: messageFor(error) };
    setSecureItem(UNLOCK_VERIFIER_KEY, await hashPassword(password));
    return { ok: true };
  } catch (error) {
    return { ok: false, message: messageFor(error as Error) };
  }
}

/** Borra la cuenta y todos sus datos en el servidor (función delete-account) y en el teléfono. */
export async function deleteAccount(): Promise<AuthResult> {
  try {
    const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
    if (error) return { ok: false, message: 'No pudimos borrar la cuenta. Revisá tu conexión y probá de nuevo.' };
    await signOutLocally();
    return { ok: true };
  } catch (error) {
    return { ok: false, message: messageFor(error as Error) };
  }
}

/**
 * Si el servidor invalida la sesión (por ejemplo, la cuenta se borró desde otro dispositivo o se
 * cambió la contraseña), se cierra la sesión local también.
 */
supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT' && !signingOut && currentUserId()) void signOutLocally();
});
