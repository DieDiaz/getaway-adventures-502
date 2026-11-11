import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { asset, supabase, formatQ, formatFecha, INSTAGRAM_DM, whatsappLink } from '../lib/supabase';
import TourCover from '../components/TourCover';
import type { SalidaDisponible, Tour } from '../types';
import { campo, traducirError, useLang } from '../lib/i18n';

interface Confirmacion {
  codigo: string;
  descuento_q: number;
  total_q: number;
  fecha: string;
  personas: number;
  nombre: string;
}

export default function TourPage() {
  const { slug } = useParams();
  const [tour, setTour] = useState<Tour | null>(null);
  const [salidas, setSalidas] = useState<SalidaDisponible[]>([]);
  const [cargando, setCargando] = useState(true);
  const [noExiste, setNoExiste] = useState(false);

  const [salidaId, setSalidaId] = useState<string>('');
  const [personas, setPersonas] = useState(1);
  const [form, setForm] = useState({ nombre: '', email: '', telefono: '', notas: '' });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmacion, setConfirmacion] = useState<Confirmacion | null>(null);
  const [foto, setFoto] = useState<string | null>(null);
  const [params] = useSearchParams();
  const [codigoPromo, setCodigoPromo] = useState(params.get('promo') ?? '');
  const [promo, setPromo] = useState<{ titulo: string; descuento_pct: number } | null>(null);
  const [promoMsg, setPromoMsg] = useState<string | null>(null);
  const [aceptaPromos, setAceptaPromos] = useState(false);
  const { t, lang, locale } = useLang();
  const fecha = (iso: string, opts?: Intl.DateTimeFormatOptions) => formatFecha(iso, opts, locale);

  async function aplicarPromo(codigo = codigoPromo) {
    if (!tour || !codigo.trim()) return;
    const { data } = await supabase.rpc('ga_validar_promo', { p_codigo: codigo, p_tour_id: tour.id });
    const p = (data as { titulo: string; descuento_pct: number }[] | null)?.[0];
    setPromo(p ?? null);
    setPromoMsg(p ? null : t('tour.promoInvalid'));
  }

  useEffect(() => {
    if (tour && params.get('promo')) aplicarPromo(params.get('promo')!);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tour]);

  useEffect(() => {
    if (!foto) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setFoto(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [foto]);

  const cargarSalidas = async (tourId: string) => {
    const { data } = await supabase.rpc('ga_salidas_disponibles', { p_tour_id: tourId });
    setSalidas((data ?? []) as SalidaDisponible[]);
  };

  useEffect(() => {
    (async () => {
      setCargando(true);
      const { data } = await supabase.from('ga_tours').select('*').eq('slug', slug!).maybeSingle();
      if (!data) {
        setNoExiste(true);
      } else {
        setTour(data as Tour);
        await cargarSalidas(data.id);
      }
      setCargando(false);
    })();
  }, [slug]);

  const salida = useMemo(() => salidas.find((s) => s.id === salidaId), [salidas, salidaId]);
  const maxPersonas = Math.min(salida?.disponibles ?? 30, 30);
  const precio = salida?.precio_q ?? tour?.precio_q ?? 0;
  const subtotal = precio * personas;
  const descuento = promo ? Math.round(subtotal * Number(promo.descuento_pct)) / 100 : 0;
  const total = subtotal - descuento;

  useEffect(() => {
    if (personas > maxPersonas) setPersonas(Math.max(1, maxPersonas));
  }, [maxPersonas, personas]);

  const actualizar = (campo: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [campo]: e.target.value }));

  async function reservar(e: FormEvent) {
    e.preventDefault();
    if (!salida) return setError(t('tour.errSelectDate'));
    setError(null);
    setEnviando(true);
    const { data, error } = await supabase.rpc('ga_crear_reservacion', {
      p_salida_id: salida.id,
      p_nombre: form.nombre,
      p_email: form.email,
      p_telefono: form.telefono,
      p_personas: personas,
      p_notas: form.notas || null,
      p_codigo_promo: promo ? codigoPromo : null,
      p_acepta_promos: aceptaPromos,
    });
    setEnviando(false);
    if (error) {
      setError(traducirError(error.message, t));
      if (tour) cargarSalidas(tour.id);
      return;
    }
    const row = (data as { codigo: string; descuento_q: number; total_q: number }[])[0];
    setConfirmacion({ ...row, fecha: salida.fecha, personas, nombre: form.nombre });
  }

  if (cargando) return <div className="container section"><div className="card skeleton tall" /></div>;
  if (noExiste || !tour)
    return (
      <div className="container section center">
        <h2>{t('tour.notFound')}</h2>
        <Link to="/" className="btn">{t('tour.seeAll')}</Link>
      </div>
    );

  const nombre = campo(tour, 'nombre', lang);
  const incluye = campo(tour, 'incluye', lang);
  const horario = campo(tour, 'horario', lang);

  if (confirmacion) {
    const texto = t('wa.booked', {
      tour: nombre,
      date: fecha(confirmacion.fecha, { day: 'numeric', month: 'long' }),
      n: confirmacion.personas,
      code: confirmacion.codigo,
    });
    return (
      <div className="container section">
        <div className="confirm card">
          <div className="confirm-icon">✓</div>
          <h2>{t('confirm.title', { name: confirmacion.nombre.split(' ')[0] })}</h2>
          <p className="muted">{t('confirm.keep')}</p>
          <p className="codigo">{confirmacion.codigo}</p>
          <dl className="resumen">
            <div><dt>{t('confirm.tour')}</dt><dd>{nombre}</dd></div>
            <div><dt>{t('confirm.date')}</dt><dd>{fecha(confirmacion.fecha, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</dd></div>
            <div><dt>{t('confirm.people')}</dt><dd>{confirmacion.personas}</dd></div>
            {Number(confirmacion.descuento_q) > 0 && <div><dt>{t('tour.discount')}</dt><dd>−{formatQ(Number(confirmacion.descuento_q))}</dd></div>}
            <div><dt>{t('tour.total')}</dt><dd><strong>{formatQ(Number(confirmacion.total_q))}</strong></dd></div>
          </dl>
          <p className="muted">
            {t('confirm.pending1')}<b>{t('confirm.pendingStrong')}</b>{t('confirm.pending2')}
          </p>
          <div className="row-actions">
            <a className="btn btn-wa" href={whatsappLink(texto)} target="_blank" rel="noreferrer">{t('confirm.wa')}</a>
            <a className="btn btn-ghost" href={INSTAGRAM_DM} target="_blank" rel="noreferrer">Instagram</a>
            <Link className="btn btn-ghost" to="/">{t('confirm.more')}</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container section tour-layout">
      <article>
        <Link to="/" className="back">{t('tour.back')}</Link>
        <TourCover tour={tour} className="cover-lg" />
        <h1 className="tour-title">{nombre}</h1>
        <div className="chips">
          <span className="chip">📍 {campo(tour, 'destino', lang)}</span>
          <span className="chip">⏱ {campo(tour, 'duracion', lang)}</span>
          <span className="chip">🚐 {t('tour.departsFrom', { place: campo(tour, 'punto_salida', lang) })}</span>
        </div>
        {horario && <p className="horario">🕖 {horario}</p>}
        <p className="lead-dark">{campo(tour, 'descripcion', lang)}</p>
        {incluye.length > 0 && (
          <>
            <h3>{t('tour.includes')}</h3>
            <ul className="incluye">{incluye.map((i) => <li key={i}>{i}</li>)}</ul>
          </>
        )}
        {tour.galeria.length > 0 && (
          <>
            <h3>{t('tour.gallery')}</h3>
            <div className="galeria">
              {tour.galeria.map((src) => (
                <button type="button" key={src} onClick={() => setFoto(src)} aria-label={t('tour.enlarge')}>
                  <img
                    src={asset(src)}
                    alt={nombre}
                    loading="lazy"
                    onError={(e) => { (e.currentTarget.parentElement as HTMLElement).style.display = 'none'; }}
                  />
                </button>
              ))}
            </div>
          </>
        )}
        {foto && (
          <div className="lightbox" role="dialog" aria-modal="true" onClick={() => setFoto(null)}>
            <img src={asset(foto)} alt={nombre} />
            <button type="button" className="lightbox-close" aria-label={t('tour.close')}>✕</button>
          </div>
        )}
      </article>

      <aside>
        <form className="card booking" onSubmit={reservar}>
          <div className="booking-price">
            <span><strong>{formatQ(precio)}</strong> <small>{t('tour.perPerson')}</small></span>
          </div>

          <fieldset>
            <legend>{t('tour.step1')}</legend>
            {salidas.length === 0 ? (
              <p className="muted">
                {t('tour.noDates')}{' '}
                <a href={whatsappLink(t('wa.tourInfo', { tour: nombre }))} target="_blank" rel="noreferrer">{t('tour.messageUs')}</a> {t('tour.privateDates')}
              </p>
            ) : (
              <div className="fechas">
                {salidas.map((s) => {
                  const agotado = s.disponibles <= 0;
                  return (
                    <button
                      type="button"
                      key={s.id}
                      disabled={agotado}
                      className={`fecha ${salidaId === s.id ? 'active' : ''}`}
                      onClick={() => setSalidaId(s.id)}
                    >
                      <span className="fecha-dia">{fecha(s.fecha)}</span>
                      <span className={`fecha-cupo ${s.disponibles <= 5 ? 'low' : ''}`}>
                        {agotado ? t('tour.soldOut') : t('tour.spots', { n: s.disponibles })}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </fieldset>

          <fieldset disabled={!salida}>
            <legend>{t('tour.step2')}</legend>
            <div className="stepper">
              <button type="button" onClick={() => setPersonas((p) => Math.max(1, p - 1))} aria-label={t('tour.less')}>−</button>
              <span>{personas} {personas === 1 ? t('tour.person') : t('tour.people')}</span>
              <button type="button" onClick={() => setPersonas((p) => Math.min(maxPersonas, p + 1))} aria-label={t('tour.more')}>+</button>
            </div>
          </fieldset>

          <fieldset disabled={!salida}>
            <legend>{t('tour.step3')}</legend>
            <label>{t('tour.name')}<input required minLength={2} maxLength={120} value={form.nombre} onChange={actualizar('nombre')} autoComplete="name" /></label>
            <label>{t('tour.email')}<input required type="email" value={form.email} onChange={actualizar('email')} autoComplete="email" /></label>
            <label>{t('tour.phone')}<input required type="tel" minLength={8} maxLength={20} placeholder="+502 5555 5555" value={form.telefono} onChange={actualizar('telefono')} autoComplete="tel" /></label>
            <label>{t('tour.notes')}<textarea rows={2} maxLength={1000} placeholder={t('tour.notesPh')} value={form.notas} onChange={actualizar('notas')} /></label>
          </fieldset>

          <fieldset disabled={!salida} className="promo-field">
            <legend>{t('tour.promoQ')}</legend>
            <div className="promo-input">
              <input value={codigoPromo} placeholder={t('tour.promoPh')} maxLength={30}
                onChange={(e) => { setCodigoPromo(e.target.value.toUpperCase()); setPromo(null); setPromoMsg(null); }} />
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => aplicarPromo()}>{t('tour.apply')}</button>
            </div>
            {promo && <p className="promo-ok">✓ {promo.titulo}: −{Number(promo.descuento_pct)}%</p>}
            {promoMsg && <p className="promo-bad">{promoMsg}</p>}
          </fieldset>

          <label className="consent">
            <input type="checkbox" checked={aceptaPromos} onChange={(e) => setAceptaPromos(e.target.checked)} />
            {t('tour.consent')}
          </label>

          {error && <p className="alert alert-error">{error}</p>}

          {descuento > 0 && (
            <div className="booking-sub">
              <span>{t('tour.subtotal')} {formatQ(subtotal)}</span>
              <span>{t('tour.discount')} −{formatQ(descuento)}</span>
            </div>
          )}
          <div className="booking-total">
            <span>{t('tour.total')}</span>
            <strong>{formatQ(total)}</strong>
          </div>
          <button className="btn btn-lg btn-block" disabled={!salida || enviando}>
            {enviando ? t('tour.booking') : salida ? t('tour.book') : t('tour.selectDate')}
          </button>
          <p className="fine">{t('tour.fine')}</p>
        </form>
      </aside>
    </div>
  );
}
