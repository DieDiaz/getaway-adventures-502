-- =============================================================
-- Tours reales de Getaway Adventures 502 (según sus publicaciones)
-- Las imágenes viven en /public/getaway-adventures-imagenes (no en la BD).
-- Volver a ejecutarlo SOBRESCRIBE los datos de estos tours.
-- =============================================================

-- Quitar tours de ejemplo anteriores que no tengan reservaciones
delete from public.ga_tours t
where t.slug in ('tikal', 'antigua', 'el-paredon')
  and not exists (
    select 1 from public.ga_salidas s join public.ga_reservaciones r on r.salida_id = s.id
    where s.tour_id = t.id);

insert into public.ga_tours
  (slug, nombre, destino, descripcion, precio_q, duracion, horario, incluye, imagen_url, galeria, orden)
values
 ('acatenango', 'Acatenango Overnight', 'Volcán Acatenango',
  'Caminata al Volcán Acatenango y noche en nuestro base camp con vista directa al Volcán de Fuego en erupción. Amanecer sobre las nubes.',
  650, '2 días / 1 noche', 'Salida 8:00 am desde Antigua · regreso 12:30 pm del día siguiente',
  array['Transporte ida y vuelta','Guía profesional','Base camp (cabaña / domo)','Comidas y bebidas calientes','Equipo de campamento'],
  '/getaway-adventures-imagenes/volcan/volcan_34_DX-t9hfl4nh.jpg',
  array['/getaway-adventures-imagenes/volcan/volcan_67_DRJ9C_GjgQo.jpg',
        '/getaway-adventures-imagenes/paisajes/paisajes_65_DRM1JBNjqzo.jpg',
        '/getaway-adventures-imagenes/campamento_y_oficina/campamento_y_oficina_37_DXhqCPPgtGX.jpg',
        '/getaway-adventures-imagenes/volcan/volcan_50_DVIFpsSDRVK.jpg',
        '/getaway-adventures-imagenes/paisajes/paisajes_79_DJB_iXRuJ2F.jpg'], 1),

 ('acatenango-4x4', 'Offroad Acatenango 4x4', 'Volcán Acatenango',
  'Ruta exclusiva en 4x4 hasta el campamento, sin caminata difícil. Acampa sobre las nubes con vistas al atardecer y al Volcán de Fuego. Grupo pequeño y atención personalizada, perfecto para todos los niveles.',
  1200, '2 días / 1 noche', 'Salida 1:00 pm desde Antigua · regreso 11:00 am del día siguiente',
  array['Transporte ida y vuelta en 4x4','Guía profesional','3 comidas y bebidas calientes','Equipo de campamento (colchón, saco de dormir, cabaña / domo)','Gorra, chaqueta y guantes'],
  '/getaway-adventures-imagenes/vehiculos/vehiculos_31_DZ5rMf1mOYL.jpg',
  array['/getaway-adventures-imagenes/promocionales/promocionales_01_DExX2BTuNQL.jpg',
        '/getaway-adventures-imagenes/volcan/volcan_11_Dcr6IjeCMTQ.jpg',
        '/getaway-adventures-imagenes/campamento_y_oficina/campamento_y_oficina_04_DemhCLBFnut.jpg'], 2),

 ('atitlan', 'Tour Lago de Atitlán', 'Sololá',
  'San Juan La Laguna (chocolate o abejas meliponas, cooperativa de mujeres textileras, calle de sombrillas), San Pedro La Laguna y Santiago Atitlán con su iglesia, galería de arte, cofradía y mirador.',
  450, '1 día', 'Salida 5:30 am desde Antigua · desayuno en Panajachel 7:00 am',
  array['Desayuno','Guía','Traslados','Lancha'],
  '/getaway-adventures-imagenes/paisajes/paisajes_66_DRMrKy7jrNf.jpg',
  array['/getaway-adventures-imagenes/promocionales/promocionales_23_Da_MWXvCjMi.jpg',
        '/getaway-adventures-imagenes/paisajes/paisajes_05_DeiBchGGAVZ.jpg'], 3),

 ('pacaya-atv', 'Pacaya ATV', 'San Vicente Pacaya',
  'Recorre en cuatrimoto los caminos del Volcán de Pacaya entre potreros y bosque, con vistas al volcán. 3 horas de ruta y tiempo para almorzar.',
  850, '1 día (≈ 6 h)', 'Salida 7:00 am desde Antigua (La Parada o Condesa) · regreso 1:00 pm',
  array['Transporte ida y vuelta','Guía','Cuatrimoto','Almuerzo','Copiloto paga extra'],
  '/getaway-adventures-imagenes/promocionales/promocionales_25_DalxgprGLqW.jpg',
  array['/getaway-adventures-imagenes/promocionales/promocionales_25_DalxgprGLqW.jpg'], 4),

 ('pueblos-atv', 'Tour de Pueblos en ATV', 'Antigua Guatemala',
  'Explora 5 pueblos mágicos alrededor de Antigua en cuatrimoto: casa del chocolate y del vino en San Juan del Obispo, casa del jade, finca de macadamia y mercado de textiles en San Antonio Aguas Calientes.',
  600, '≈ 3 horas', 'Salidas 10:00 am o 2:00 pm desde la agencia en Antigua',
  array['Guía','Cuatrimoto (copiloto paga 50%)','Casco','Entradas'],
  '/getaway-adventures-imagenes/promocionales/promocionales_80_DI9Dq9PuB3G.jpg',
  array['/getaway-adventures-imagenes/promocionales/promocionales_24_Da_MDtqioyw.jpg',
        '/getaway-adventures-imagenes/promocionales/promocionales_80_DI9Dq9PuB3G.jpg'], 5),

 ('rapel-cascada', 'Rapel en Cascada', 'Cerca de Antigua',
  'Desciende en rapel por una cascada dentro de una finca. Incluye charla de seguridad, caminata corta por el bosque y parada para fotos.',
  650, 'Medio día', 'Salida 7:00 am desde Antigua · llegada a la finca 8:15 am',
  array['Transporte','Guía e instructor','Equipo de rapel y casco','Charla de seguridad'],
  '/getaway-adventures-imagenes/promocionales/promocionales_26_DalwxBUmA-p.jpg',
  array['/getaway-adventures-imagenes/promocionales/promocionales_26_DalwxBUmA-p.jpg'], 6),

 ('semuc-champey', 'Semuc Champey', 'Alta Verapaz',
  'Pozas turquesa sobre un puente natural de piedra caliza, cuevas con velas y tubing en el río Cahabón.',
  1450, '3 días / 2 noches', 'Salida 8:00 am desde Antigua',
  array['Transporte','Hospedaje','Guía','Tour de cuevas'],
  '/getaway-adventures-imagenes/semuc/semuc-champey.jpg',
  array['/getaway-adventures-imagenes/semuc/semuc-champey.jpg'], 7)
on conflict (slug) do update set
  nombre = excluded.nombre, destino = excluded.destino, descripcion = excluded.descripcion,
  precio_q = excluded.precio_q, duracion = excluded.duracion, horario = excluded.horario,
  incluye = excluded.incluye, imagen_url = excluded.imagen_url, galeria = excluded.galeria,
  orden = excluded.orden, punto_salida = 'Antigua Guatemala', activo = true;

-- Regenerar salidas futuras que aún no tienen reservaciones
delete from public.ga_salidas s
where s.fecha > current_date
  and not exists (select 1 from public.ga_reservaciones r where r.salida_id = s.id);

-- Salidas diarias durante los próximos 30 días (los tours salen todos los días)
insert into public.ga_salidas (tour_id, fecha, cupo)
select t.id, d::date,
       case t.slug when 'acatenango-4x4' then 8 when 'acatenango' then 20 else 12 end
from public.ga_tours t
cross join generate_series(current_date + 1, current_date + 30, interval '1 day') d
where t.activo
on conflict (tour_id, fecha) do nothing;
