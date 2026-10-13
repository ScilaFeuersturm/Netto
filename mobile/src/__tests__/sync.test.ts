import { epochDayOf } from '@/domain/dates';
import {
  epochDayToIso,
  fromRemote,
  isoToEpochDay,
  parseServerTimestamp,
  shouldApplyRemote,
  SYNC_TABLES,
  toRemote,
} from '@/sync/tables';

const obligations = SYNC_TABLES.find((t) => t.local === 'obligations')!;

test('fechas: días desde 1970 ↔ YYYY-MM-DD', () => {
  expect(epochDayToIso(epochDayOf(2026, 10, 9))).toBe('2026-10-09');
  expect(isoToEpochDay('2026-10-09')).toBe(epochDayOf(2026, 10, 9));
  expect(isoToEpochDay('2024-02-29')).toBe(epochDayOf(2024, 2, 29));
});

test('marcas de tiempo de Postgres con microsegundos', () => {
  expect(parseServerTimestamp('2026-10-12T21:40:00.123456+00:00')).toBe(Date.UTC(2026, 9, 12, 21, 40, 0, 123));
  expect(parseServerTimestamp('2026-10-12 21:40:00+00')).toBe(Date.UTC(2026, 9, 12, 21, 40, 0));
  expect(() => parseServerTimestamp('basura')).toThrow();
});

test('una factura local se convierte al formato del servidor y vuelve igual', () => {
  const local = {
    id: '6f0c2a52-1111-4a6b-9d0b-2f0f6a6b0001',
    user_id: 'b3f1c1d2-2222-4c3d-8e4f-5a6b7c8d0002',
    name: 'Luz',
    reference: null,
    amount: 350000,
    currency: 'PYG',
    due_date: epochDayOf(2026, 10, 20),
    category: 'SERVICIOS',
    is_recurring: 1,
    is_paid: 0,
    paid_date: null,
    notes: null,
    created_from_ocr: 0,
    created_on: epochDayOf(2026, 10, 12),
    updated_at: 1_791_000_000_000,
    deleted: 0,
    dirty: 1,
  };
  const remote = toRemote(obligations, local);
  expect(remote).toMatchObject({ due_date: '2026-10-20', is_recurring: true, is_paid: false, created_on: '2026-10-12' });
  expect(remote).not.toHaveProperty('dirty');

  const { dirty: _dirty, ...expected } = local;
  expect(fromRemote(obligations, { ...remote, server_updated_at: '2026-10-12T00:00:00+00:00' })).toEqual(expected);
});

test('conflictos: gana el cambio más reciente', () => {
  // Sin la fila en el teléfono, o sin cambios locales pendientes: se aplica lo del servidor.
  expect(shouldApplyRemote(null, 100)).toBe(true);
  expect(shouldApplyRemote({ updated_at: 500, dirty: 0 }, 100)).toBe(true);
  // Con un cambio local pendiente, solo se pisa si el del servidor es igual o más nuevo.
  expect(shouldApplyRemote({ updated_at: 500, dirty: 1 }, 100)).toBe(false);
  expect(shouldApplyRemote({ updated_at: 500, dirty: 1 }, 900)).toBe(true);
});

test('todas las tablas sincronizadas tienen dueño y columnas de sincronización', () => {
  for (const table of SYNC_TABLES) {
    expect(table.columns).toHaveProperty('user_id');
    expect(table.columns).toHaveProperty('updated_at', 'int');
    expect(table.columns).toHaveProperty('deleted', 'bool');
  }
});
