import { useEffect, useRef, useState } from 'react';
import type React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock, LocateFixed, MapPin, Maximize2, Minus, Plus } from 'lucide-react';
import { asset, formatQ } from '../../lib/supabase';
import type { Tour } from '../../types';
import { GUATEMALA, MAPA_H, MAPA_W, VECINOS, proyectar } from './guatemala';
import './mapa.css';

/** Antigua Guatemala: punto de salida de todos los tours */
const BASE = { nombre: 'Antigua Guatemala', lat: 14.5586, lng: -90.7339 };

interface Props {
  tours: Tour[];
}

type Cam = { cx: number; cy: number; z: number };
const Z_MIN = 1;
const Z_MAX = 7;
const SEP_PANTALLA = 34; // separación mínima deseada entre puntos (unidades del mapa a zoom 1)
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/** Limita la cámara para no salir del mapa */
function limitar(c: Cam): Cam {
  const z = clamp(c.z, Z_MIN, Z_MAX);
  const w = MAPA_W / z, h = MAPA_H / z;
  return { z, cx: clamp(c.cx, w / 2, MAPA_W - w / 2), cy: clamp(c.cy, h / 2, MAPA_H - h / 2) };
}

/** Separa en círculo los puntos que caen casi en el mismo lugar */
function separar(puntos: ([number, number] | null)[], radio: number) {
  const pos = puntos.map((p) => (p ? ([p[0], p[1]] as [number, number]) : null));
  const usados = new Set<number>();
  puntos.forEach((p, i) => {
    if (!p || usados.has(i)) return;
    const grupo = puntos.map((q, j) => (q && Math.hypot(q[0] - p[0], q[1] - p[1]) < 3 ? j : -1)).filter((j) => j >= 0);
    if (grupo.length < 2) return;
    grupo.forEach((j, k) => {
      usados.add(j);
      const a = (k / grupo.length) * Math.PI * 2 - Math.PI / 2;
      pos[j] = [p[0] + Math.cos(a) * radio, p[1] + Math.sin(a) * radio];
    });
  });
  return pos;
}

export default function MapaTours({ tours }: Props) {
  const [activo, setActivo] = useState(0);
  const [hoverPin, setHoverPin] = useState<number | null>(null);
  const [manual, setManual] = useState(false);
  const [cam, setCam] = useState<Cam>({ cx: MAPA_W / 2, cy: MAPA_H / 2, z: 1 });
  const objetivo = useRef<Cam>(cam);
  const camRef = useRef<Cam>(cam);
  const raf = useRef(0);
  const svgRef = useRef<SVGSVGElement>(null);
  const arrastre = useRef<{ x: number; y: number; cam: Cam; movio: boolean } | null>(null);
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
  const reales = tours.map((t) => (t.lat != null && t.lng != null ? proyectar(Number(t.lat), Number(t.lng)) : null));
  const puntos = separar(reales, 13 / cam.z);

  // Animación suave de la cámara
  const mover = (destino: Cam) => {
    objetivo.current = limitar(destino);
    if (raf.current) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const paso = () => {
      const c = camRef.current, o = objetivo.current;
      const k = reduce ? 1 : 0.14;
      const n = { cx: c.cx + (o.cx - c.cx) * k, cy: c.cy + (o.cy - c.cy) * k, z: c.z + (o.z - c.z) * k };
      const fin = Math.abs(n.cx - o.cx) < 0.05 && Math.abs(n.cy - o.cy) < 0.05 && Math.abs(n.z - o.z) < 0.002;
      camRef.current = fin ? o : n;
      setCam(camRef.current);
      raf.current = fin ? 0 : requestAnimationFrame(paso);
    };
    raf.current = requestAnimationFrame(paso);
  };
  useEffect(() => () => {
    cancelAnimationFrame(raf.current);
    raf.current = 0;
  }, []);

  // Zoom automático: acercarse lo necesario para que el destino activo no se encime con otros
  useEffect(() => {
    const p = puntos[activo];
    if (!p) return;
    if (manual) {
      mover({ ...objetivo.current, cx: p[0], cy: p[1] });
      return;
    }
    const otros: [number, number][] = [
      ...reales.filter((q, j): q is [number, number] => !!q && j !== activo && Math.hypot(q[0] - p[0], q[1] - p[1]) >= 3),
      [bx, by],
    ];
    const cerca = Math.min(...otros.map((q) => Math.hypot(q[0] - p[0], q[1] - p[1])));
    const z = clamp(SEP_PANTALLA / Math.max(cerca, 1), Z_MIN, 4.5);
    // Destinos lejanos de Antigua: poco zoom para que se vea la ruta completa
    const lejos = Math.hypot(p[0] - bx, p[1] - by) > 60;
    mover({ cx: lejos ? (p[0] + bx) / 2 : p[0], cy: lejos ? (p[1] + by) / 2 : p[1], z: lejos ? Math.min(z, 1.5) : z });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activo, manual, tours]);

  const zoom = (factor: number) => {
    setManual(true);
    mover({ ...objetivo.current, z: objetivo.current.z * factor });
  };
  const verTodo = () => {
    setManual(true);
    mover({ cx: MAPA_W / 2, cy: MAPA_H / 2, z: 1 });
  };
  const seguir = () => setManual(false);

  // Arrastrar para mover el mapa
  const unidadesPorPx = () => (svgRef.current ? MAPA_W / camRef.current.z / svgRef.current.getBoundingClientRect().width : 1);
  const onPointerDown = (e: React.PointerEvent) => {
    if (camRef.current.z <= 1.01) return;
    arrastre.current = { x: e.clientX, y: e.clientY, cam: objetivo.current, movio: false };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const a = arrastre.current;
    if (!a) return;
    const dx = e.clientX - a.x, dy = e.clientY - a.y;
    if (!a.movio && Math.hypot(dx, dy) < 4) return;
    if (!a.movio) (e.currentTarget as Element).setPointerCapture(e.pointerId);
    a.movio = true;
    setManual(true);
    const u = unidadesPorPx();
    const n = limitar({ ...a.cam, cx: a.cam.cx - dx * u, cy: a.cam.cy - dy * u });
    objetivo.current = n;
    camRef.current = n;
    setCam(n);
  };
  const onPointerUp = () => {
    // pequeño retraso para que el clic en un punto no se confunda con el fin del arrastre
    setTimeout(() => { arrastre.current = null; }, 0);
  };
  const onWheel = (e: React.WheelEvent) => {
    if (!e.ctrlKey) return; // la rueda normal sigue bajando la página; Ctrl + rueda o pellizco = zoom
    e.preventDefault();
    zoom(e.deltaY < 0 ? 1.25 : 0.8);
  };

  const vw = MAPA_W / cam.z, vh = MAPA_H / cam.z;
  const vx = cam.cx - vw / 2, vy = cam.cy - vh / 2;
  const inv = 1 / cam.z;
  const aPct = (p: [number, number]) => ({ left: `${((p[0] - vx) / vw) * 100}%`, top: `${((p[1] - vy) / vh) * 100}%` });
  const visible = (p: [number, number]) => p[0] >= vx && p[0] <= vx + vw && p[1] >= vy && p[1] <= vy + vh;

  const actual = tours[activo];
  const pa = puntos[activo];
  const pin = hoverPin ?? activo;
  const pinPos = puntos[pin];
  const conNombres = cam.z >= 2.2;
  // Etiqueta a la izquierda si a su derecha hay otro punto cercano (en px de pantalla)
  const etiquetaIzq = (i: number) => {
    const p = puntos[i];
    if (!p) return false;
    return [...puntos, [bx, by] as [number, number]].some((q, j) => {
      if (!q || j === i) return false;
      const dx = (q[0] - p[0]) * cam.z, dy = (q[1] - p[1]) * cam.z;
      return dx > 0 && dx < 150 && Math.abs(dy) < 16;
    });
  };

  // Ruta curva desde Antigua hasta el destino activo
  const ruta = pa && Math.hypot(pa[0] - bx, pa[1] - by) > 8
    ? `M${bx},${by} Q${(bx + pa[0]) / 2 + (pa[1] - by) * 0.25},${(by + pa[1]) / 2 - Math.abs(pa[0] - bx) * 0.35 - 20} ${pa[0]},${pa[1]}`
    : null;

  return (
    <div className="explorer">
      <div className="explorer-map">
        <div className="mapa-lienzo">
        <svg
          ref={svgRef}
          viewBox={`${vx} ${vy} ${vw} ${vh}`}
          role="img"
          aria-label={`Mapa de Guatemala. Destino resaltado: ${actual?.nombre ?? ''}`}
          className={cam.z > 1.01 ? 'is-zoomed' : ''}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onWheel={onWheel}
          onDoubleClick={(e) => {
            const r = svgRef.current!.getBoundingClientRect();
            setManual(true);
            mover({ cx: vx + ((e.clientX - r.left) / r.width) * vw, cy: vy + ((e.clientY - r.top) / r.height) * vh, z: objetivo.current.z * 1.8 });
          }}
        >
          <defs>
            <linearGradient id="tierra" x1="0" y1="0" x2="0.4" y2="1">
              <stop offset="0" stopColor="#e9dcc3" />
              <stop offset=".55" stopColor="#dccaa8" />
              <stop offset="1" stopColor="#cdb38c" />
            </linearGradient>
            <pattern id="curvas" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform={`rotate(-20) scale(${1 / cam.z})`}>
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
            {VECINOS.map((v) => <path key={v.id} d={v.d} className="mapa-vecino" vectorEffect="non-scaling-stroke" />)}
          </g>
          <g filter="url(#sombra)">
            <path d={GUATEMALA} fill="url(#tierra)" stroke="#9b7f5a" strokeWidth="1.4" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          </g>
          <path d={GUATEMALA} fill="url(#curvas)" pointerEvents="none" />
          {cam.z < 1.6 && (
            <>
              <text x={MAPA_W / 2 + 40} y={130} className="mapa-pais">GUATEMALA</text>
              <text x={60} y={MAPA_H - 30} className="mapa-mar">Océano Pacífico</text>
            </>
          )}

          {ruta && <path key={activo} d={ruta} className="mapa-ruta" vectorEffect="non-scaling-stroke" />}

          {/* Líneas guía de puntos separados */}
          {puntos.map((p, i) => {
            const r = reales[i];
            return p && r && (p[0] !== r[0] || p[1] !== r[1])
              ? <line key={`l${i}`} x1={r[0]} y1={r[1]} x2={p[0]} y2={p[1]} className="mapa-guia" vectorEffect="non-scaling-stroke" />
              : null;
          })}

          {/* Agencia */}
          <g className="mapa-base" transform={`translate(${bx},${by}) scale(${inv})`}>
            <rect x="-5" y="-5" width="10" height="10" transform="rotate(45)" />
            {conNombres && !puntos.some((q) => q && Math.hypot(q[0] - bx, q[1] - by) * cam.z < 18) && <text x="10" y="4" className="pin-nombre base">Antigua (agencia)</text>}
          </g>

          {/* Destinos */}
          {puntos.map((p, i) =>
            p ? (
              <g
                key={tours[i].id}
                className={`mapa-pin ${i === activo ? 'is-active' : ''} ${i === hoverPin ? 'is-hover' : ''}`}
                transform={`translate(${p[0]},${p[1]}) scale(${inv})`}
                onMouseEnter={() => setHoverPin(i)}
                onMouseLeave={() => setHoverPin(null)}
                onClick={() => { if (!arrastre.current?.movio) irA(i); }}
                role="button"
                tabIndex={0}
                aria-label={tours[i].nombre}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && irA(i)}
              >
                <circle r="16" className="pin-hit" />
                {i === activo && <circle r="34" fill="url(#brillo)" className="pin-glow" />}
                {i === activo && <circle r="9" className="pin-pulse" />}
                <circle r={i === activo ? 7.5 : 5} className="pin-dot" />
                {conNombres && i !== pin && (
                  etiquetaIzq(i)
                    ? <text x="-10" y="4" textAnchor="end" className="pin-nombre">{tours[i].nombre}</text>
                    : <text x="10" y="4" className="pin-nombre">{tours[i].nombre}</text>
                )}
              </g>
            ) : null,
          )}
        </svg>

        {/* Etiqueta del pin activo o con hover */}
        {pinPos && tours[pin] && visible(pinPos) && (
          <div className={`mapa-tip ${hoverPin !== null ? 'is-hover' : ''}`} style={aPct(pinPos)}>
            <strong>{tours[pin].nombre}</strong>
            <span>{tours[pin].destino}</span>
            {hoverPin !== null && <span className="mapa-tip-meta">{tours[pin].duracion} · {formatQ(Number(tours[pin].precio_q))}</span>}
          </div>
        )}

        <div className="mapa-zoom" role="group" aria-label="Zoom del mapa">
          <button type="button" onClick={() => zoom(1.6)} aria-label="Acercar" title="Acercar"><Plus size={16} /></button>
          <button type="button" onClick={() => zoom(1 / 1.6)} aria-label="Alejar" title="Alejar" disabled={cam.z <= 1.01}><Minus size={16} /></button>
          <button type="button" onClick={verTodo} aria-label="Ver todo el país" title="Ver todo el país"><Maximize2 size={15} /></button>
          <button type="button" onClick={seguir} className={manual ? '' : 'on'} aria-pressed={!manual} aria-label="Seguir el recorrido" title="Seguir el recorrido automáticamente">
            <LocateFixed size={15} />
          </button>
        </div>
        </div>

        <p className="mapa-leyenda">
          <span className="ley-base" /> Salidas desde Antigua <span className="ley-pin" /> Destino
          <span className="ley-tip">· Arrastra o usa + / − para explorar</span>
        </p>
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
