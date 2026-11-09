import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock, MapPin } from 'lucide-react';
import { asset, formatQ } from '../../lib/supabase';
import type { Tour } from '../../types';
import { GUATEMALA, MAPA_H, MAPA_W, VECINOS, proyectar } from './guatemala';
import './mapa.css';

/** Antigua Guatemala: punto de salida de todos los tours */
const BASE = { nombre: 'Antigua Guatemala', lat: 14.5586, lng: -90.7339 };

interface Props {
  tours: Tour[];
}

export default function MapaTours({ tours }: Props) {
  const [activo, setActivo] = useState(0);
  const [hoverPin, setHoverPin] = useState<number | null>(null);
  const refs = useRef<(HTMLElement | null)[]>([]);

  // La tarjeta que cruza la línea central de la pantalla es la activa
  useEffect(() => {
    const movil = window.matchMedia('(max-width: 900px)').matches;
    const obs = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (e.isIntersecting) setActivo(Number((e.target as HTMLElement).dataset.i));
        }
      },
      { rootMargin: movil ? '-62% 0px -37% 0px' : '-49% 0px -50% 0px' },
    );
    refs.current.forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, [tours]);

  const irA = (i: number) => refs.current[i]?.scrollIntoView({ behavior: 'smooth', block: 'center' });

  const [bx, by] = proyectar(BASE.lat, BASE.lng);
  const puntos = tours.map((t) => (t.lat != null && t.lng != null ? proyectar(Number(t.lat), Number(t.lng)) : null));
  const actual = tours[activo];
  const pa = puntos[activo];
  const pin = hoverPin ?? activo;
  const pinPos = puntos[pin];

  // Ruta curva desde Antigua hasta el destino activo
  const ruta = pa && Math.hypot(pa[0] - bx, pa[1] - by) > 8
    ? `M${bx},${by} Q${(bx + pa[0]) / 2 + (pa[1] - by) * 0.25},${(by + pa[1]) / 2 - Math.abs(pa[0] - bx) * 0.35 - 20} ${pa[0]},${pa[1]}`
    : null;

  return (
    <div className="explorer">
      <div className="explorer-map">
        <div className="mapa-lienzo">
        <svg viewBox={`0 0 ${MAPA_W} ${MAPA_H}`} role="img" aria-label={`Mapa de Guatemala. Destino resaltado: ${actual?.nombre ?? ''}`}>
          <defs>
            <linearGradient id="tierra" x1="0" y1="0" x2="0.4" y2="1">
              <stop offset="0" stopColor="#e9dcc3" />
              <stop offset=".55" stopColor="#dccaa8" />
              <stop offset="1" stopColor="#cdb38c" />
            </linearGradient>
            <pattern id="curvas" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(-20)">
              <path d="M0 7 Q3.5 3 7 7 T14 7" fill="none" stroke="#b89d74" strokeOpacity=".22" strokeWidth=".8" />
            </pattern>
            <radialGradient id="brillo">
              <stop offset="0" stopColor="#f2b27a" stopOpacity=".85" />
              <stop offset="1" stopColor="#f2b27a" stopOpacity="0" />
            </radialGradient>
            <filter id="sombra" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#5a3c23" floodOpacity=".25" />
            </filter>
            <radialGradient id="fade-g" cx="50%" cy="50%" r="55%">
              <stop offset=".6" stopColor="#fff" />
              <stop offset="1" stopColor="#000" />
            </radialGradient>
            <mask id="fade"><rect x="-10" y="-10" width={MAPA_W + 20} height={MAPA_H + 20} fill="url(#fade-g)" /></mask>
          </defs>

          <g mask="url(#fade)">
            {VECINOS.map((v) => <path key={v.id} d={v.d} className="mapa-vecino" />)}
          </g>
          <g filter="url(#sombra)">
            <path d={GUATEMALA} fill="url(#tierra)" stroke="#9b7f5a" strokeWidth="1.4" strokeLinejoin="round" />
          </g>
          <path d={GUATEMALA} fill="url(#curvas)" pointerEvents="none" />
          <text x={MAPA_W / 2 + 40} y={130} className="mapa-pais">GUATEMALA</text>
          <text x={60} y={MAPA_H - 30} className="mapa-mar">Océano Pacífico</text>

          {ruta && <path key={activo} d={ruta} className="mapa-ruta" />}

          {/* Agencia */}
          <g className="mapa-base" transform={`translate(${bx},${by})`}>
            <rect x="-5" y="-5" width="10" height="10" transform="rotate(45)" />
          </g>

          {/* Destinos */}
          {puntos.map((p, i) =>
            p ? (
              <g
                key={tours[i].id}
                className={`mapa-pin ${i === activo ? 'is-active' : ''} ${i === hoverPin ? 'is-hover' : ''}`}
                transform={`translate(${p[0]},${p[1]})`}
                onMouseEnter={() => setHoverPin(i)}
                onMouseLeave={() => setHoverPin(null)}
                onClick={() => irA(i)}
                role="button"
                tabIndex={0}
                aria-label={tours[i].nombre}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && irA(i)}
              >
                <circle r="26" className="pin-hit" />
                {i === activo && <circle r="34" fill="url(#brillo)" className="pin-glow" />}
                {i === activo && <circle r="9" className="pin-pulse" />}
                <circle r={i === activo ? 7.5 : 5} className="pin-dot" />
              </g>
            ) : null,
          )}
        </svg>

        {/* Etiqueta del pin activo o con hover */}
        {pinPos && tours[pin] && (
          <div
            className={`mapa-tip ${hoverPin !== null ? 'is-hover' : ''}`}
            style={{ left: `${(pinPos[0] / MAPA_W) * 100}%`, top: `${(pinPos[1] / MAPA_H) * 100}%` }}
          >
            <strong>{tours[pin].nombre}</strong>
            <span>{tours[pin].destino}</span>
            {hoverPin !== null && <span className="mapa-tip-meta">{tours[pin].duracion} · {formatQ(Number(tours[pin].precio_q))}</span>}
          </div>
        )}
        </div>

        <p className="mapa-leyenda"><span className="ley-base" /> Salidas desde Antigua <span className="ley-pin" /> Destino</p>
      </div>

      <div className="explorer-list">
        {tours.map((t, i) => (
          <article
            key={t.id}
            ref={(el) => { refs.current[i] = el; }}
            data-i={i}
            className={`mcard ${i === activo ? 'is-active' : ''}`}
            style={{ animationDelay: `${(i % 3) * -2}s` }}
            onMouseEnter={() => setHoverPin(i)}
            onMouseLeave={() => setHoverPin(null)}
          >
            <Link to={`/tour/${t.slug}`} className="mcard-link" aria-label={`${t.nombre}: ver detalles y reservar`}>
              <div className="mcard-photo" style={{ backgroundImage: t.imagen_url ? `url(${asset(t.imagen_url)})` : undefined }}>
                <span className="mcard-num">{String(i + 1).padStart(2, '0')}</span>
              </div>
              <div className="mcard-body">
                <span className="mcard-dest"><MapPin size={13} /> {t.destino}</span>
                <h3>{t.nombre}</h3>
                <div className="mcard-meta">
                  <span><Clock size={13} /> {t.duracion}</span>
                  <span className="mcard-price">Desde <strong>{formatQ(Number(t.precio_q))}</strong></span>
                </div>
                <div className="mcard-more">
                  <div>
                    <p>{t.descripcion}</p>
                    {t.horario && <p className="mcard-horario">{t.horario}</p>}
                    {t.incluye.length > 0 && (
                      <ul>{t.incluye.slice(0, 4).map((x) => <li key={x}>{x}</li>)}</ul>
                    )}
                    <span className="mcard-cta">Ver y reservar <ArrowRight size={15} /></span>
                  </div>
                </div>
              </div>
              <span className="mcard-sheen" aria-hidden />
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
