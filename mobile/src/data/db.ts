import * as SQLite from 'expo-sqlite';

import { getOrCreateDatabaseKey } from './secureStorage';

/**
 * Base local (SQLite cifrada con SQLCipher). La clave vive en Keychain/Keystore (ver secureStorage).
 * La app es local-first: todo se lee y escribe acá y se sincroniza con Supabase (ver sync/).
 *
 * Columnas de sincronización (iguales a las del servidor):
 *   updated_at  milisegundos del último cambio hecho en este teléfono o recibido del servidor.
 *   deleted     borrado lógico, para que el borrado llegue a los demás dispositivos.
 *   dirty       1 si el cambio todavía no se subió al servidor.
 * Las fechas se guardan como días desde 1970 (en el servidor son `date`).
 */
const DATABASE_NAME = 'netto.sqlite';
/** Bases de versiones de prueba anteriores (sin cifrar o con IDs numéricos); se borran si existen. */
const LEGACY_DATABASES = ['netto.db', 'netto-secure.db'];

/** Cada posición es una versión del esquema; nunca editar las existentes, solo agregar nuevas. */
const MIGRATIONS: string[] = [
  `
  CREATE TABLE profile (
    user_id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    updated_at INTEGER NOT NULL DEFAULT 0,
    deleted INTEGER NOT NULL DEFAULT 0,
    dirty INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE budget_plan (
    user_id TEXT PRIMARY KEY NOT NULL,
    model_type TEXT NOT NULL,
    necesidades_percent INTEGER NOT NULL,
    deseos_percent INTEGER NOT NULL,
    ahorro_percent INTEGER NOT NULL,
    reminder_days_before INTEGER NOT NULL,
    display_currency TEXT NOT NULL,
    onboarding_completed INTEGER NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL,
    deleted INTEGER NOT NULL DEFAULT 0,
    dirty INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE incomes (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    amount INTEGER NOT NULL,
    currency TEXT NOT NULL,
    day_of_month INTEGER NOT NULL DEFAULT 1,
    is_recurring INTEGER NOT NULL DEFAULT 1,
    updated_at INTEGER NOT NULL,
    deleted INTEGER NOT NULL DEFAULT 0,
    dirty INTEGER NOT NULL DEFAULT 1
  );
  CREATE INDEX incomes_user ON incomes (user_id, deleted);

  CREATE TABLE obligations (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    reference TEXT,
    amount INTEGER NOT NULL,
    currency TEXT NOT NULL,
    due_date INTEGER NOT NULL,
    category TEXT NOT NULL,
    is_recurring INTEGER NOT NULL DEFAULT 0,
    is_paid INTEGER NOT NULL DEFAULT 0,
    paid_date INTEGER,
    notes TEXT,
    created_from_ocr INTEGER NOT NULL DEFAULT 0,
    created_on INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted INTEGER NOT NULL DEFAULT 0,
    dirty INTEGER NOT NULL DEFAULT 1
  );
  CREATE INDEX obligations_user ON obligations (user_id, deleted);

  CREATE TABLE payment_history (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    obligation_id TEXT NOT NULL,
    obligation_name TEXT NOT NULL,
    category TEXT NOT NULL,
    amount INTEGER NOT NULL,
    currency TEXT NOT NULL,
    paid_date INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted INTEGER NOT NULL DEFAULT 0,
    dirty INTEGER NOT NULL DEFAULT 1
  );
  CREATE INDEX payment_history_user ON payment_history (user_id, deleted);

  -- Sesión de Supabase (tokens). Vive acá porque esta base está cifrada con clave en el Keychain.
  CREATE TABLE auth_storage (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );

  -- Hasta qué momento del servidor se bajaron los cambios de cada tabla, por usuario.
  CREATE TABLE sync_state (
    user_id TEXT NOT NULL,
    table_name TEXT NOT NULL,
    cursor TEXT NOT NULL,
    PRIMARY KEY (user_id, table_name)
  );
  `,
];

let database: SQLite.SQLiteDatabase | null = null;
let opening: Promise<SQLite.SQLiteDatabase> | null = null;

/** Abre (una sola vez) la base cifrada y aplica las migraciones pendientes. */
export function openDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (database) return Promise.resolve(database);
  opening ??= doOpen().finally(() => {
    opening = null;
  });
  return opening;
}

async function doOpen(): Promise<SQLite.SQLiteDatabase> {
  for (const legacy of LEGACY_DATABASES) {
    await SQLite.deleteDatabaseAsync(legacy).catch(() => {
      // No existe: es lo normal.
    });
  }
  let db: SQLite.SQLiteDatabase;
  try {
    db = await openEncrypted();
  } catch {
    // La clave no abre la base: pasa si se restauró un backup del dispositivo (el archivo viaja,
    // la clave no, porque es "solo este dispositivo"). Se empieza de cero; los datos de la cuenta
    // se recuperan con la sincronización.
    await SQLite.deleteDatabaseAsync(DATABASE_NAME).catch(() => {});
    db = await openEncrypted();
  }
  await db.execAsync('PRAGMA journal_mode = WAL;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;
  while (version < MIGRATIONS.length) {
    // withTransactionAsync usa esta misma conexión. withExclusiveTransactionAsync abre otra conexión,
    // que no tiene la clave de SQLCipher y no puede leer la base cifrada.
    const migration = MIGRATIONS[version];
    const next = version + 1;
    await db.withTransactionAsync(async () => {
      await db.execAsync(migration);
      await db.execAsync(`PRAGMA user_version = ${next}`);
    });
    version = next;
  }
  database = db;
  return db;
}

async function openEncrypted(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  try {
    // La clave tiene que ser lo primero que se ejecuta. Se pasa como clave cruda (hex) para que
    // SQLCipher no tenga que derivarla de una contraseña en cada apertura.
    await db.execAsync(`PRAGMA key = "x'${getOrCreateDatabaseKey()}'"`);
    // Falla si la clave no corresponde a la base.
    await db.getFirstAsync('SELECT count(*) FROM sqlite_master');
    return db;
  } catch (error) {
    await db.closeAsync().catch(() => {});
    throw error;
  }
}

export function getDb(): SQLite.SQLiteDatabase {
  if (!database) throw new Error('La base de datos todavía no se abrió');
  return database;
}

/** Tablas con datos del usuario (se vacían al cerrar sesión; vuelven con la sincronización). */
export const USER_TABLES = ['profile', 'budget_plan', 'incomes', 'obligations', 'payment_history', 'sync_state'] as const;

// ---- Aviso de cambios: las pantallas recargan sus datos cuando algo se escribe ----

type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribeToDataChanges(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function notifyDataChanged(): void {
  listeners.forEach((listener) => listener());
}
