-- Esquema inicial de Netto.
--
-- La app es local-first: cada teléfono tiene su base SQLite cifrada y sincroniza con estas tablas.
-- Reglas comunes a las tablas sincronizadas:
--   * id: UUID generado en el teléfono (así se puede crear sin conexión).
--   * updated_at: milisegundos del cambio en el teléfono. Si llega un cambio más viejo que el
--     guardado (por ejemplo, desde un teléfono que estuvo offline), se descarta.
--   * deleted: borrado lógico, para que el borrado llegue a los demás dispositivos.
--   * server_updated_at: lo pone el servidor; el teléfono pide "todo lo que cambió desde X".
-- Seguridad: Row Level Security en todas las tablas; cada usuario solo ve y modifica lo suyo.
-- No hay políticas de DELETE: los borrados son lógicos, y al borrar la cuenta (función
-- delete-account) todo se elimina en cascada desde auth.users.

-- ---------------------------------------------------------------------------
-- Funciones comunes
-- ---------------------------------------------------------------------------

create function public.sync_before_write() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if new.user_id is distinct from old.user_id then
      raise exception 'No se puede cambiar el dueño de un registro';
    end if;
    if new.updated_at < old.updated_at then
      return null; -- Cambio más viejo que el guardado: se ignora (gana el último).
    end if;
  end if;
  new.server_updated_at := clock_timestamp();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Perfiles (nombre visible del usuario; el email vive en auth.users)
-- ---------------------------------------------------------------------------

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '' check (char_length(name) <= 100),
  updated_at bigint not null default 0,
  deleted boolean not null default false,
  server_updated_at timestamptz not null default clock_timestamp()
);

-- Al registrarse se crea el perfil con el nombre que mandó la app en los metadatos.
create function public.handle_new_user() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, name, updated_at)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'name', ''), 100),
    (extract(epoch from clock_timestamp()) * 1000)::bigint
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Plan de presupuesto y preferencias (una fila por usuario)
-- ---------------------------------------------------------------------------

create table public.budget_plans (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  model_type text not null default 'RULE_50_30_20'
    check (model_type in ('RULE_50_30_20', 'RULE_70_20_10', 'PAY_YOURSELF_FIRST', 'CUSTOM')),
  necesidades_percent smallint not null check (necesidades_percent between 0 and 100),
  deseos_percent smallint not null check (deseos_percent between 0 and 100),
  ahorro_percent smallint not null check (ahorro_percent between 0 and 100),
  reminder_days_before smallint not null default 3 check (reminder_days_before between 1 and 30),
  display_currency text not null default 'PYG' check (display_currency in ('PYG', 'ARS', 'USD')),
  onboarding_completed boolean not null default false,
  updated_at bigint not null,
  deleted boolean not null default false,
  server_updated_at timestamptz not null default clock_timestamp(),
  check (necesidades_percent + deseos_percent + ahorro_percent = 100)
);

-- ---------------------------------------------------------------------------
-- Ingresos
-- ---------------------------------------------------------------------------

create table public.incomes (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  amount bigint not null check (amount >= 0),
  currency text not null check (currency in ('PYG', 'ARS', 'USD')),
  day_of_month smallint not null default 1 check (day_of_month between 1 and 31),
  is_recurring boolean not null default true,
  updated_at bigint not null,
  deleted boolean not null default false,
  server_updated_at timestamptz not null default clock_timestamp()
);

-- ---------------------------------------------------------------------------
-- Obligaciones (facturas, cuotas, gastos)
-- ---------------------------------------------------------------------------

create table public.obligations (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  reference text check (char_length(reference) <= 120),
  amount bigint not null check (amount >= 0),
  currency text not null check (currency in ('PYG', 'ARS', 'USD')),
  due_date date not null,
  category text not null check (category in (
    'SERVICIOS', 'INTERNET', 'VIVIENDA', 'EDUCACION', 'SALUD', 'TRANSPORTE',
    'ALIMENTACION', 'DEUDAS', 'MASCOTAS', 'OCIO', 'OTROS'
  )),
  is_recurring boolean not null default false,
  is_paid boolean not null default false,
  paid_date date,
  notes text check (char_length(notes) <= 1000),
  created_from_ocr boolean not null default false,
  created_on date not null,
  updated_at bigint not null,
  deleted boolean not null default false,
  server_updated_at timestamptz not null default clock_timestamp()
);

-- ---------------------------------------------------------------------------
-- Historial de pagos
-- ---------------------------------------------------------------------------

create table public.payment_history (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  obligation_id uuid not null,
  obligation_name text not null check (char_length(obligation_name) between 1 and 120),
  category text not null check (category in (
    'SERVICIOS', 'INTERNET', 'VIVIENDA', 'EDUCACION', 'SALUD', 'TRANSPORTE',
    'ALIMENTACION', 'DEUDAS', 'MASCOTAS', 'OCIO', 'OTROS'
  )),
  amount bigint not null check (amount >= 0),
  currency text not null check (currency in ('PYG', 'ARS', 'USD')),
  paid_date date not null,
  updated_at bigint not null,
  deleted boolean not null default false,
  server_updated_at timestamptz not null default clock_timestamp()
);

-- ---------------------------------------------------------------------------
-- Triggers, índices, permisos y RLS (iguales para todas las tablas sincronizadas)
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array['profiles', 'budget_plans', 'incomes', 'obligations', 'payment_history'] loop
    execute format(
      'create trigger sync_before_write before insert or update on public.%I
         for each row execute function public.sync_before_write()', t);
    execute format(
      'create index %I on public.%I (user_id, server_updated_at)', t || '_sync_idx', t);

    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select, insert, update on public.%I to authenticated', t);

    execute format(
      'create policy "Leer lo propio" on public.%I for select to authenticated
         using (user_id = (select auth.uid()))', t);
    execute format(
      'create policy "Crear lo propio" on public.%I for insert to authenticated
         with check (user_id = (select auth.uid()))', t);
    execute format(
      'create policy "Modificar lo propio" on public.%I for update to authenticated
         using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
  end loop;
end;
$$;
