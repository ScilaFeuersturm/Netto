// Crea dos cuentas nuevas para la prueba del plan familiar: OWNER (con plan familiar) y GUEST.
// Corre en la computadora y solo contra el Supabase local (clave de servicio de demostración).
const API = 'http://127.0.0.1:54321';
const KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const headers = { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' };

function createUser(email, name) {
  const response = http.post(API + '/auth/v1/admin/users', {
    headers: headers,
    body: JSON.stringify({ email: email, password: 'secreto123', email_confirm: true, user_metadata: { name: name } }),
  });
  if (!response.ok) throw new Error('No se pudo crear ' + email + ': ' + response.body);
  return json(response.body).id;
}

const ownerId = createUser(OWNER, 'Ana');
createUser(GUEST, 'Beto');
const until = new Date(Date.now() + 365 * 864e5).toISOString();
const grant = http.post(API + '/rest/v1/entitlements', {
  headers: headers,
  body: JSON.stringify({ user_id: ownerId, premium_until: until, source: 'manual', plan: 'family' }),
});
if (!grant.ok) throw new Error('No se pudo dar el plan familiar: ' + grant.body);
