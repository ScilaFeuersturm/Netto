import { notifyDataChanged } from '@/data/db';
import { currentUserId } from '@/data/session';
import { isSupabaseConfigured } from '@/data/supabase';

import { runSync, SyncError, type SyncResult } from './engine';

/**
 * Cuándo sincronizar: al abrir la app, al volver a primer plano y unos segundos después de cada
 * cambio local (agrupando cambios seguidos). Nunca hay dos sincronizaciones a la vez.
 */
const DEBOUNCE_MS = 1500;

export type SyncStatus = {
  syncing: boolean;
  /** true si la última sincronización falló por falta de conexión. */
  offline: boolean;
  lastError: string | null;
  lastSyncedAt: number | null;
};

let status: SyncStatus = { syncing: false, offline: false, lastError: null, lastSyncedAt: null };
const listeners = new Set<(status: SyncStatus) => void>();

function setStatus(patch: Partial<SyncStatus>): void {
  status = { ...status, ...patch };
  listeners.forEach((listener) => listener(status));
}

export function getSyncStatus(): SyncStatus {
  return status;
}

export function subscribeToSyncStatus(listener: (status: SyncStatus) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

let timer: ReturnType<typeof setTimeout> | null = null;
let running: Promise<SyncResult | null> | null = null;
let runAgain = false;

export function scheduleSync(delay = DEBOUNCE_MS): void {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    void syncNow().catch(() => {
      // El error queda en el estado; se reintenta en el próximo disparador.
    });
  }, delay);
}

/** Sincroniza ya. Si hay una en curso, se encadena otra al terminar y se devuelve la actual. */
export function syncNow(): Promise<SyncResult | null> {
  if (running) {
    runAgain = true;
    return running;
  }
  running = (async () => {
    const userId = currentUserId();
    if (!userId || !isSupabaseConfigured) return null;
    setStatus({ syncing: true });
    try {
      const result = await runSync(userId);
      setStatus({ syncing: false, offline: false, lastError: null, lastSyncedAt: Date.now() });
      if (result.pulled > 0) notifyDataChanged();
      return result;
    } catch (error) {
      const offline = error instanceof SyncError && error.offline;
      setStatus({ syncing: false, offline, lastError: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  })().finally(() => {
    running = null;
    if (runAgain) {
      runAgain = false;
      scheduleSync(0);
    }
  });
  return running;
}
