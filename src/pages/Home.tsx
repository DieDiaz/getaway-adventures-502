import { useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';
import { supabase, formatFecha, IMG, MAPS_URL, whatsappLink } from '../lib/supabase';
import { DestinationCard } from '../components/DestinationCard';
import ScrollExpand from '../components/ScrollExpand';
import MapaTours from '../components/mapa/MapaTours';
import type { Promocion, Tour } from '../types';

export default function Home() {
  const [tours, setTours] = useState<Tour[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [promos, setPromos] = useState<Promocion[]>([]);

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
          alt="Volcán de Agua al atardecer sobre las nubes, visto desde Acatenango"
          title={<>Tu próxima<br />aventura</>}
          scrollHint="Desliza para explorar ↓"
          startWidth={56}
          startHeight={62}
          startRadius={28}
          mediaZoom={1.05}
          scrollDistance={1}
          holdDistance={0.25}
          useWindowScroll
        >
          <p className="eyebrow">Antigua Guatemala · Go explore, live the story</p>
          <h1>Tu próxima aventura comienza aquí.</h1>
          <p className="lead">
            Volcanes, lagos, cuatrimotos y cascadas. Elige tu tour, escoge la fecha y aparta tu lugar en minutos.
          </p>
          <a href="#tours" className="btn btn-lg">Ver tours disponibles</a>
        </ScrollExpand>
      </section>

      <section id="tours" className="section container">
        <div className="section-head">
          <p className="eyebrow eyebrow-dark">Explora Guatemala</p>
          <h2>Próximas aventuras</h2>
          <p>Desliza para recorrer el mapa. Todas las salidas parten de Antigua Guatemala con guía, transporte y buena vibra incluidos.</p>
        </div>

        {error && <p className="alert alert-error">No pudimos cargar los tours: {error}</p>}
        {!tours && !error && <div className="card skeleton tall" />}
        {tours && tours.length === 0 && <p className="muted">Pronto anunciaremos nuevas salidas.</p>}
        {tours && tours.length > 0 && <MapaTours tours={tours} />}
      </section>

      {promos.length > 0 && (
        <section id="promociones" className="section">
          <div className="container">
            <div className="section-head">
              <p className="eyebrow eyebrow-dark">Promociones</p>
              <h2>Ofertas para tu próxima salida</h2>
            </div>
            <div className="grid">
              {promos.map((p) => {
                const tour = tours?.find((t) => t.id === p.tour_id);
                const href = tour ? `/tour/${tour.slug}${p.codigo ? `?promo=${p.codigo}` : ''}` : '/#tours';
                const detalle = [
                  p.descuento_pct > 0 ? `${Number(p.descuento_pct)}% de descuento` : null,
                  p.codigo ? `código ${p.codigo}` : null,
                  p.hasta ? `hasta el ${formatFecha(p.hasta, { day: 'numeric', month: 'short' })}` : null,
                ].filter(Boolean).join(' · ');
                return (
                  <DestinationCard
                    key={p.id}
                    href={href}
                    imageUrl={p.imagen_url ?? tour?.imagen_url}
                    fallback="linear-gradient(160deg,#7a4127,#c0703f)"
                    themeColor="22 38% 20%"
                    location={p.titulo}
                    badge={tour ? tour.nombre : 'Todos los tours'}
                    stats={p.descripcion ? `${p.descripcion}${detalle ? ` — ${detalle}` : ''}` : detalle}
                    cta={tour ? 'Reservar con promo' : 'Ver tours'}
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
            <h2>¿Cómo reservar?</h2>
          </div>
          <ol className="steps">
            <li><b>1</b><h3>Elige tu tour</h3><p>Revisa qué incluye y las fechas con cupo disponible.</p></li>
            <li><b>2</b><h3>Aparta tu lugar</h3><p>Llena tus datos y recibe tu código de reservación al instante.</p></li>
            <li><b>3</b><h3>Confirma tu pago</h3><p>Te contactamos por WhatsApp o Instagram para confirmar el pago y los detalles.</p></li>
          </ol>
          <div className="basecamp">
            <img src={`${IMG}/campamento_y_oficina/campamento_y_oficina_22_DbCBb5kFjVe.jpg`} alt="Oficina de Getaway Adventures en Antigua Guatemala" loading="lazy" />
            <div>
              <h3>Visítanos en Antigua</h3>
              <p className="muted">Pasa por nuestra agencia para resolver dudas, pagar tu tour o conocer nuestro base camp en Acatenango con domos y vista directa al Volcán de Fuego.</p>
              <div className="row-actions start basecamp-actions">
                <a className="btn" href={MAPS_URL} target="_blank" rel="noreferrer"><MapPin size={17} /> Cómo llegar</a>
                <a className="btn btn-ghost" href={whatsappLink('¡Hola! Quiero visitar la agencia en Antigua.')} target="_blank" rel="noreferrer">Escríbenos antes</a>
              </div>
              <img src={`${IMG}/volcan/volcan_34_DX-t9hfl4nh.jpg`} alt="Base camp de Getaway Adventures frente al Volcán de Fuego" loading="lazy" className="basecamp-mini" />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
