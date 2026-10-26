import Storage from 'expo-sqlite/kv-store';
import { useEffect, useState } from 'react';

import { currentUserId } from './session';
import { isSupabaseConfigured, supabase } from './supabase';

/**
 * Si el usuario tiene Inariko Premium, propio o por estar en el grupo de alguien con plan familiar.
 * La fuente es el servidor (función my_premium sobre la tabla `entitlements`, que solo el servidor
 * puede escribir; más adelante, RevenueCat). La app la consulta en cada sincronización y guarda la
 * fecha de vencimiento y el plan, así funciona sin conexión.
 *
 * La copia guardada no está cifrada: alguien que la modifique a mano desbloquea las funciones Premium
 * en su propio teléfono y nada más (no hay datos de otros ni servicios pagos detrás). Cuando esté
 * RevenueCat, su SDK pasa a ser la fuente en el teléfono.
 */
export type PremiumStatus = {
  premium: boolean;
  /** Hasta cuándo dura, en milisegundos; null si está en el plan gratis. */
  until: number | null;
  /** 'family' si viene del plan familiar (propio o del grupo al que pertenece). */
  plan: PremiumPlan | null;
};

export type PremiumPlan = 'individual' | 'family';

const FREE: PremiumStatus = { premium: false, until: null, plan: null };
const keyFor = (userId: string) => `premium:${userId}`;
const listeners = new Set<() => void>();

export function getPremiumStatus(userId: string | null = currentUserId()): PremiumStatus {
  if (!userId) return FREE;
  try {
    const saved = JSON.parse(Storage.getItemSync(keyFor(userId)) ?? 'null') as { until: number; plan: PremiumPlan } | null;
    if (!saved || !Number.isFinite(saved.until)) return FREE;
    return { premium: saved.until > Date.now(), until: saved.until, plan: saved.plan };
  } catch {
    return FREE;
  }
}

/** Consulta el servidor. Sin conexión (o con error) se queda con lo que estaba guardado. */
export async function refreshPremium(): Promise<void> {
  const userId = currentUserId();
  if (!userId || !isSupabaseConfigured) return;
  const { data, error } = await supabase.rpc('my_premium');
  if (error) return;
  const row = ((data ?? []) as { premium_until: string; plan: PremiumPlan }[])[0];
  const before = Storage.getItemSync(keyFor(userId));
  if (row) await Storage.setItem(keyFor(userId), JSON.stringify({ until: Date.parse(row.premium_until), plan: row.plan }));
  else await Storage.removeItem(keyFor(userId));
  if (Storage.getItemSync(keyFor(userId)) !== before) listeners.forEach((listener) => listener());
}

export async function clearPremium(userId: string): Promise<void> {
  await Storage.removeItem(keyFor(userId));
  listeners.forEach((listener) => listener());
}

/** El estado de Premium del usuario con sesión, actualizado cuando cambia (o cuando vence). */
export function usePremium(): PremiumStatus {
  const [status, setStatus] = useState(getPremiumStatus);
  useEffect(() => {
    const update = () => setStatus(getPremiumStatus());
    listeners.add(update);
    update();
    // Si vence con la app abierta, se pasa al plan gratis en ese momento.
    const msLeft = status.premium && status.until ? status.until - Date.now() : null;
    const timer = msLeft != null && msLeft < 2 ** 31 ? setTimeout(update, msLeft + 1000) : null;
    return () => {
      listeners.delete(update);
      if (timer) clearTimeout(timer);
    };
  }, [status.premium, status.until]);
  return status;
}
