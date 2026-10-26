// Cuentas de prueba en el Supabase LOCAL (`npx supabase start`). Correr desde la raíz del repo:
//
//   node supabase/scripts/cuentas-de-prueba.mjs                    crea free@inariko.test y premium@inariko.test
//   node supabase/scripts/cuentas-de-prueba.mjs --premium <email>  le da Premium por 1 año a esa cuenta
//   node supabase/scripts/cuentas-de-prueba.mjs --gratis <email>   la vuelve al plan gratis
//   node supabase/scripts/cuentas-de-prueba.mjs --parejas          crea dos parejas con plan familiar
//   node supabase/scripts/cuentas-de-prueba.mjs --familiar <email> le da el plan familiar (sin grupo)
//
// Usa la clave de servicio de demostración del Supabase local, así que no funciona contra la nube.
// En la nube, Premium se da desde el panel (SQL Editor) o, más adelante, lo da RevenueCat.
import { createRequire } from 'node:module';

const require = createRequire(new URL('../../mobile/package.json', import.meta.url));
const { createClient } = require('@supabase/supabase-js');

const API_URL = 'http://127.0.0.1:54321';
const SERVICE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const PASSWORD = 'InarikoPrueba1';

const server = createClient(API_URL, SERVICE_KEY, { auth: { persistSession: false } });

async function findUser(email) {
  // Pocas cuentas locales: alcanza con la primera página.
  const { data, error } = await server.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  return data.users.find((u) => u.email === email.toLowerCase()) ?? null;
}

async function ensureUser(email, name) {
  const existing = await findUser(email);
  if (existing) return existing;
  const { data, error } = await server.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { name },
  });
  if (error) throw error;
  return data.user;
}

async function setPremium(email, days, plan = 'individual') {
  const user = await findUser(email);
  if (!user) throw new Error(`No existe la cuenta ${email} en el Supabase local.`);
  if (days == null) {
    const { error } = await server.from('entitlements').delete().eq('user_id', user.id);
    if (error) throw error;
    console.log(`${email}: plan gratis.`);
    return;
  }
  const premiumUntil = new Date(Date.now() + days * 864e5).toISOString();
  const { error } = await server
    .from('entitlements')
    .upsert({ user_id: user.id, premium_until: premiumUntil, source: 'manual', plan, updated_at: new Date().toISOString() });
  if (error) throw error;
  console.log(`${email}: Premium${plan === 'family' ? ' familiar' : ''} hasta ${premiumUntil.slice(0, 10)}.`);
}

/**
 * Una pareja con plan familiar: quien paga crea el grupo y la otra persona ya está adentro.
 * Se escribe directo con la clave de servicio (sin código de invitación), solo para pruebas locales.
 */
async function ensureCouple(ownerEmail, ownerName, partnerEmail, partnerName, groupName) {
  const owner = await ensureUser(ownerEmail, ownerName);
  const partner = await ensureUser(partnerEmail, partnerName);
  await setPremium(ownerEmail, 365, 'family');
  for (const user of [owner, partner]) {
    const { error } = await server.from('household_members').delete().eq('user_id', user.id);
    if (error) throw error;
  }
  await server.from('households').delete().eq('owner_id', owner.id);
  const { data: household, error } = await server
    .from('households')
    .insert({ owner_id: owner.id, name: groupName })
    .select('id')
    .single();
  if (error) throw error;
  const members = await server.from('household_members').insert([
    { user_id: owner.id, household_id: household.id, role: 'owner' },
    { user_id: partner.id, household_id: household.id, role: 'member' },
  ]);
  if (members.error) throw members.error;
  console.log(`${groupName}: ${ownerEmail} (paga) y ${partnerEmail}.`);
}

const [flag, email] = process.argv.slice(2);
try {
  if (flag === '--premium' && email) await setPremium(email, 365);
  else if (flag === '--gratis' && email) await setPremium(email, null);
  else if (flag === '--familiar' && email) await setPremium(email, 365, 'family');
  else if (flag === '--parejas') {
    await ensureCouple('pareja1.ana@inariko.test', 'Ana', 'pareja1.beto@inariko.test', 'Beto', 'Casa de Ana y Beto');
    await ensureCouple('pareja2.carla@inariko.test', 'Carla', 'pareja2.dani@inariko.test', 'Dani', 'Casa de Carla y Dani');
    console.log(`Contraseña de las cuatro cuentas: ${PASSWORD}`);
  }
  else if (!flag) {
    await ensureUser('free@inariko.test', 'Prueba Gratis');
    await ensureUser('premium@inariko.test', 'Prueba Premium');
    await setPremium('free@inariko.test', null);
    await setPremium('premium@inariko.test', 365);
    console.log(`Contraseña de las dos cuentas: ${PASSWORD}`);
  } else {
    console.error(
      'Uso: node supabase/scripts/cuentas-de-prueba.mjs [--premium <email> | --gratis <email> | --familiar <email> | --parejas]',
    );
    process.exit(1);
  }
} catch (error) {
  console.error(error.message ?? error);
  process.exit(1);
}
