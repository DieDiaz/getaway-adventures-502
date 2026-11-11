import type { Tour } from '../types';
import { asset } from '../lib/supabase';
import { campo, useLang } from '../lib/i18n';

/** Color de tema (HSL) y degradado de respaldo por tour */
export const TEMAS: Record<string, { color: string; gradiente: string }> = {
  acatenango: { color: '18 38% 22%', gradiente: 'linear-gradient(160deg,#6e3b22 0%,#a3582f 45%,#2f2721 100%)' },
  'acatenango-4x4': { color: '85 18% 20%', gradiente: 'linear-gradient(160deg,#3f5233,#6b5f52)' },
  atitlan: { color: '195 22% 24%', gradiente: 'linear-gradient(160deg,#3d5a63 0%,#7f9fa3 55%,#4c6a3d 100%)' },
  'pacaya-atv': { color: '22 40% 24%', gradiente: 'linear-gradient(160deg,#7a4127,#c0703f)' },
  'pueblos-atv': { color: '36 38% 26%', gradiente: 'linear-gradient(160deg,#8a6430,#d4a24c)' },
  'rapel-cascada': { color: '160 16% 20%', gradiente: 'linear-gradient(160deg,#3b5149,#3f5233)' },
  'semuc-champey': { color: '170 24% 22%', gradiente: 'linear-gradient(160deg,#3f6b60 0%,#86a89a 50%,#3f5233 100%)' },
};
const DEFAULT = { color: '30 25% 22%', gradiente: 'linear-gradient(160deg,#3f5233,#c0703f)' };
export const temaDe = (slug: string) => TEMAS[slug] ?? DEFAULT;

export default function TourCover({ tour, className = '' }: { tour: Tour; className?: string }) {
  const { lang } = useLang();
  const gradiente = temaDe(tour.slug).gradiente;
  const style = { backgroundImage: tour.imagen_url ? `url(${asset(tour.imagen_url)}), ${gradiente}` : gradiente };

  return (
    <div className={`cover ${className}`} style={style} role="img" aria-label={campo(tour, 'nombre', lang)}>
      {!tour.imagen_url && <span className="cover-mountains" aria-hidden />}
    </div>
  );
}
