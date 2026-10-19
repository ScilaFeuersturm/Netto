// Cuentas de prueba en el Supabase LOCAL (`npx supabase start`). Correr desde la raíz del repo:
//
//   node supabase/scripts/cuentas-de-prueba.mjs                    crea free@netto.test y premium@netto.test
//   node supabase/scripts/cuentas-de-prueba.mjs --premium <email>  le da Premium por 1 año a esa cuenta
//   node supabase/scripts/cuentas-de-prueba.mjs --gratis <email>   la vuelve al plan gratis
//
// Usa la clave de servicio de demostración del Supabase local, así que no funciona contra la nube.
// En la nube, Premium se da desde el panel (SQL Editor) o, más adelante, lo da RevenueCat.
import { createRequire } from 'node:module';

const require = createRequire(new URL('../../mobile/package.json', import.meta.url));
const { createClient } = require('@supabase/supabase-js');

const API_URL = 'http://127.0.0.1:54321';
const SERVICE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const PASSWORD = 'NettoPrueba1';

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

async function setPremium(email, days) {
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
    .upsert({ user_id: user.id, premium_until: premiumUntil, source: 'manual', updated_at: new Date().toISOString() });
  if (error) throw error;
  console.log(`${email}: Premium hasta ${premiumUntil.slice(0, 10)}.`);
}

const [flag, email] = process.argv.slice(2);
try {
  if (flag === '--premium' && email) await setPremium(email, 365);
  else if (flag === '--gratis' && email) await setPremium(email, null);
  else if (!flag) {
    await ensureUser('free@netto.test', 'Prueba Gratis');
    await ensureUser('premium@netto.test', 'Prueba Premium');
    await setPremium('free@netto.test', null);
    await setPremium('premium@netto.test', 365);
    console.log(`Contraseña de las dos cuentas: ${PASSWORD}`);
  } else {
    console.error('Uso: node supabase/scripts/cuentas-de-prueba.mjs [--premium <email> | --gratis <email>]');
    process.exit(1);
  }
} catch (error) {
  console.error(error.message ?? error);
  process.exit(1);
}
