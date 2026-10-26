import { getDb } from '@/data/db';
import { supabase } from '@/data/supabase';

import {
  fromRemote,
  parseServerTimestamp,
  SHARED_TABLES,
  shouldApplyRemote,
  SYNC_TABLES,
  toRemote,
  type Row,
  type SyncTable,
} from './tables';

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

const isShared = (table: SyncTable) => SHARED_TABLES.includes(table.local);

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
  for (const table of SYNC_TABLES) {
    if (isShared(table)) pulled += await dropUnreachableRows(table, userId);
  }
  return { pushed, pulled };
}

async function push(table: SyncTable, userId: string): Promise<number> {
  const db = getDb();
  let total = 0;
  for (;;) {
    // En las tablas compartidas también hay filas de otras personas del grupo (editadas acá, por
    // ejemplo una factura de la casa marcada como pagada).
    const rows = await db.getAllAsync<Row>(
      `SELECT * FROM ${table.local} WHERE dirty = 1 ${isShared(table) ? '' : 'AND user_id = ?'} LIMIT ${PAGE_SIZE}`,
      ...(isShared(table) ? [] : [userId]),
    );
    if (rows.length === 0) return total;
    const own = rows.filter((row) => row.user_id === userId);
    const others = rows.filter((row) => row.user_id !== userId);
    if (own.length > 0) {
      const { error } = await supabase.from(table.remote).upsert(own.map((row) => toRemote(table, row)), {
        onConflict: table.primaryKey,
      });
      if (error) throw asSyncError(error, `No se pudo subir ${table.remote}`);
    }
    // Las de otra persona se actualizan (no "upsert"): el servidor no deja crear filas a nombre de otro.
    for (const row of others) {
      const id = row[table.primaryKey] as string;
      const { data, error } = await supabase
        .from(table.remote)
        .update(toRemote(table, row))
        .eq(table.primaryKey, id)
        .select(table.primaryKey);
      if (error) throw asSyncError(error, `No se pudo subir ${table.remote}`);
      // Sin filas afectadas: ya no está compartida con este grupo. Se descarta la copia local.
      if ((data ?? []).length === 0) await db.runAsync(`DELETE FROM ${table.local} WHERE ${table.primaryKey} = ?`, id);
    }
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
    // En las tablas compartidas se baja todo lo que el servidor deja ver (lo propio y lo del grupo).
    let query = supabase.from(table.remote).select('*').order('server_updated_at', { ascending: true }).limit(PAGE_SIZE);
    if (!isShared(table)) query = query.eq('user_id', userId);
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

/**
 * Copias locales de filas de otras personas que ya no se pueden ver (dejaron de compartirlas, o alguien
 * salió del grupo). El servidor no avisa de lo que dejó de ser visible, así que se pregunta por ellas.
 */
async function dropUnreachableRows(table: SyncTable, userId: string): Promise<number> {
  const db = getDb();
  const local = await db.getAllAsync<{ id: string }>(
    `SELECT ${table.primaryKey} AS id FROM ${table.local} WHERE user_id != ?`,
    userId,
  );
  let dropped = 0;
  for (let i = 0; i < local.length; i += 100) {
    const ids = local.slice(i, i + 100).map((r) => r.id);
    const { data, error } = await supabase.from(table.remote).select(table.primaryKey).in(table.primaryKey, ids);
    if (error) throw asSyncError(error, `No se pudo revisar ${table.remote}`);
    const visible = new Set(((data ?? []) as unknown as Row[]).map((r) => r[table.primaryKey] as string));
    for (const id of ids) {
      if (visible.has(id)) continue;
      await db.runAsync(`DELETE FROM ${table.local} WHERE ${table.primaryKey} = ?`, id);
      dropped++;
    }
  }
  return dropped;
}

/**
 * Vuelve a bajar desde cero las tablas compartidas. Hace falta al entrar a un grupo: lo que los demás
 * compartieron antes tiene una marca de tiempo anterior al cursor de este teléfono.
 */
export async function resetSharedCursors(userId: string): Promise<void> {
  for (const table of SHARED_TABLES) {
    await getDb().runAsync('DELETE FROM sync_state WHERE user_id = ? AND table_name = ?', userId, table);
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
      `SELECT count(*) AS n FROM ${table.local} WHERE dirty = 1 ${isShared(table) ? '' : 'AND user_id = ?'}`,
      ...(isShared(table) ? [] : [userId]),
    );
    total += row?.n ?? 0;
  }
  return total;
}
