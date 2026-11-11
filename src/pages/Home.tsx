import { useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';
import { supabase, formatFecha, IMG, MAPS_URL, whatsappLink } from '../lib/supabase';
import { DestinationCard } from '../components/DestinationCard';
import ScrollExpand from '../components/ScrollExpand';
import MapaTours from '../components/mapa/MapaTours';
import type { Promocion, Tour } from '../types';
import { campo, useLang } from '../lib/i18n';

export default function Home() {
  const [tours, setTours] = useState<Tour[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [promos, setPromos] = useState<Promocion[]>([]);
  const { t, lang, locale } = useLang();

  useEffect(() => {
    supabase.from('ga_promociones').select('*').order('created_at', { ascending: false })
      .then(({ data }) => setPromos((data ?? []) as Promocion[]));
  }, []);

  useEffect(() => {
    supabase
      .from('ga_tours')
      .select('*')
      .eq('activo', true)
      .order('orden')
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setTours(data as Tour[]);
      });
  }, []);

  return (
    <>
      <section className="hero-expand">
        <ScrollExpand
          src={`${IMG}/hero/hero-volcan-agua.jpg`}
          alt={t('home.heroAlt')}
          title={<>{t('home.heroTitle1')}<br />{t('home.heroTitle2')}</>}
          scrollHint={t('home.scrollHint')}
          startWidth={56}
          startHeight={62}
          startRadius={28}
          mediaZoom={1.05}
          scrollDistance={1}
          holdDistance={0.25}
          useWindowScroll
        >
          <p className="eyebrow">{t('home.eyebrow')}</p>
          <h1>{t('home.h1')}</h1>
          <p className="lead">{t('home.lead')}</p>
          <a href="#tours" className="btn btn-lg">{t('home.cta')}</a>
        </ScrollExpand>
      </section>

      <section id="tours" className="section container">
        <div className="section-head">
          <p className="eyebrow eyebrow-dark">{t('home.toursEyebrow')}</p>
          <h2>{t('home.toursTitle')}</h2>
          <p>{t('home.toursText')}</p>
        </div>

        {error && <p className="alert alert-error">{t('home.loadError', { error })}</p>}
        {!tours && !error && <div className="card skeleton tall" />}
        {tours && tours.length === 0 && <p className="muted">{t('home.noTours')}</p>}
        {tours && tours.length > 0 && <MapaTours tours={tours} />}
      </section>

      {promos.length > 0 && (
        <section id="promociones" className="section">
          <div className="container">
            <div className="section-head">
              <p className="eyebrow eyebrow-dark">{t('home.promosEyebrow')}</p>
              <h2>{t('home.promosTitle')}</h2>
            </div>
            <div className="grid">
              {promos.map((p) => {
                const tour = tours?.find((t) => t.id === p.tour_id);
                const href = tour ? `/tour/${tour.slug}${p.codigo ? `?promo=${p.codigo}` : ''}` : '/#tours';
                const detalle = [
                  p.descuento_pct > 0 ? t('promo.off', { n: Number(p.descuento_pct) }) : null,
                  p.codigo ? t('promo.code', { code: p.codigo }) : null,
                  p.hasta ? t('promo.until', { date: formatFecha(p.hasta, { day: 'numeric', month: 'short' }, locale) }) : null,
                ].filter(Boolean).join(' · ');
                const descripcion = campo(p, 'descripcion', lang);
                return (
                  <DestinationCard
                    key={p.id}
                    href={href}
                    imageUrl={p.imagen_url ?? tour?.imagen_url}
                    fallback="linear-gradient(160deg,#7a4127,#c0703f)"
                    themeColor="22 38% 20%"
                    location={campo(p, 'titulo', lang)}
                    badge={tour ? campo(tour, 'nombre', lang) : t('promo.allTours')}
                    stats={descripcion ? `${descripcion}${detalle ? ` — ${detalle}` : ''}` : detalle}
                    cta={tour ? t('promo.bookWith') : t('promo.seeTours')}
                  />
                );
              })}
            </div>
          </div>
        </section>
      )}

      <section id="como-funciona" className="section section-alt">
        <div className="container">
          <div className="section-head">
            <h2>{t('home.howTitle')}</h2>
          </div>
          <ol className="steps">
            <li><b>1</b><h3>{t('home.step1')}</h3><p>{t('home.step1Text')}</p></li>
            <li><b>2</b><h3>{t('home.step2')}</h3><p>{t('home.step2Text')}</p></li>
            <li><b>3</b><h3>{t('home.step3')}</h3><p>{t('home.step3Text')}</p></li>
          </ol>
          <div className="basecamp">
            <img src={`${IMG}/campamento_y_oficina/campamento_y_oficina_22_DbCBb5kFjVe.jpg`} alt={t('home.officeAlt')} loading="lazy" />
            <div>
              <h3>{t('home.visitTitle')}</h3>
              <p className="muted">{t('home.visitText')}</p>
              <div className="row-actions start basecamp-actions">
                <a className="btn" href={MAPS_URL} target="_blank" rel="noreferrer"><MapPin size={17} /> {t('home.directions')}</a>
                <a className="btn btn-ghost" href={whatsappLink(t('wa.visit'))} target="_blank" rel="noreferrer">{t('home.writeFirst')}</a>
              </div>
              <img src={`${IMG}/volcan/volcan_34_DX-t9hfl4nh.jpg`} alt={t('home.campAlt')} loading="lazy" className="basecamp-mini" />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
