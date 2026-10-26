// Tests del plan familiar contra el Supabase local (`npx supabase start`).
// Correr desde la raíz del repo: node --test supabase/tests/plan-familiar.test.mjs
// Verifica: quién puede crear un grupo, invitaciones, el límite de 3 personas, qué se comparte y qué
// no, quién puede dejar de compartir, el Premium de los integrantes y qué pasa al salir o disolver.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { before, test } from 'node:test';

const require = createRequire(new URL('../../mobile/package.json', import.meta.url));
const { createClient } = require('@supabase/supabase-js');

const API_URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
// Claves de demostración del Supabase local (no sirven fuera de esta máquina).
const ANON_KEY =
  process.env.SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const server = createClient(API_URL, SERVICE_KEY, { auth: { persistSession: false } });

async function newUser(name) {
  const client = createClient(API_URL, ANON_KEY, { auth: { persistSession: false } });
  const email = `familia-${randomUUID()}@example.com`;
  const { data, error } = await client.auth.signUp({ email, password: 'secreto123', options: { data: { name } } });
  assert.equal(error, null, error?.message);
  return { client, id: data.user.id, name };
}

async function giveFamilyPlan(user, days = 30) {
  const premium_until = new Date(Date.now() + days * 864e5).toISOString();
  const { error } = await server.from('entitlements').upsert({ user_id: user.id, premium_until, source: 'manual', plan: 'family' });
  assert.equal(error, null, error?.message);
}

function bill(user, overrides = {}) {
  return {
    id: randomUUID(),
    user_id: user.id,
    name: 'Luz',
    amount: 350000,
    currency: 'PYG',
    due_date: '2026-11-20',
    category: 'SERVICIOS',
    created_on: '2026-10-26',
    updated_at: Date.now(),
    ...overrides,
  };
}

const visibleIds = async (user, table = 'obligations') => {
  const { data, error } = await user.client.from(table).select('id');
  assert.equal(error, null, error?.message);
  return new Set(data.map((r) => r.id));
};

let ana, beto, carla, dani, household;
before(async () => {
  [ana, beto, carla, dani] = await Promise.all([newUser('Ana'), newUser('Beto'), newUser('Carla'), newUser('Dani')]);
});

test('sin plan familiar no se puede crear un grupo', async () => {
  const { error } = await ana.client.rpc('create_household', { p_name: 'Casa' });
  assert.ok(error);
  assert.match(error.hint ?? '', /needs_family_plan/);
});

test('con plan familiar se crea el grupo y se invita con un código de un solo uso', async () => {
  await giveFamilyPlan(ana);
  const created = await ana.client.rpc('create_household', { p_name: 'Casa de Ana' });
  assert.equal(created.error, null, created.error?.message);
  household = created.data;

  const notOwner = await beto.client.rpc('create_household_invite');
  assert.ok(notOwner.error, 'solo quien creó el grupo invita');

  const invite = await ana.client.rpc('create_household_invite');
  assert.equal(invite.error, null, invite.error?.message);
  assert.match(invite.data, /^[A-HJKMNP-Z2-9]{8}$/);

  // El código se acepta sin importar mayúsculas ni espacios.
  const joined = await beto.client.rpc('join_household', { p_code: ` ${invite.data.toLowerCase()} ` });
  assert.equal(joined.error, null, joined.error?.message);
  assert.equal(joined.data, household);

  const reused = await carla.client.rpc('join_household', { p_code: invite.data });
  assert.ok(reused.error, 'el código ya se usó');
});

test('el grupo tiene como máximo 3 personas', async () => {
  const forCarla = await ana.client.rpc('create_household_invite');
  assert.equal((await carla.client.rpc('join_household', { p_code: forCarla.data })).error, null);

  const full = await ana.client.rpc('create_household_invite');
  assert.ok(full.error, 'no se generan códigos con el grupo completo');
  assert.match(full.error.hint ?? '', /household_full/);

  const info = await beto.client.rpc('my_household');
  assert.equal(info.error, null, info.error?.message);
  assert.deepEqual(info.data[0].members.map((m) => m.name), ['Ana', 'Beto', 'Carla']);
  assert.equal(info.data[0].is_owner, false);
});

test('los integrantes tienen el Premium del plan familiar', async () => {
  const { data, error } = await carla.client.rpc('my_premium');
  assert.equal(error, null, error?.message);
  assert.equal(data[0].plan, 'family');
  assert.ok(Date.parse(data[0].premium_until) > Date.now());

  const outsider = await dani.client.rpc('my_premium');
  assert.equal(outsider.data.length, 0, 'Dani no está en el grupo');
});

test('se ve lo compartido con el grupo, nunca lo privado', async () => {
  const shared = bill(ana, { name: 'Alquiler', household_id: household });
  const mine = bill(ana, { name: 'Gimnasio' });
  assert.equal((await ana.client.from('obligations').insert([shared, mine])).error, null);

  const seenByBeto = await visibleIds(beto);
  assert.ok(seenByBeto.has(shared.id));
  assert.ok(!seenByBeto.has(mine.id), 'lo privado de Ana no lo ve nadie más');
  assert.ok(!(await visibleIds(dani)).has(shared.id), 'alguien de afuera no ve lo del grupo');
});

test('nadie puede meter datos en un grupo ajeno', async () => {
  const intruder = bill(dani, { household_id: household });
  const { error } = await dani.client.from('obligations').insert(intruder);
  assert.ok(error, 'Dani no está en el grupo');
});

test('los integrantes editan lo compartido, pero solo quien lo cargó deja de compartirlo', async () => {
  const shared = bill(ana, { name: 'Internet', household_id: household });
  await ana.client.from('obligations').insert(shared);

  const paid = await beto.client
    .from('obligations')
    .update({ is_paid: true, paid_date: '2026-10-26', updated_at: Date.now() + 1 })
    .eq('id', shared.id);
  assert.equal(paid.error, null, paid.error?.message);

  const unshare = await beto.client
    .from('obligations')
    .update({ household_id: null, updated_at: Date.now() + 2 })
    .eq('id', shared.id);
  assert.ok(unshare.error, 'Beto no puede sacar del grupo una factura de Ana');

  const { data } = await server.from('obligations').select('is_paid, household_id').eq('id', shared.id).single();
  assert.equal(data.is_paid, true);
  assert.equal(data.household_id, household);
});

test('al salir del grupo, lo compartido vuelve a ser privado y se pierde el Premium', async () => {
  const fromBeto = bill(beto, { name: 'Expensas', household_id: household });
  await beto.client.from('obligations').insert(fromBeto);
  assert.ok((await visibleIds(ana)).has(fromBeto.id));

  const owner = await ana.client.rpc('leave_household');
  assert.ok(owner.error, 'quien creó el grupo no sale: lo disuelve');

  assert.equal((await beto.client.rpc('leave_household')).error, null);
  assert.ok(!(await visibleIds(ana)).has(fromBeto.id), 'Ana ya no ve lo que compartía Beto');
  assert.ok((await visibleIds(beto)).has(fromBeto.id), 'Beto sigue viendo lo suyo');
  assert.equal((await beto.client.rpc('my_premium')).data.length, 0);

  // El cambio llega a los teléfonos: updated_at sube, así "gana el último" lo aplica.
  const { data } = await server.from('obligations').select('household_id, updated_at').eq('id', fromBeto.id).single();
  assert.equal(data.household_id, null);
  assert.ok(Number(data.updated_at) > fromBeto.updated_at);
});

test('quien creó el grupo puede sacar a alguien y disolverlo', async () => {
  const fromCarla = bill(carla, { name: 'Supermercado', household_id: household });
  await carla.client.from('obligations').insert(fromCarla);

  assert.equal((await carla.client.rpc('remove_household_member', { p_user: ana.id })).error?.hint, 'not_owner');
  assert.equal((await ana.client.rpc('remove_household_member', { p_user: carla.id })).error, null);
  assert.ok(!(await visibleIds(ana)).has(fromCarla.id));

  assert.equal((await ana.client.rpc('delete_household')).error, null);
  assert.equal((await ana.client.rpc('my_household')).data.length, 0);
  const { data } = await server.from('obligations').select('id').eq('household_id', household);
  assert.equal(data.length, 0, 'nada quedó apuntando al grupo disuelto');
});
