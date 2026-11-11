-- =============================================================
-- Textos en inglés para tours y promociones (sitio bilingüe).
-- Si un campo *_en está vacío, la página muestra el texto en español.
-- Idempotente: solo rellena traducciones que aún no existan.
-- =============================================================

alter table public.ga_tours add column if not exists nombre_en       text;
alter table public.ga_tours add column if not exists destino_en      text;
alter table public.ga_tours add column if not exists descripcion_en  text;
alter table public.ga_tours add column if not exists duracion_en     text;
alter table public.ga_tours add column if not exists punto_salida_en text;
alter table public.ga_tours add column if not exists horario_en      text;
alter table public.ga_tours add column if not exists incluye_en      text[] not null default '{}';

alter table public.ga_promociones add column if not exists titulo_en      text;
alter table public.ga_promociones add column if not exists descripcion_en text;

update public.ga_tours t set
  nombre_en       = coalesce(t.nombre_en, v.nombre),
  destino_en      = coalesce(t.destino_en, v.destino),
  descripcion_en  = coalesce(t.descripcion_en, v.descripcion),
  duracion_en     = coalesce(t.duracion_en, v.duracion),
  punto_salida_en = coalesce(t.punto_salida_en, 'Antigua Guatemala'),
  horario_en      = coalesce(t.horario_en, v.horario),
  incluye_en      = case when cardinality(t.incluye_en) = 0 then v.incluye else t.incluye_en end
from (values
 ('acatenango', 'Acatenango Overnight', 'Acatenango Volcano',
  'Hike Acatenango Volcano and spend the night at our base camp with a direct view of the erupting Volcán de Fuego. Sunrise above the clouds.',
  '2 days / 1 night', 'Departs 8:00 am from Antigua · returns 12:30 pm the next day',
  array['Round-trip transportation','Professional guide','Base camp (cabin / dome)','Meals and hot drinks','Camping gear']),

 ('acatenango-4x4', 'Offroad Acatenango 4x4', 'Acatenango Volcano',
  'Exclusive 4x4 route up to the camp, no tough hike. Camp above the clouds with sunset views and Volcán de Fuego. Small group and personal attention, perfect for all fitness levels.',
  '2 days / 1 night', 'Departs 1:00 pm from Antigua · returns 11:00 am the next day',
  array['Round-trip 4x4 transportation','Professional guide','3 meals and hot drinks','Camping gear (mattress, sleeping bag, cabin / dome)','Cap, jacket and gloves']),

 ('atitlan', 'Lake Atitlán Tour', 'Sololá',
  'San Juan La Laguna (chocolate or stingless bees, women''s weaving cooperative, umbrella street), San Pedro La Laguna and Santiago Atitlán with its church, art gallery, cofradía and viewpoint.',
  '1 day', 'Departs 5:30 am from Antigua · breakfast in Panajachel at 7:00 am',
  array['Breakfast','Guide','Transfers','Boat']),

 ('pacaya-atv', 'Pacaya ATV', 'San Vicente Pacaya',
  'Ride an ATV along the trails of Pacaya Volcano through pastures and forest, with volcano views. 3-hour route plus time for lunch.',
  '1 day (≈ 6 h)', 'Departs 7:00 am from Antigua (La Parada or Condesa) · returns 1:00 pm',
  array['Round-trip transportation','Guide','ATV','Lunch','Passenger pays extra']),

 ('pueblos-atv', 'Villages ATV Tour', 'Antigua Guatemala',
  'Explore 5 magical villages around Antigua by ATV: chocolate and wine house in San Juan del Obispo, jade house, macadamia farm and textile market in San Antonio Aguas Calientes.',
  '≈ 3 hours', 'Departures 10:00 am or 2:00 pm from our agency in Antigua',
  array['Guide','ATV (passenger pays 50%)','Helmet','Entrance fees']),

 ('rapel-cascada', 'Waterfall Rappelling', 'Near Antigua',
  'Rappel down a waterfall inside a private farm. Includes a safety briefing, a short forest hike and a photo stop.',
  'Half day', 'Departs 7:00 am from Antigua · arrives at the farm 8:15 am',
  array['Transportation','Guide and instructor','Rappelling gear and helmet','Safety briefing']),

 ('semuc-champey', 'Semuc Champey', 'Alta Verapaz',
  'Turquoise pools on a natural limestone bridge, candlelit caves and tubing on the Cahabón River.',
  '3 days / 2 nights', 'Departs 8:00 am from Antigua',
  array['Transportation','Lodging','Guide','Cave tour'])
) as v(slug, nombre, destino, descripcion, duracion, horario, incluye)
where t.slug = v.slug;
