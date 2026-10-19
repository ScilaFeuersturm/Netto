// Le da Premium por 1 año a la cuenta de prueba (EMAIL), como lo haría el servidor.
// Corre en la computadora (no en el teléfono) y solo contra el Supabase local: usa su clave de
// servicio de demostración, que no sirve en la nube.
const API = 'http://127.0.0.1:54321';
const KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const headers = { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' };

const users = json(http.get(API + '/auth/v1/admin/users?per_page=1000', { headers: headers }).body).users;
const user = users.find((u) => u.email === EMAIL.toLowerCase());
if (!user) throw new Error('No existe la cuenta ' + EMAIL);

const until = new Date(Date.now() + 365 * 864e5).toISOString();
const response = http.post(API + '/rest/v1/entitlements', {
  headers: Object.assign({ Prefer: 'resolution=merge-duplicates' }, headers),
  body: JSON.stringify({ user_id: user.id, premium_until: until, source: 'manual' }),
});
if (!response.ok) throw new Error('No se pudo dar Premium: ' + response.status + ' ' + response.body);
