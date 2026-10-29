-- Plan familiar: un grupo de hasta 3 personas que comparten las facturas, ingresos y pagos que cada
-- una marque como "de la casa". Lo que no se marca sigue siendo privado.
--
-- Reglas:
--   * Crea el grupo quien tiene el plan familiar activo (entitlements.plan = 'family'); los demás se
--     suman con un código de invitación de un solo uso que vence a los 7 días.
--   * Una persona está en un solo grupo a la vez.
--   * Lo compartido lo ven y editan todos los del grupo; solo quien lo cargó puede dejar de compartirlo.
--   * Si alguien sale (o lo sacan), lo que había compartido vuelve a ser privado suyo.
--   * Los integrantes tienen Premium mientras el plan familiar de quien creó el grupo esté activo.
-- Todo se maneja con funciones (RPC); los usuarios no leen ni escriben estas tablas directamente.

-- ---------------------------------------------------------------------------
-- Premium individual o familiar
-- ---------------------------------------------------------------------------

alter table public.entitlements
  add column plan text not null default 'individual' check (plan in ('individual', 'family'));

-- ---------------------------------------------------------------------------
-- Grupos, integrantes e invitaciones
-- ---------------------------------------------------------------------------

create table public.households (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users (id) on delete cascade,
  name text not null default 'Mi casa' check (char_length(name) between 1 and 60),
  created_at timestamptz not null default clock_timestamp()
);

create table public.household_members (
  -- La clave es la persona: así nadie puede estar en dos grupos.
  user_id uuid primary key references auth.users (id) on delete cascade,
  household_id uuid not null references public.households (id) on delete cascade,
  role text not null check (role in ('owner', 'member')),
  joined_at timestamptz not null default clock_timestamp()
);
create index household_members_household_idx on public.household_members (household_id);

create table public.household_invites (
  code text primary key check (char_length(code) = 8),
  household_id uuid not null references public.households (id) on delete cascade,
  created_by uuid not null references auth.users (id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default clock_timestamp()
);
create index household_invites_household_idx on public.household_invites (household_id);

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.household_invites enable row level security;
revoke all on public.households, public.household_members, public.household_invites from anon, authenticated;

/** Grupo del usuario con sesión (o null). Se usa en las políticas de seguridad. */
create function public.my_household_id() returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select household_id from public.household_members where user_id = (select auth.uid());
$$;

-- Máximo 3 personas por grupo. Se bloquea la fila del grupo para que dos invitaciones aceptadas a la
-- vez no pasen el límite.
create function public.household_members_limit() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform 1 from public.households where id = new.household_id for update;
  if (select count(*) from public.household_members where household_id = new.household_id) >= 3 then
    raise exception 'El grupo ya tiene 3 personas' using errcode = 'P0001', hint = 'household_full';
  end if;
  return new;
end;
$$;

create trigger household_members_limit
  before insert on public.household_members
  for each row execute function public.household_members_limit();

-- ---------------------------------------------------------------------------
-- Datos compartidos: facturas, ingresos y pagos con household_id
-- ---------------------------------------------------------------------------

alter table public.incomes add column household_id uuid references public.households (id) on delete set null;
alter table public.obligations add column household_id uuid references public.households (id) on delete set null;
alter table public.payment_history add column household_id uuid references public.households (id) on delete set null;
create index incomes_household_idx on public.incomes (household_id, server_updated_at);
create index obligations_household_idx on public.obligations (household_id, server_updated_at);
create index payment_history_household_idx on public.payment_history (household_id, server_updated_at);

/**
 * Deja de compartir lo de un grupo (o solo lo de una persona de ese grupo). Sube updated_at para
 * que el cambio llegue a los teléfonos como cualquier otro ("gana el último").
 */
create function public.unshare_household_rows(p_household uuid, p_user uuid) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  now_ms bigint := (extract(epoch from clock_timestamp()) * 1000)::bigint;
begin
  perform set_config('inariko.system', 'on', true);
  update public.incomes set household_id = null, updated_at = greatest(updated_at + 1, now_ms)
    where household_id = p_household and (p_user is null or user_id = p_user);
  update public.obligations set household_id = null, updated_at = greatest(updated_at + 1, now_ms)
    where household_id = p_household and (p_user is null or user_id = p_user);
  update public.payment_history set household_id = null, updated_at = greatest(updated_at + 1, now_ms)
    where household_id = p_household and (p_user is null or user_id = p_user);
  perform set_config('inariko.system', 'off', true);
end;
$$;
revoke execute on function public.unshare_household_rows(uuid, uuid) from public, anon, authenticated;

-- Quien sale del grupo se lleva lo suyo: lo que había compartido vuelve a ser privado.
create function public.household_member_left() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.unshare_household_rows(old.household_id, old.user_id);
  return old;
end;
$$;

create trigger household_member_left
  after delete on public.household_members
  for each row execute function public.household_member_left();

-- Solo quien cargó un dato puede cambiar si está compartido (los demás pueden editarlo, por ejemplo
-- marcar una factura como pagada, pero no sacarla del grupo ni pasarla a otro).
create function public.shared_row_guard() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE'
     and new.household_id is distinct from old.household_id
     and old.user_id is distinct from (select auth.uid())
     and (select auth.uid()) is not null
     and coalesce(current_setting('inariko.system', true), 'off') <> 'on' then
    raise exception 'Solo quien cargó este dato puede dejar de compartirlo';
  end if;
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array['incomes', 'obligations', 'payment_history'] loop
    execute format(
      'create trigger shared_row_guard before update on public.%I
         for each row execute function public.shared_row_guard()', t);

    -- Las políticas de "solo lo propio" pasan a incluir lo compartido con el grupo.
    execute format('drop policy "Leer lo propio" on public.%I', t);
    execute format('drop policy "Crear lo propio" on public.%I', t);
    execute format('drop policy "Modificar lo propio" on public.%I', t);

    execute format(
      'create policy "Leer lo propio y lo del grupo" on public.%I for select to authenticated
         using (user_id = (select auth.uid())
                or (household_id is not null and household_id = (select public.my_household_id())))', t);
    execute format(
      'create policy "Crear lo propio" on public.%I for insert to authenticated
         with check (user_id = (select auth.uid())
                     and (household_id is null or household_id = (select public.my_household_id())))', t);
    execute format(
      'create policy "Modificar lo propio y lo del grupo" on public.%I for update to authenticated
         using (user_id = (select auth.uid())
                or (household_id is not null and household_id = (select public.my_household_id())))
         with check ((household_id is null and user_id = (select auth.uid()))
                     or (household_id is not null and household_id = (select public.my_household_id())))', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Funciones que usa la app
-- ---------------------------------------------------------------------------

/** Premium del usuario: el propio o, si está en un grupo, el plan familiar de quien lo creó. */
create function public.my_premium()
returns table (premium_until timestamptz, plan text)
language sql
stable
security definer
set search_path = ''
as $$
  select e.premium_until, e.plan
  from public.entitlements e
  where e.user_id = (select auth.uid())
     or e.user_id = (
       select h.owner_id from public.households h
       join public.household_members m on m.household_id = h.id
       where m.user_id = (select auth.uid()) and e.plan = 'family'
     )
  order by e.premium_until desc
  limit 1;
$$;

/** El grupo del usuario: nombre, integrantes (con su nombre visible) y si es quien lo creó. */
create function public.my_household()
returns table (household_id uuid, name text, is_owner boolean, members jsonb)
language sql
stable
security definer
set search_path = ''
as $$
  select h.id, h.name, h.owner_id = (select auth.uid()),
    (select jsonb_agg(jsonb_build_object('user_id', m.user_id, 'name', coalesce(p.name, ''), 'role', m.role)
                      order by m.role desc, m.joined_at)
     from public.household_members m
     left join public.profiles p on p.user_id = m.user_id
     where m.household_id = h.id)
  from public.households h
  where h.id = (select public.my_household_id());
$$;

create function public.has_active_family_plan(p_user uuid) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.entitlements
    where user_id = p_user and plan = 'family' and premium_until > clock_timestamp()
  );
$$;
revoke execute on function public.has_active_family_plan(uuid) from public, anon, authenticated;

/** Crea el grupo de quien tiene el plan familiar. */
create function public.create_household(p_name text default 'Mi casa') returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  new_id uuid;
begin
  if uid is null then raise exception 'Sin sesión'; end if;
  if not public.has_active_family_plan(uid) then
    raise exception 'Hace falta el plan familiar para crear un grupo' using hint = 'needs_family_plan';
  end if;
  if exists (select 1 from public.household_members where user_id = uid) then
    raise exception 'Ya estás en un grupo' using hint = 'already_in_household';
  end if;
  insert into public.households (owner_id, name) values (uid, coalesce(nullif(trim(p_name), ''), 'Mi casa'))
    returning id into new_id;
  insert into public.household_members (user_id, household_id, role) values (uid, new_id, 'owner');
  return new_id;
end;
$$;

/** Código para sumar a alguien al grupo. Lo genera quien lo creó; reemplaza al anterior. */
create function public.create_household_invite() returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  hid uuid;
  -- Sin letras ni números que se confundan al dictarlos (O/0, I/1/L).
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  bytes bytea;
  new_code text;
begin
  select id into hid from public.households where owner_id = uid;
  if hid is null then raise exception 'Solo quien creó el grupo puede invitar' using hint = 'not_owner'; end if;
  if not public.has_active_family_plan(uid) then
    raise exception 'El plan familiar no está activo' using hint = 'needs_family_plan';
  end if;
  if (select count(*) from public.household_members where household_id = hid) >= 3 then
    raise exception 'El grupo ya tiene 3 personas' using hint = 'household_full';
  end if;
  delete from public.household_invites where household_id = hid;
  loop
    bytes := extensions.gen_random_bytes(8);
    new_code := '';
    for i in 0..7 loop
      new_code := new_code || substr(alphabet, (get_byte(bytes, i) % length(alphabet)) + 1, 1);
    end loop;
    exit when not exists (select 1 from public.household_invites where code = new_code);
  end loop;
  insert into public.household_invites (code, household_id, created_by, expires_at)
    values (new_code, hid, uid, clock_timestamp() + interval '7 days');
  return new_code;
end;
$$;

/** Sumarse a un grupo con un código. El código se usa una sola vez. */
create function public.join_household(p_code text) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  invite public.household_invites;
begin
  if uid is null then raise exception 'Sin sesión'; end if;
  select * into invite from public.household_invites
    where code = upper(replace(trim(p_code), ' ', '')) for update;
  if invite.code is null or invite.expires_at < clock_timestamp() then
    raise exception 'El código no es válido o ya venció' using hint = 'invalid_code';
  end if;
  if exists (select 1 from public.household_members where user_id = uid) then
    raise exception 'Ya estás en un grupo' using hint = 'already_in_household';
  end if;
  -- El límite de 3 lo controla el trigger de household_members.
  insert into public.household_members (user_id, household_id, role) values (uid, invite.household_id, 'member');
  delete from public.household_invites where code = invite.code;
  return invite.household_id;
end;
$$;

/** Salir del grupo. Quien lo creó no sale: lo disuelve (delete_household). */
create function public.leave_household() returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if exists (select 1 from public.household_members where user_id = uid and role = 'owner') then
    raise exception 'Quien creó el grupo no puede salir: puede disolverlo' using hint = 'owner_cannot_leave';
  end if;
  delete from public.household_members where user_id = uid;
end;
$$;

/** Quien creó el grupo saca a alguien. */
create function public.remove_household_member(p_user uuid) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  hid uuid;
begin
  select id into hid from public.households where owner_id = uid;
  if hid is null then raise exception 'Solo quien creó el grupo puede sacar a alguien' using hint = 'not_owner'; end if;
  if p_user = uid then raise exception 'No podés sacarte a vos' using hint = 'owner_cannot_leave'; end if;
  delete from public.household_members where user_id = p_user and household_id = hid;
end;
$$;

/** Quien creó el grupo lo disuelve: todo lo compartido vuelve a ser privado de quien lo cargó. */
create function public.delete_household() returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  hid uuid;
begin
  select id into hid from public.households where owner_id = uid;
  if hid is null then raise exception 'Solo quien creó el grupo puede disolverlo' using hint = 'not_owner'; end if;
  perform public.unshare_household_rows(hid, null);
  delete from public.households where id = hid;
end;
$$;

-- Solo usuarios con sesión pueden llamarlas.
revoke execute on function public.my_household_id(), public.my_premium(), public.my_household(),
  public.create_household(text), public.create_household_invite(), public.join_household(text),
  public.leave_household(), public.remove_household_member(uuid), public.delete_household()
  from public, anon;
grant execute on function public.my_household_id(), public.my_premium(), public.my_household(),
  public.create_household(text), public.create_household_invite(), public.join_household(text),
  public.leave_household(), public.remove_household_member(uuid), public.delete_household()
  to authenticated;
