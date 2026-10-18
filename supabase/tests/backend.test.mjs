// Tests del backend contra el Supabase local (`npx supabase start`).
// Correr desde la raíz del repo: node --test supabase/tests/backend.test.mjs
// Verifica seguridad por fila (RLS), la regla "gana el último", validaciones y el borrado de cuenta.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { before, test } from 'node:test';

// El cliente de Supabase se toma de las dependencias de la app.
const require = createRequire(new URL('../../mobile/package.json', import.meta.url));
const { createClient } = require('@supabase/supabase-js');

const API_URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
// Claves públicas de demostración del Supabase local (no sirven fuera de esta máquina).
const ANON_KEY =
  process.env.SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

// Clave de servicio de demostración del Supabase local (la misma en todas las instalaciones locales):
// hace de servidor, que es el único que puede dar Premium.
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const server = createClient(API_URL, SERVICE_KEY, { auth: { persistSession: false } });

async function newUser(name) {
  const client = createClient(API_URL, ANON_KEY, { auth: { persistSession: false } });
  const email = `test-${randomUUID()}@example.com`;
  const { data, error } = await client.auth.signUp({ email, password: 'secreto123', options: { data: { name } } });
  assert.equal(error, null, error?.message);
  assert.ok(data.session, 'el registro local no pide confirmar el email');
  return { client, id: data.user.id, email };
}

function obligation(userId, overrides = {}) {
  return {
    id: randomUUID(),
    user_id: userId,
    name: 'Luz',
    amount: 350000,
    currency: 'PYG',
    due_date: '2026-10-20',
    category: 'SERVICIOS',
    created_on: '2026-10-12',
    updated_at: Date.now(),
    ...overrides,
  };
}

let ana;
let beto;
before(async () => {
  ana = await newUser('Ana Pérez');
  beto = await newUser('Beto');
});

test('al registrarse se crea el perfil con el nombre', async () => {
  const { data, error } = await ana.client.from('profiles').select('*');
  assert.equal(error, null);
  assert.equal(data.length, 1);
  assert.equal(data[0].name, 'Ana Pérez');
});

test('cada usuario ve solo sus datos', async () => {
  const mine = obligation(ana.id);
  assert.equal((await ana.client.from('obligations').insert(mine)).error, null);

  const { data } = await beto.client.from('obligations').select('*').eq('id', mine.id);
  assert.deepEqual(data, [], 'Beto no puede leer la factura de Ana');

  const { data: anaRows } = await ana.client.from('obligations').select('*').eq('id', mine.id);
  assert.equal(anaRows.length, 1);
});

test('no se pueden crear datos a nombre de otro usuario', async () => {
  const { error } = await beto.client.from('obligations').insert(obligation(ana.id));
  assert.ok(error, 'debe rechazarse');
  assert.match(error.message, /row-level security/i);
});

test('no se pueden modificar datos de otro usuario', async () => {
  const mine = obligation(ana.id);
  await ana.client.from('obligations').insert(mine);
  await beto.client.from('obligations').update({ name: 'Hackeado', updated_at: Date.now() + 1000 }).eq('id', mine.id);
  const { data } = await ana.client.from('obligations').select('name').eq('id', mine.id).single();
  assert.equal(data.name, 'Luz');
});

test('no se puede borrar físicamente (borrado lógico solamente)', async () => {
  const mine = obligation(ana.id);
  await ana.client.from('obligations').insert(mine);
  await ana.client.from('obligations').delete().eq('id', mine.id);
  const { data } = await ana.client.from('obligations').select('id').eq('id', mine.id);
  assert.equal(data.length, 1);
});

test('gana el último cambio: un cambio más viejo no pisa uno más nuevo', async () => {
  const now = Date.now();
  const mine = obligation(ana.id, { updated_at: now });
  await ana.client.from('obligations').insert(mine);

  await ana.client.from('obligations').upsert({ ...mine, name: 'Nuevo', updated_at: now + 2000 });
  await ana.client.from('obligations').upsert({ ...mine, name: 'Viejo', updated_at: now + 1000 });

  const { data } = await ana.client.from('obligations').select('name, server_updated_at').eq('id', mine.id).single();
  assert.equal(data.name, 'Nuevo');
});

test('el servidor marca cuándo cambió cada fila (para la sincronización)', async () => {
  const mine = obligation(ana.id);
  await ana.client.from('obligations').insert(mine);
  const first = (await ana.client.from('obligations').select('server_updated_at').eq('id', mine.id).single()).data;
  await ana.client.from('obligations').upsert({ ...mine, is_paid: true, updated_at: mine.updated_at + 1 });
  const second = (await ana.client.from('obligations').select('server_updated_at').eq('id', mine.id).single()).data;
  assert.ok(new Date(second.server_updated_at) > new Date(first.server_updated_at));
});

test('validaciones del servidor', async () => {
  const bad = [
    obligation(ana.id, { currency: 'EUR' }),
    obligation(ana.id, { category: 'CRIPTO' }),
    obligation(ana.id, { amount: -1 }),
    obligation(ana.id, { name: '' }),
  ];
  for (const row of bad) {
    const { error } = await ana.client.from('obligations').insert(row);
    assert.ok(error, `debía rechazarse: ${JSON.stringify(row)}`);
  }
  const { error } = await ana.client.from('budget_plans').insert({
    user_id: ana.id,
    necesidades_percent: 50,
    deseos_percent: 30,
    ahorro_percent: 30,
    updated_at: Date.now(),
  });
  assert.ok(error, 'los porcentajes tienen que sumar 100');
});

test('sin sesión no se puede leer nada', async () => {
  const anon = createClient(API_URL, ANON_KEY, { auth: { persistSession: false } });
  const { data, error } = await anon.from('obligations').select('*');
  assert.ok(error || data.length === 0);
});

test('borrar la cuenta elimina al usuario y todos sus datos', async () => {
  const carla = await newUser('Carla');
  await carla.client.from('obligations').insert(obligation(carla.id));
  const { error } = await carla.client.functions.invoke('delete-account', { method: 'POST' });
  assert.equal(error, null, error?.message);

  const relogin = await createClient(API_URL, ANON_KEY, { auth: { persistSession: false } }).auth.signInWithPassword({
    email: carla.email,
    password: 'secreto123',
  });
  assert.ok(relogin.error, 'la cuenta ya no existe');
});

test('nadie puede darse Premium a sí mismo', async () => {
  const until = new Date(Date.now() + 365 * 864e5).toISOString();
  const insert = await ana.client.from('entitlements').insert({ user_id: ana.id, premium_until: until, source: 'manual' });
  assert.ok(insert.error, 'un usuario no puede crear su propia fila de Premium');
  const { data } = await ana.client.from('entitlements').select('*');
  assert.equal(data.length, 0);
});

test('cada usuario ve solo su Premium, y no lo puede modificar', async () => {
  const until = new Date(Date.now() + 30 * 864e5).toISOString();
  const grant = await server.from('entitlements').insert({ user_id: beto.id, premium_until: until, source: 'manual' });
  assert.equal(grant.error, null, grant.error?.message);

  const mine = await beto.client.from('entitlements').select('premium_until');
  assert.equal(mine.data.length, 1);
  assert.equal(Date.parse(mine.data[0].premium_until), Date.parse(until));

  const others = await ana.client.from('entitlements').select('*');
  assert.equal(others.data.length, 0, 'Ana no ve el Premium de Beto');

  const later = new Date(Date.now() + 3650 * 864e5).toISOString();
  await beto.client.from('entitlements').update({ premium_until: later }).eq('user_id', beto.id);
  const after = await server.from('entitlements').select('premium_until').eq('user_id', beto.id).single();
  assert.equal(Date.parse(after.data.premium_until), Date.parse(until), 'Beto no puede alargar su Premium');
});
