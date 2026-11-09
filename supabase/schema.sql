-- =============================================================
-- Getaway Adventures 502 — esquema de reservaciones
-- Prefijo ga_ para no chocar con otras tablas del mismo proyecto.
-- Idempotente: se puede ejecutar varias veces.
-- =============================================================

create extension if not exists pgcrypto;

-- ---------- Tablas ----------
create table if not exists public.ga_tours (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,
  nombre       text not null,
  destino      text not null,
  descripcion  text not null default '',
  imagen_url   text,
  precio_q     numeric(10,2) not null check (precio_q >= 0),
  duracion     text not null default '1 día',
  incluye      text[] not null default '{}',
  punto_salida text not null default 'Ciudad de Guatemala',
  activo       boolean not null default true,
  orden        int not null default 0,
  created_at   timestamptz not null default now()
);

create table if not exists public.ga_salidas (
  id         uuid primary key default gen_random_uuid(),
  tour_id    uuid not null references public.ga_tours(id) on delete cascade,
  fecha      date not null,
  cupo       int not null check (cupo > 0),
  precio_q   numeric(10,2) check (precio_q >= 0), -- opcional: sobrescribe el precio del tour
  activo     boolean not null default true,
  created_at timestamptz not null default now(),
  unique (tour_id, fecha)
);

create table if not exists public.ga_reservaciones (
  id         uuid primary key default gen_random_uuid(),
  codigo     text unique not null,
  salida_id  uuid not null references public.ga_salidas(id) on delete restrict,
  nombre     text not null check (length(trim(nombre)) between 2 and 120),
  email      text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  telefono   text not null check (length(trim(telefono)) between 8 and 20),
  personas   int  not null check (personas between 1 and 30),
  notas      text check (notas is null or length(notas) <= 1000),
  total_q    numeric(10,2) not null,
  estado     text not null default 'pendiente'
             check (estado in ('pendiente','confirmada','pagada','cancelada')),
  created_at timestamptz not null default now()
);

create index if not exists ga_salidas_tour_fecha_idx on public.ga_salidas(tour_id, fecha);
create index if not exists ga_reservaciones_salida_idx on public.ga_reservaciones(salida_id);

create table if not exists public.ga_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

-- ---------- Helpers ----------
create or replace function public.ga_es_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.ga_admins where user_id = auth.uid());
$$;

-- Salidas futuras con cupos disponibles (sin exponer datos de clientes)
create or replace function public.ga_salidas_disponibles(p_tour_id uuid)
returns table (id uuid, fecha date, cupo int, disponibles int, precio_q numeric)
language sql stable security definer set search_path = public as $$
  select s.id, s.fecha, s.cupo,
         s.cupo - coalesce((
           select sum(r.personas) from public.ga_reservaciones r
           where r.salida_id = s.id and r.estado <> 'cancelada'), 0)::int as disponibles,
         coalesce(s.precio_q, t.precio_q) as precio_q
  from public.ga_salidas s
  join public.ga_tours t on t.id = s.tour_id
  where s.tour_id = p_tour_id and s.activo and t.activo and s.fecha >= current_date
  order by s.fecha;
$$;

-- Crea la reservación validando cupo de forma atómica (bloquea la salida)
create or replace function public.ga_crear_reservacion(
  p_salida_id uuid, p_nombre text, p_email text, p_telefono text,
  p_personas int, p_notas text default null
) returns table (codigo text, total_q numeric)
language plpgsql security definer set search_path = public as $$
declare
  v_salida  public.ga_salidas%rowtype;
  v_precio  numeric;
  v_usados  int;
  v_codigo  text;
begin
  select * into v_salida from public.ga_salidas where id = p_salida_id for update;
  if not found or not v_salida.activo or v_salida.fecha < current_date then
    raise exception 'La salida seleccionada no está disponible';
  end if;

  select coalesce(v_salida.precio_q, t.precio_q) into v_precio
  from public.ga_tours t where t.id = v_salida.tour_id and t.activo;
  if v_precio is null then
    raise exception 'El tour no está disponible';
  end if;

  select coalesce(sum(r.personas), 0) into v_usados
  from public.ga_reservaciones r
  where r.salida_id = p_salida_id and r.estado <> 'cancelada';

  if p_personas is null or p_personas < 1 then
    raise exception 'Número de personas inválido';
  end if;
  if v_usados + p_personas > v_salida.cupo then
    raise exception 'Solo quedan % lugares disponibles', v_salida.cupo - v_usados;
  end if;

  loop
    v_codigo := 'GA-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    exit when not exists (select 1 from public.ga_reservaciones r where r.codigo = v_codigo);
  end loop;

  insert into public.ga_reservaciones
    (codigo, salida_id, nombre, email, telefono, personas, notas, total_q)
  values
    (v_codigo, p_salida_id, trim(p_nombre), lower(trim(p_email)), trim(p_telefono),
     p_personas, nullif(trim(coalesce(p_notas, '')), ''), v_precio * p_personas);

  return query select v_codigo, v_precio * p_personas;
end;
$$;

-- ---------- Seguridad (RLS) ----------
alter table public.ga_tours         enable row level security;
alter table public.ga_salidas       enable row level security;
alter table public.ga_reservaciones enable row level security;
alter table public.ga_admins        enable row level security;

drop policy if exists ga_tours_public_read on public.ga_tours;
create policy ga_tours_public_read on public.ga_tours
  for select using (activo or public.ga_es_admin());
drop policy if exists ga_tours_admin_all on public.ga_tours;
create policy ga_tours_admin_all on public.ga_tours
  for all to authenticated using (public.ga_es_admin()) with check (public.ga_es_admin());

drop policy if exists ga_salidas_admin_all on public.ga_salidas;
create policy ga_salidas_admin_all on public.ga_salidas
  for all to authenticated using (public.ga_es_admin()) with check (public.ga_es_admin());

-- Reservaciones: el público solo crea vía RPC; solo admins leen/actualizan
drop policy if exists ga_res_admin_read on public.ga_reservaciones;
create policy ga_res_admin_read on public.ga_reservaciones
  for select to authenticated using (public.ga_es_admin());
drop policy if exists ga_res_admin_update on public.ga_reservaciones;
create policy ga_res_admin_update on public.ga_reservaciones
  for update to authenticated using (public.ga_es_admin()) with check (public.ga_es_admin());

drop policy if exists ga_admins_self on public.ga_admins;
create policy ga_admins_self on public.ga_admins
  for select to authenticated using (user_id = auth.uid());

revoke all on public.ga_reservaciones from anon;
revoke all on public.ga_admins from anon;
revoke insert, update, delete on public.ga_tours, public.ga_salidas from anon;
grant select on public.ga_tours to anon, authenticated;
grant select, insert, update, delete on public.ga_tours, public.ga_salidas to authenticated;
grant select, update on public.ga_reservaciones to authenticated;
grant select on public.ga_admins to authenticated;

revoke all on function public.ga_crear_reservacion(uuid,text,text,text,int,text) from public;
grant execute on function public.ga_crear_reservacion(uuid,text,text,text,int,text) to anon, authenticated;
grant execute on function public.ga_salidas_disponibles(uuid) to anon, authenticated;
grant execute on function public.ga_es_admin() to anon, authenticated;

-- ---------- Columnas añadidas después ----------
alter table public.ga_tours add column if not exists horario text;
alter table public.ga_tours add column if not exists galeria text[] not null default '{}';
alter table public.ga_tours alter column punto_salida set default 'Antigua Guatemala';

-- Los datos de tours y salidas están en supabase/seed.sql (npm run db:seed)

notify pgrst, 'reload schema';
