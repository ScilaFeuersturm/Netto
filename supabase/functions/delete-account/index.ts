// Borra la cuenta del usuario que hace el pedido (requisito de Apple y Google: borrar la cuenta desde la app).
// El usuario se identifica con su propio token; la eliminación usa la clave de servicio, que nunca sale
// del servidor. Todos sus datos se borran en cascada desde auth.users.
import { createClient } from 'npm:@supabase/supabase-js@2';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método no permitido' }), { status: 405, headers: JSON_HEADERS });
  }
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Falta la sesión' }), { status: 401, headers: JSON_HEADERS });
  }

  const url = Deno.env.get('SUPABASE_URL')!;
  const asUser = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data, error } = await asUser.auth.getUser();
  if (error || !data.user) {
    return new Response(JSON.stringify({ error: 'Sesión inválida' }), { status: 401, headers: JSON_HEADERS });
  }

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { error: deleteError } = await admin.auth.admin.deleteUser(data.user.id);
  if (deleteError) {
    return new Response(JSON.stringify({ error: 'No se pudo borrar la cuenta' }), { status: 500, headers: JSON_HEADERS });
  }
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: JSON_HEADERS });
});
