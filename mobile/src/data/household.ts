import Storage from 'expo-sqlite/kv-store';
import { useEffect, useState } from 'react';

import { resetSharedCursors } from '@/sync/engine';

import { currentUserId } from './session';
import { isSupabaseConfigured, supabase } from './supabase';

/**
 * Grupo del plan familiar: hasta 3 personas que comparten lo que marcan "de la casa".
 * El servidor es la fuente (funciones my_household, create_household, etc.); acá se guarda una copia
 * para mostrarlo sin conexión. Las reglas (quién invita, límite de 3, qué pasa al salir) las hace
 * cumplir el servidor; la app solo las explica.
 */
export type HouseholdMember = { userId: string; name: string; role: 'owner' | 'member' };
export type Household = { id: string; name: string; isOwner: boolean; members: HouseholdMember[] };

export const HOUSEHOLD_MAX_MEMBERS = 3;

const keyFor = (userId: string) => `household:${userId}`;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

export function getHousehold(userId: string | null = currentUserId()): Household | null {
  if (!userId) return null;
  try {
    const raw = Storage.getItemSync(keyFor(userId));
    return raw ? (JSON.parse(raw) as Household) : null;
  } catch {
    return null;
  }
}

type HouseholdRow = {
  household_id: string;
  name: string;
  is_owner: boolean;
  members: { user_id: string; name: string; role: 'owner' | 'member' }[] | null;
};

/**
 * Consulta el grupo en el servidor. Si cambió (alguien entró a un grupo), las tablas compartidas se
 * vuelven a bajar desde cero, para traer lo que los demás compartieron antes. Sin conexión no hace nada.
 */
export async function refreshHousehold(): Promise<void> {
  const userId = currentUserId();
  if (!userId || !isSupabaseConfigured) return;
  const { data, error } = await supabase.rpc('my_household');
  if (error) return;
  const row = ((data ?? []) as HouseholdRow[])[0];
  const next: Household | null = row
    ? {
        id: row.household_id,
        name: row.name,
        isOwner: row.is_owner,
        members: (row.members ?? []).map((m) => ({ userId: m.user_id, name: m.name, role: m.role })),
      }
    : null;
  const before = getHousehold(userId);
  if (JSON.stringify(before) === JSON.stringify(next)) return;
  if (next && next.id !== before?.id) await resetSharedCursors(userId);
  if (next) await Storage.setItem(keyFor(userId), JSON.stringify(next));
  else await Storage.removeItem(keyFor(userId));
  notify();
}

export async function clearHousehold(userId: string): Promise<void> {
  await Storage.removeItem(keyFor(userId));
  notify();
}

export function useHousehold(): Household | null {
  const [household, setHousehold] = useState(getHousehold);
  useEffect(() => {
    const update = () => setHousehold(getHousehold());
    listeners.add(update);
    update();
    return () => {
      listeners.delete(update);
    };
  }, []);
  return household;
}

// ---- Acciones (después de cada una, la pantalla sincroniza para traer o soltar lo compartido) ----

export type HouseholdResult<T = void> = { ok: true; value: T } | { ok: false; message: string };

const MESSAGES: Record<string, string> = {
  needs_family_plan: 'Para crear un grupo hace falta el plan familiar de Premium.',
  already_in_household: 'Ya estás en un grupo. Para sumarte a otro, primero salí del actual.',
  household_full: `El grupo ya tiene ${HOUSEHOLD_MAX_MEMBERS} personas, que es el máximo.`,
  invalid_code: 'El código no es válido o ya venció. Pedile uno nuevo a quien creó el grupo.',
  not_owner: 'Eso solo lo puede hacer quien creó el grupo.',
  owner_cannot_leave: 'Como creaste el grupo, no podés salir: podés disolverlo.',
};

async function call<T>(fn: string, args?: Record<string, unknown>): Promise<HouseholdResult<T>> {
  try {
    const { data, error } = await supabase.rpc(fn, args);
    if (error) {
      const known = error.hint && MESSAGES[error.hint];
      if (known) return { ok: false, message: known };
      if (/network|fetch|timeout/i.test(error.message)) {
        return { ok: false, message: 'No pudimos conectarnos. Revisá tu conexión a internet.' };
      }
      return { ok: false, message: 'Algo salió mal. Probá de nuevo en unos minutos.' };
    }
    await refreshHousehold();
    return { ok: true, value: data as T };
  } catch {
    return { ok: false, message: 'No pudimos conectarnos. Revisá tu conexión a internet.' };
  }
}

export const createHousehold = (name: string) => call<string>('create_household', { p_name: name });
export const createHouseholdInvite = () => call<string>('create_household_invite');
export const joinHousehold = (code: string) => call<string>('join_household', { p_code: code });
export const leaveHousehold = () => call('leave_household');
export const removeHouseholdMember = (userId: string) => call('remove_household_member', { p_user: userId });
export const deleteHousehold = () => call('delete_household');
