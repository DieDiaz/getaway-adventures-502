import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !key) {
  throw new Error('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en .env');
}

export const supabase = createClient(url, key);

export const INSTAGRAM_URL = 'https://www.instagram.com/getaway.adventures502';
export const INSTAGRAM_DM = 'https://ig.me/m/getaway.adventures502';

const money = new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' });
export const formatQ = (n: number) => money.format(n);

export const formatFecha = (iso: string, opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' }) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('es-GT', opts);

export const WHATSAPP = '50256333618';
export const whatsappLink = (texto: string) => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(texto)}`;
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
/** Antepone la ruta base (GitHub Pages) a imágenes locales de /public. Las URLs completas no se tocan. */
export const asset = <T extends string | null | undefined>(u: T): T =>
  (typeof u === 'string' && u.startsWith('/') && !u.startsWith('//') && !u.startsWith(BASE + '/') ? BASE + u : u) as T;
export const SITE_URL = () => window.location.origin + import.meta.env.BASE_URL;
export const IMG = asset('/getaway-adventures-imagenes');
export const LOGO = `${IMG}/logo/logo_perfil_150px.jpg`;
export const MAPS_URL = 'https://maps.app.goo.gl/2MSoVsMo4hJcDoVe6';
