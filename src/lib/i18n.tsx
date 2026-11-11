import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

export type Lang = 'en' | 'es';
const STORAGE_KEY = 'ga-lang';

const en = {
  'nav.tours': 'Tours',
  'nav.howToBook': 'How to book',
  'nav.langLabel': 'Language',
  'wa.info': 'Hi! I would like information about your tours.',
  'wa.visit': 'Hi! I would like to visit your agency in Antigua.',
  'wa.tourInfo': 'Hi! I would like information about {tour}.',
  'wa.booked': 'Hi! I just booked {tour} for {date} ({n} pax). My code is {code}.',
  'footer.tagline': 'Tours and adventures from Antigua Guatemala 🇬🇹',
  'footer.agency': '📍 Agency in Antigua Guatemala',
  'footer.admin': 'Agency login',

  'home.heroAlt': 'Volcán de Agua at sunset above the clouds, seen from Acatenango',
  'home.heroTitle1': 'Your next',
  'home.heroTitle2': 'adventure',
  'home.scrollHint': 'Scroll to explore ↓',
  'home.eyebrow': 'Antigua Guatemala · Go explore, live the story',
  'home.h1': 'Your next adventure starts here.',
  'home.lead': 'Volcanoes, lakes, ATVs and waterfalls. Pick your tour, choose a date and save your spot in minutes.',
  'home.cta': 'See available tours',
  'home.toursEyebrow': 'Explore Guatemala',
  'home.toursTitle': 'Upcoming adventures',
  'home.toursText': 'Scroll to travel across the map. Every trip departs from Antigua Guatemala with a guide, transportation and good vibes included.',
  'home.loadError': "We couldn't load the tours: {error}",
  'home.noTours': 'New departures coming soon.',
  'home.promosEyebrow': 'Promotions',
  'home.promosTitle': 'Deals for your next trip',
  'promo.off': '{n}% off',
  'promo.code': 'code {code}',
  'promo.until': 'until {date}',
  'promo.allTours': 'All tours',
  'promo.bookWith': 'Book with promo',
  'promo.seeTours': 'See tours',
  'home.howTitle': 'How to book',
  'home.step1': 'Pick your tour',
  'home.step1Text': "Check what's included and which dates have spots available.",
  'home.step2': 'Save your spot',
  'home.step2Text': 'Fill in your details and get your booking code instantly.',
  'home.step3': 'Confirm your payment',
  'home.step3Text': "We'll reach out on WhatsApp or Instagram to confirm payment and details.",
  'home.officeAlt': 'Getaway Adventures office in Antigua Guatemala',
  'home.visitTitle': 'Visit us in Antigua',
  'home.visitText': 'Stop by our agency to ask questions, pay for your tour or learn about our base camp on Acatenango, with domes and a direct view of Volcán de Fuego.',
  'home.directions': 'Get directions',
  'home.writeFirst': 'Message us first',
  'home.campAlt': 'Getaway Adventures base camp facing Volcán de Fuego',

  'card.cta': 'Book now',
  'card.details': 'See details for {name}',

  'map.aria': 'Map of Guatemala. Highlighted destination: {name}',
  'map.country': 'GUATEMALA',
  'map.ocean': 'Pacific Ocean',
  'map.agency': 'Antigua (agency)',
  'map.zoomGroup': 'Map zoom',
  'map.zoomIn': 'Zoom in',
  'map.zoomOut': 'Zoom out',
  'map.fit': 'Show the whole country',
  'map.follow': 'Follow the route automatically',
  'map.legendBase': 'Departures from Antigua',
  'map.legendPin': 'Destination',
  'map.legendTip': '· Drag or use + / − to explore',
  'map.cardAria': '{name}: see details and book',
  'map.from': 'From',
  'map.cta': 'View & book',

  'tour.notFound': 'Tour not found',
  'tour.seeAll': 'See all tours',
  'tour.back': '← All tours',
  'tour.departsFrom': 'Departs from {place}',
  'tour.includes': "What's included",
  'tour.gallery': 'Gallery',
  'tour.enlarge': 'Enlarge photo',
  'tour.close': 'Close',
  'tour.perPerson': 'per person',
  'tour.step1': '1. Choose your date',
  'tour.noDates': 'No departures scheduled right now.',
  'tour.messageUs': 'Message us on WhatsApp',
  'tour.privateDates': 'for private dates.',
  'tour.soldOut': 'Sold out',
  'tour.spots': '{n} spots',
  'tour.step2': '2. How many people?',
  'tour.less': 'Fewer',
  'tour.more': 'More',
  'tour.person': 'person',
  'tour.people': 'people',
  'tour.step3': '3. Your details',
  'tour.name': 'Full name',
  'tour.email': 'Email',
  'tour.phone': 'Phone / WhatsApp',
  'tour.notes': 'Notes (optional)',
  'tour.notesPh': 'Allergies, pickup point, etc.',
  'tour.promoQ': 'Have a promo code?',
  'tour.promoPh': 'CODE',
  'tour.apply': 'Apply',
  'tour.promoInvalid': 'This code is not valid for this tour.',
  'tour.consent': 'I want to receive promotions and new departures by WhatsApp or email.',
  'tour.subtotal': 'Subtotal',
  'tour.discount': 'Discount',
  'tour.total': 'Total',
  'tour.booking': 'Booking…',
  'tour.book': 'Save my spot',
  'tour.selectDate': 'Select a date',
  'tour.fine': "You won't be charged now. We'll confirm payment with you directly.",
  'tour.errSelectDate': 'Please select a departure date.',
  'tour.errInvalid': 'Please check that your details are valid.',
  'tour.errUnavailable': 'The selected departure is no longer available.',
  'tour.errTourUnavailable': 'This tour is not available.',
  'tour.errPeople': 'Invalid number of people.',
  'tour.errOnlyLeft': 'Only {n} spots left.',
  'tour.errPromo': 'The promo code is not valid for this tour.',
  'confirm.title': 'Spot saved, {name}!',
  'confirm.keep': 'Keep your booking code:',
  'confirm.tour': 'Tour',
  'confirm.date': 'Date',
  'confirm.people': 'People',
  'confirm.pending1': 'Your booking is ',
  'confirm.pendingStrong': 'pending payment',
  'confirm.pending2': ". We'll contact you soon; to speed things up, message us with your code.",
  'confirm.wa': 'Confirm on WhatsApp',
  'confirm.more': 'See more tours',
};

type Key = keyof typeof en;

const es: Record<Key, string> = {
  'nav.tours': 'Tours',
  'nav.howToBook': 'Cómo reservar',
  'nav.langLabel': 'Idioma',
  'wa.info': '¡Hola! Quiero información sobre sus tours.',
  'wa.visit': '¡Hola! Quiero visitar la agencia en Antigua.',
  'wa.tourInfo': '¡Hola! Quiero información sobre {tour}.',
  'wa.booked': '¡Hola! Acabo de reservar {tour} para el {date} ({n} pax). Mi código es {code}.',
  'footer.tagline': 'Tours y aventuras desde Antigua Guatemala 🇬🇹',
  'footer.agency': '📍 Agencia en Antigua Guatemala',
  'footer.admin': 'Acceso agencia',

  'home.heroAlt': 'Volcán de Agua al atardecer sobre las nubes, visto desde Acatenango',
  'home.heroTitle1': 'Tu próxima',
  'home.heroTitle2': 'aventura',
  'home.scrollHint': 'Desliza para explorar ↓',
  'home.eyebrow': 'Antigua Guatemala · Go explore, live the story',
  'home.h1': 'Tu próxima aventura comienza aquí.',
  'home.lead': 'Volcanes, lagos, cuatrimotos y cascadas. Elige tu tour, escoge la fecha y aparta tu lugar en minutos.',
  'home.cta': 'Ver tours disponibles',
  'home.toursEyebrow': 'Explora Guatemala',
  'home.toursTitle': 'Próximas aventuras',
  'home.toursText': 'Desliza para recorrer el mapa. Todas las salidas parten de Antigua Guatemala con guía, transporte y buena vibra incluidos.',
  'home.loadError': 'No pudimos cargar los tours: {error}',
  'home.noTours': 'Pronto anunciaremos nuevas salidas.',
  'home.promosEyebrow': 'Promociones',
  'home.promosTitle': 'Ofertas para tu próxima salida',
  'promo.off': '{n}% de descuento',
  'promo.code': 'código {code}',
  'promo.until': 'hasta el {date}',
  'promo.allTours': 'Todos los tours',
  'promo.bookWith': 'Reservar con promo',
  'promo.seeTours': 'Ver tours',
  'home.howTitle': '¿Cómo reservar?',
  'home.step1': 'Elige tu tour',
  'home.step1Text': 'Revisa qué incluye y las fechas con cupo disponible.',
  'home.step2': 'Aparta tu lugar',
  'home.step2Text': 'Llena tus datos y recibe tu código de reservación al instante.',
  'home.step3': 'Confirma tu pago',
  'home.step3Text': 'Te contactamos por WhatsApp o Instagram para confirmar el pago y los detalles.',
  'home.officeAlt': 'Oficina de Getaway Adventures en Antigua Guatemala',
  'home.visitTitle': 'Visítanos en Antigua',
  'home.visitText': 'Pasa por nuestra agencia para resolver dudas, pagar tu tour o conocer nuestro base camp en Acatenango con domos y vista directa al Volcán de Fuego.',
  'home.directions': 'Cómo llegar',
  'home.writeFirst': 'Escríbenos antes',
  'home.campAlt': 'Base camp de Getaway Adventures frente al Volcán de Fuego',

  'card.cta': 'Reservar ahora',
  'card.details': 'Ver detalles de {name}',

  'map.aria': 'Mapa de Guatemala. Destino resaltado: {name}',
  'map.country': 'GUATEMALA',
  'map.ocean': 'Océano Pacífico',
  'map.agency': 'Antigua (agencia)',
  'map.zoomGroup': 'Zoom del mapa',
  'map.zoomIn': 'Acercar',
  'map.zoomOut': 'Alejar',
  'map.fit': 'Ver todo el país',
  'map.follow': 'Seguir el recorrido automáticamente',
  'map.legendBase': 'Salidas desde Antigua',
  'map.legendPin': 'Destino',
  'map.legendTip': '· Arrastra o usa + / − para explorar',
  'map.cardAria': '{name}: ver detalles y reservar',
  'map.from': 'Desde',
  'map.cta': 'Ver y reservar',

  'tour.notFound': 'Tour no encontrado',
  'tour.seeAll': 'Ver todos los tours',
  'tour.back': '← Todos los tours',
  'tour.departsFrom': 'Sale de {place}',
  'tour.includes': 'Incluye',
  'tour.gallery': 'Galería',
  'tour.enlarge': 'Ampliar foto',
  'tour.close': 'Cerrar',
  'tour.perPerson': 'por persona',
  'tour.step1': '1. Elige tu fecha',
  'tour.noDates': 'No hay salidas programadas por ahora.',
  'tour.messageUs': 'Escríbenos por WhatsApp',
  'tour.privateDates': 'para fechas privadas.',
  'tour.soldOut': 'Agotado',
  'tour.spots': '{n} lugares',
  'tour.step2': '2. ¿Cuántos van?',
  'tour.less': 'Menos',
  'tour.more': 'Más',
  'tour.person': 'persona',
  'tour.people': 'personas',
  'tour.step3': '3. Tus datos',
  'tour.name': 'Nombre completo',
  'tour.email': 'Correo electrónico',
  'tour.phone': 'Teléfono / WhatsApp',
  'tour.notes': 'Notas (opcional)',
  'tour.notesPh': 'Alergias, punto de recogida, etc.',
  'tour.promoQ': '¿Tienes un código de promoción?',
  'tour.promoPh': 'CÓDIGO',
  'tour.apply': 'Aplicar',
  'tour.promoInvalid': 'Código no válido para este tour.',
  'tour.consent': 'Quiero recibir promociones y nuevas salidas por WhatsApp o correo.',
  'tour.subtotal': 'Subtotal',
  'tour.discount': 'Descuento',
  'tour.total': 'Total',
  'tour.booking': 'Reservando…',
  'tour.book': 'Apartar mi lugar',
  'tour.selectDate': 'Selecciona una fecha',
  'tour.fine': 'No se cobra nada ahora. Confirmamos el pago contigo directamente.',
  'tour.errSelectDate': 'Selecciona una fecha de salida.',
  'tour.errInvalid': 'Revisa que tus datos sean válidos.',
  'tour.errUnavailable': 'La salida seleccionada no está disponible.',
  'tour.errTourUnavailable': 'El tour no está disponible.',
  'tour.errPeople': 'Número de personas inválido.',
  'tour.errOnlyLeft': 'Solo quedan {n} lugares disponibles.',
  'tour.errPromo': 'El código de promoción no es válido para este tour.',
  'confirm.title': '¡Lugar apartado, {name}!',
  'confirm.keep': 'Guarda tu código de reservación:',
  'confirm.tour': 'Tour',
  'confirm.date': 'Fecha',
  'confirm.people': 'Personas',
  'confirm.pending1': 'Tu reservación está ',
  'confirm.pendingStrong': 'pendiente de pago',
  'confirm.pending2': '. Te contactaremos pronto; si quieres agilizarlo, escríbenos con tu código.',
  'confirm.wa': 'Confirmar por WhatsApp',
  'confirm.more': 'Ver más tours',
};

const DICT: Record<Lang, Record<Key, string>> = { en, es };
export const LOCALE: Record<Lang, string> = { en: 'en-US', es: 'es-GT' };

function leerIdioma(): Lang {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'en' || v === 'es') return v;
  } catch { /* sin acceso a localStorage */ }
  return 'en';
}

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: Key, vars?: Record<string, string | number>) => string;
  locale: string;
};

const LangContext = createContext<Ctx | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(leerIdioma);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch { /* ignorar */ }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo<Ctx>(() => ({
    lang,
    setLang,
    locale: LOCALE[lang],
    t: (key, vars) => {
      let s = DICT[lang][key] ?? en[key] ?? key;
      if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
      return s;
    },
  }), [lang, setLang]);

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang debe usarse dentro de <LangProvider>');
  return ctx;
}

/**
 * Devuelve el campo traducido de un registro de la BD (p. ej. `nombre_en`)
 * y, si está vacío, el original en español.
 */
export function campo<T extends object, K extends keyof T & string>(row: T, key: K, lang: Lang): T[K] {
  if (lang === 'es') return row[key];
  const v = (row as Record<string, unknown>)[`${key}_en`];
  const vacio = v == null || v === '' || (Array.isArray(v) && v.length === 0);
  return (vacio ? row[key] : v) as T[K];
}

/** Traduce los mensajes de error conocidos que devuelve la base de datos */
export function traducirError(msg: string, t: Ctx['t']): string {
  if (msg.includes('check constraint')) return t('tour.errInvalid');
  if (msg.includes('salida seleccionada')) return t('tour.errUnavailable');
  if (msg.includes('tour no está disponible')) return t('tour.errTourUnavailable');
  if (msg.includes('personas inválido')) return t('tour.errPeople');
  if (msg.includes('código de promoción')) return t('tour.errPromo');
  const m = msg.match(/Solo quedan (\d+) lugares/);
  if (m) return t('tour.errOnlyLeft', { n: m[1] });
  return msg;
}
