import { getDb } from '@/data/db';
import { supabase } from '@/data/supabase';

import { fromRemote, parseServerTimestamp, shouldApplyRemote, SYNC_TABLES, toRemote, type Row, type SyncTable } from './tables';

const PAGE_SIZE = 500;
/**
 * Al pedir "lo que cambió desde X" se retrocede un poco: una transacción que empezó antes pero terminó
 * después puede tener una marca de tiempo anterior al último cursor. Reaplicar filas no tiene efecto.
 */
const CURSOR_OVERLAP_MS = 60_000;

export type SyncResult = { pushed: number; pulled: number };

export class SyncError extends Error {
  constructor(
    message: string,
    readonly offline: boolean,
  ) {
    super(message);
  }
}

function asSyncError(error: { message?: string; code?: string } | null, context: string): SyncError {
  const message = error?.message ?? 'error desconocido';
  const offline = /network|fetch|timeout|failed to fetch/i.test(message);
  return new SyncError(`${context}: ${message}`, offline);
}

/** Sube los cambios pendientes y baja los del servidor, tabla por tabla. */
export async function runSync(userId: string): Promise<SyncResult> {
  let pushed = 0;
  let pulled = 0;
  for (const table of SYNC_TABLES) {
    pushed += await push(table, userId);
  }
  for (const table of SYNC_TABLES) {
    pulled += await pull(table, userId);
  }
  return { pushed, pulled };
}

async function push(table: SyncTable, userId: string): Promise<number> {
  const db = getDb();
  let total = 0;
  for (;;) {
    const rows = await db.getAllAsync<Row>(
      `SELECT * FROM ${table.local} WHERE user_id = ? AND dirty = 1 LIMIT ${PAGE_SIZE}`,
      userId,
    );
    if (rows.length === 0) return total;
    const { error } = await supabase.from(table.remote).upsert(rows.map((row) => toRemote(table, row)), {
      onConflict: table.primaryKey,
    });
    if (error) throw asSyncError(error, `No se pudo subir ${table.remote}`);
    // Solo se marca como subido si no cambió de nuevo mientras se subía.
    for (const row of rows) {
      await db.runAsync(
        `UPDATE ${table.local} SET dirty = 0 WHERE ${table.primaryKey} = ? AND updated_at = ?`,
        row[table.primaryKey] as string,
        row.updated_at as number,
      );
    }
    total += rows.length;
    if (rows.length < PAGE_SIZE) return total;
  }
}

async function pull(table: SyncTable, userId: string): Promise<number> {
  const db = getDb();
  const state = await db.getFirstAsync<{ cursor: string }>(
    'SELECT cursor FROM sync_state WHERE user_id = ? AND table_name = ?',
    userId,
    table.local,
  );
  let cursor = state?.cursor ?? null;
  let total = 0;
  for (;;) {
    let query = supabase
      .from(table.remote)
      .select('*')
      .eq('user_id', userId)
      .order('server_updated_at', { ascending: true })
      .limit(PAGE_SIZE);
    if (cursor) query = query.gte('server_updated_at', new Date(parseServerTimestamp(cursor) - CURSOR_OVERLAP_MS).toISOString());
    const { data, error } = await query;
    if (error) throw asSyncError(error, `No se pudo bajar ${table.remote}`);
    const rows = (data ?? []) as Row[];

    const columns = Object.keys(table.columns);
    await db.withTransactionAsync(async () => {
      for (const remote of rows) {
        const local = await db.getFirstAsync<{ updated_at: number; dirty: number }>(
          `SELECT updated_at, dirty FROM ${table.local} WHERE ${table.primaryKey} = ?`,
          remote[table.primaryKey] as string,
        );
        if (!shouldApplyRemote(local, Number(remote.updated_at))) continue;
        const values = fromRemote(table, remote);
        // Solo se pisan las columnas sincronizadas (por ejemplo, el email local del perfil se conserva).
        await db.runAsync(
          `INSERT INTO ${table.local} (${columns.join(', ')}, dirty) VALUES (${columns.map(() => '?').join(', ')}, 0)
           ON CONFLICT(${table.primaryKey}) DO UPDATE SET ${columns.map((c) => `${c} = excluded.${c}`).join(', ')}, dirty = 0`,
          ...columns.map((c) => values[c] as string | number | null),
        );
      }
      const last = rows.at(-1);
      if (last) {
        cursor = String(last.server_updated_at);
        await db.runAsync(
          'INSERT OR REPLACE INTO sync_state (user_id, table_name, cursor) VALUES (?, ?, ?)',
          userId,
          table.local,
          cursor,
        );
      } else if (!state) {
        // Tabla vacía en el servidor: igual se registra que ya se sincronizó una vez.
        await db.runAsync(
          'INSERT OR IGNORE INTO sync_state (user_id, table_name, cursor) VALUES (?, ?, ?)',
          userId,
          table.local,
          new Date(0).toISOString(),
        );
      }
    });
    total += rows.length;
    if (rows.length < PAGE_SIZE) return total;
  }
}

/** true si este dispositivo ya bajó alguna vez los datos de este usuario. */
export async function hasSyncedOnce(userId: string): Promise<boolean> {
  const row = await getDb().getFirstAsync('SELECT 1 FROM sync_state WHERE user_id = ? LIMIT 1', userId);
  return row != null;
}

/** Cantidad de cambios locales todavía sin subir. */
export async function pendingChanges(userId: string): Promise<number> {
  let total = 0;
  for (const table of SYNC_TABLES) {
    const row = await getDb().getFirstAsync<{ n: number }>(
      `SELECT count(*) AS n FROM ${table.local} WHERE user_id = ? AND dirty = 1`,
      userId,
    );
    total += row?.n ?? 0;
  }
  return total;
}
