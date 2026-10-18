-- Qué usuarios tienen Netto Premium y hasta cuándo.
--
-- La escribe solo el servidor: la integración con RevenueCat (un webhook con la clave secreta) o, para
-- cuentas de prueba y casos de soporte, alguien desde el panel de Supabase. Los usuarios solo pueden
-- leer su propia fila; no tienen permiso para crearla ni modificarla.
-- Sin fila, o con premium_until vencido, el usuario está en el plan gratis.
-- No se sincroniza con el teléfono como las demás tablas: la app la consulta y guarda una copia.

create table public.entitlements (
  user_id uuid primary key references auth.users (id) on delete cascade,
  premium_until timestamptz not null,
  source text not null check (source in ('revenuecat', 'manual')),
  -- En RevenueCat: el producto que la activó (mensual o anual), para soporte.
  product_id text check (char_length(product_id) <= 200),
  updated_at timestamptz not null default clock_timestamp()
);

alter table public.entitlements enable row level security;
revoke all on public.entitlements from anon, authenticated;
grant select on public.entitlements to authenticated;

create policy "Leer lo propio" on public.entitlements for select to authenticated
  using (user_id = (select auth.uid()));
