-- =============================================================
-- Getaway Adventures 502 — módulo de administración
-- Promociones, descuentos, consentimiento de marketing, clientes y Storage.
-- Idempotente: npm run db:admin
-- =============================================================

-- ---------- Promociones ----------
create table if not exists public.ga_promociones (
  id            uuid primary key default gen_random_uuid(),
  titulo        text not null check (length(trim(titulo)) between 2 and 120),
  descripcion   text not null default '',
  imagen_url    text,
  codigo        text unique check (codigo is null or codigo ~ '^[A-Z0-9_-]{3,30}$'),
  descuento_pct numeric(5,2) not null default 0 check (descuento_pct between 0 and 100),
  tour_id       uuid references public.ga_tours(id) on delete set null,
  desde         date,
  hasta         date,
  activo        boolean not null default true,
  created_at    timestamptz not null default now(),
  check (hasta is null or desde is null or hasta >= desde)
);

alter table public.ga_promociones enable row level security;
drop policy if exists ga_promos_public_read on public.ga_promociones;
create policy ga_promos_public_read on public.ga_promociones for select using (
  (activo and (desde is null or desde <= current_date) and (hasta is null or hasta >= current_date))
  or public.ga_es_admin());
drop policy if exists ga_promos_admin_all on public.ga_promociones;
create policy ga_promos_admin_all on public.ga_promociones for all to authenticated
  using (public.ga_es_admin()) with check (public.ga_es_admin());
grant select on public.ga_promociones to anon, authenticated;
grant insert, update, delete on public.ga_promociones to authenticated;

-- ---------- Reservaciones: descuento y consentimiento ----------
alter table public.ga_reservaciones add column if not exists subtotal_q    numeric(10,2);
alter table public.ga_reservaciones add column if not exists descuento_q   numeric(10,2) not null default 0;
alter table public.ga_reservaciones add column if not exists promo_id      uuid references public.ga_promociones(id) on delete set null;
alter table public.ga_reservaciones add column if not exists acepta_promos boolean not null default false;
update public.ga_reservaciones set subtotal_q = total_q where subtotal_q is null;

-- Valida un código para un tour (lo usa el formulario público)
create or replace function public.ga_validar_promo(p_codigo text, p_tour_id uuid)
returns table (id uuid, titulo text, descuento_pct numeric)
language sql stable security definer set search_path = public as $$
  select p.id, p.titulo, p.descuento_pct
  from public.ga_promociones p
  where p.codigo = upper(trim(p_codigo))
    and p.activo and p.descuento_pct > 0
    and (p.desde is null or p.desde <= current_date)
    and (p.hasta is null or p.hasta >= current_date)
    and (p.tour_id is null or p.tour_id = p_tour_id)
  limit 1;
$$;
grant execute on function public.ga_validar_promo(text, uuid) to anon, authenticated;

drop function if exists public.ga_crear_reservacion(uuid,text,text,text,int,text);
create or replace function public.ga_crear_reservacion(
  p_salida_id uuid, p_nombre text, p_email text, p_telefono text,
  p_personas int, p_notas text default null,
  p_codigo_promo text default null, p_acepta_promos boolean default false
) returns table (codigo text, subtotal_q numeric, descuento_q numeric, total_q numeric)
language plpgsql security definer set search_path = public as $$
declare
  v_salida  public.ga_salidas%rowtype;
  v_precio  numeric;
  v_usados  int;
  v_codigo  text;
  v_sub     numeric;
  v_desc    numeric := 0;
  v_promo_id  uuid;
  v_promo_pct numeric;
begin
  select * into v_salida from public.ga_salidas where id = p_salida_id for update;
  if not found or not v_salida.activo or v_salida.fecha < current_date then
    raise exception 'La salida seleccionada no está disponible';
  end if;

  select coalesce(v_salida.precio_q, t.precio_q) into v_precio
  from public.ga_tours t where t.id = v_salida.tour_id and t.activo;
  if v_precio is null then raise exception 'El tour no está disponible'; end if;

  if p_personas is null or p_personas < 1 then raise exception 'Número de personas inválido'; end if;

  select coalesce(sum(r.personas), 0) into v_usados
  from public.ga_reservaciones r where r.salida_id = p_salida_id and r.estado <> 'cancelada';
  if v_usados + p_personas > v_salida.cupo then
    raise exception 'Solo quedan % lugares disponibles', v_salida.cupo - v_usados;
  end if;

  v_sub := v_precio * p_personas;
  if nullif(trim(coalesce(p_codigo_promo, '')), '') is not null then
    select vp.id, vp.descuento_pct into v_promo_id, v_promo_pct
    from public.ga_validar_promo(p_codigo_promo, v_salida.tour_id) vp;
    if v_promo_id is null then raise exception 'El código de promoción no es válido para este tour'; end if;
    v_desc := round(v_sub * v_promo_pct / 100, 2);
  end if;

  loop
    v_codigo := 'GA-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    exit when not exists (select 1 from public.ga_reservaciones r where r.codigo = v_codigo);
  end loop;

  insert into public.ga_reservaciones
    (codigo, salida_id, nombre, email, telefono, personas, notas,
     subtotal_q, descuento_q, total_q, promo_id, acepta_promos)
  values
    (v_codigo, p_salida_id, trim(p_nombre), lower(trim(p_email)), trim(p_telefono), p_personas,
     nullif(trim(coalesce(p_notas, '')), ''), v_sub, v_desc, v_sub - v_desc, v_promo_id,
     coalesce(p_acepta_promos, false));

  return query select v_codigo, v_sub, v_desc, v_sub - v_desc;
end;
$$;
revoke all on function public.ga_crear_reservacion(uuid,text,text,text,int,text,text,boolean) from public;
grant execute on function public.ga_crear_reservacion(uuid,text,text,text,int,text,text,boolean) to anon, authenticated;

-- ---------- Base de clientes (respeta RLS: solo admins ven filas) ----------
create or replace view public.ga_clientes with (security_invoker = true) as
select
  lower(r.email)                                                         as email,
  (array_agg(r.nombre   order by r.created_at desc))[1]                  as nombre,
  (array_agg(r.telefono order by r.created_at desc))[1]                  as telefono,
  count(*)::int                                                          as reservas,
  count(*) filter (where r.estado <> 'cancelada')::int                   as reservas_activas,
  coalesce(sum(r.personas) filter (where r.estado <> 'cancelada'), 0)::int as viajeros,
  coalesce(sum(r.total_q) filter (where r.estado <> 'cancelada'), 0)     as total_q,
  coalesce(sum(r.total_q) filter (where r.estado = 'pagada'), 0)         as pagado_q,
  bool_or(r.acepta_promos)                                               as acepta_promos,
  min(r.created_at)                                                      as primera_reserva,
  max(r.created_at)                                                      as ultima_reserva,
  max(s.fecha)                                                           as ultimo_viaje,
  array_agg(distinct t.nombre)                                           as tours
from public.ga_reservaciones r
join public.ga_salidas s on s.id = r.salida_id
join public.ga_tours t   on t.id = s.tour_id
group by lower(r.email);
revoke all on public.ga_clientes from anon;
grant select on public.ga_clientes to authenticated;

-- ---------- Storage para fotos subidas desde el panel ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ga-media', 'ga-media', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists ga_media_admin_insert on storage.objects;
create policy ga_media_admin_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'ga-media' and public.ga_es_admin());
drop policy if exists ga_media_admin_update on storage.objects;
create policy ga_media_admin_update on storage.objects for update to authenticated
  using (bucket_id = 'ga-media' and public.ga_es_admin());
drop policy if exists ga_media_admin_delete on storage.objects;
create policy ga_media_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'ga-media' and public.ga_es_admin());

notify pgrst, 'reload schema';

-- ---------- Ubicación de cada tour en el mapa ----------
alter table public.ga_tours add column if not exists lat numeric(8,5) check (lat between 13 and 18.5);
alter table public.ga_tours add column if not exists lng numeric(8,5) check (lng between -92.5 and -88);
update public.ga_tours t set lat = v.lat, lng = v.lng
from (values
  ('acatenango',     14.50090, -90.87620),
  ('acatenango-4x4', 14.51800, -90.86000),
  ('atitlan',        14.69070, -91.20250),
  ('pacaya-atv',     14.38130, -90.60150),
  ('pueblos-atv',    14.55860, -90.72950),
  ('rapel-cascada',  14.48500, -90.78000),
  ('semuc-champey',  15.53330, -89.96140)
) as v(slug, lat, lng)
where t.slug = v.slug and t.lat is null;

notify pgrst, 'reload schema';
