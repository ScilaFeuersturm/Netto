import { epochDayOf, toParts } from '@/domain/dates';

/**
 * Qué se sincroniza y cómo se convierte cada columna entre la base local (SQLite) y Supabase (Postgres).
 * Los nombres de columna son iguales en los dos lados; cambian los tipos:
 *   bool  0/1 en SQLite        ↔ boolean en Postgres
 *   date  días desde 1970      ↔ 'YYYY-MM-DD'
 */
type ColumnType = 'text' | 'int' | 'bool' | 'date';

export type SyncTable = {
  local: string;
  remote: string;
  primaryKey: string;
  columns: Record<string, ColumnType>;
};

const SYNC_COLUMNS = { updated_at: 'int', deleted: 'bool' } as const;

export const SYNC_TABLES: SyncTable[] = [
  {
    local: 'profile',
    remote: 'profiles',
    primaryKey: 'user_id',
    columns: { user_id: 'text', name: 'text', ...SYNC_COLUMNS },
  },
  {
    local: 'budget_plan',
    remote: 'budget_plans',
    primaryKey: 'user_id',
    columns: {
      user_id: 'text',
      model_type: 'text',
      necesidades_percent: 'int',
      deseos_percent: 'int',
      ahorro_percent: 'int',
      reminder_days_before: 'int',
      display_currency: 'text',
      onboarding_completed: 'bool',
      ...SYNC_COLUMNS,
    },
  },
  {
    local: 'incomes',
    remote: 'incomes',
    primaryKey: 'id',
    columns: {
      id: 'text',
      user_id: 'text',
      name: 'text',
      amount: 'int',
      currency: 'text',
      day_of_month: 'int',
      is_recurring: 'bool',
      ...SYNC_COLUMNS,
    },
  },
  {
    local: 'obligations',
    remote: 'obligations',
    primaryKey: 'id',
    columns: {
      id: 'text',
      user_id: 'text',
      name: 'text',
      reference: 'text',
      amount: 'int',
      currency: 'text',
      due_date: 'date',
      category: 'text',
      is_recurring: 'bool',
      is_paid: 'bool',
      paid_date: 'date',
      notes: 'text',
      created_from_ocr: 'bool',
      created_on: 'date',
      ...SYNC_COLUMNS,
    },
  },
  {
    local: 'payment_history',
    remote: 'payment_history',
    primaryKey: 'id',
    columns: {
      id: 'text',
      user_id: 'text',
      obligation_id: 'text',
      obligation_name: 'text',
      category: 'text',
      amount: 'int',
      currency: 'text',
      paid_date: 'date',
      ...SYNC_COLUMNS,
    },
  },
];

export type Row = Record<string, unknown>;

export function epochDayToIso(day: number): string {
  const { year, month, day: d } = toParts(day);
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function isoToEpochDay(iso: string): number {
  const [year, month, day] = iso.slice(0, 10).split('-').map(Number);
  return epochDayOf(year, month, day);
}

/**
 * Milisegundos de una marca de tiempo de Postgres ("2026-10-12T21:40:00.123456+00:00").
 * Se recortan los microsegundos: no todos los motores de JavaScript los aceptan.
 */
export function parseServerTimestamp(value: string): number {
  const normalized = value.replace(' ', 'T').replace(/(\.\d{3})\d+/, '$1').replace(/\+00(:?00)?$/, 'Z');
  const millis = Date.parse(normalized);
  if (Number.isNaN(millis)) throw new Error(`Marca de tiempo inválida: ${value}`);
  return millis;
}

/** Fila local → fila para Supabase (sin columnas solo-locales como dirty o email). */
export function toRemote(table: SyncTable, local: Row): Row {
  const out: Row = {};
  for (const [column, type] of Object.entries(table.columns)) {
    const value = local[column];
    if (value == null) out[column] = null;
    else if (type === 'bool') out[column] = !!value;
    else if (type === 'date') out[column] = epochDayToIso(Number(value));
    else if (type === 'int') out[column] = Number(value);
    else out[column] = value;
  }
  return out;
}

/** Fila de Supabase → valores para la base local. */
export function fromRemote(table: SyncTable, remote: Row): Row {
  const out: Row = {};
  for (const [column, type] of Object.entries(table.columns)) {
    const value = remote[column];
    if (value == null) out[column] = null;
    else if (type === 'bool') out[column] = value ? 1 : 0;
    else if (type === 'date') out[column] = isoToEpochDay(String(value));
    else if (type === 'int') out[column] = Number(value);
    else out[column] = value;
  }
  return out;
}

/**
 * Regla de conflictos ("gana el último"): un cambio del servidor se aplica salvo que en este teléfono
 * haya un cambio más nuevo todavía sin subir.
 */
export function shouldApplyRemote(local: { updated_at: number; dirty: number } | null, remoteUpdatedAt: number): boolean {
  if (!local) return true;
  if (!local.dirty) return true;
  return remoteUpdatedAt >= local.updated_at;
}
