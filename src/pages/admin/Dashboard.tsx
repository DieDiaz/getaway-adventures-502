import { useMemo, useState } from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import BarChart, { type Punto } from '../../components/charts/BarChart';
import { formatFecha, formatQ } from '../../lib/supabase';
import type { Reservacion } from '../../types';
import type { AdminProps } from './AdminApp';

type Periodo = '30' | '90' | '365' | 'todo';
const PERIODOS: { id: Periodo; label: string }[] = [
  { id: '30', label: '30 días' },
  { id: '90', label: '90 días' },
  { id: '365', label: '12 meses' },
  { id: 'todo', label: 'Todo' },
];
const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const DIA_MS = 86_400_000;

const qCorto = (n: number) =>
  n >= 1000 ? `Q${(n / 1000).toLocaleString('es-GT', { maximumFractionDigits: 1 })}k` : `Q${Math.round(n)}`;
const activa = (r: Reservacion) => r.estado !== 'cancelada';
const suma = (rs: Reservacion[], f: (r: Reservacion) => number) => rs.reduce((s, r) => s + f(r), 0);

function inicioSemana(d: Date) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); // lunes
  return x;
}

export default function Dashboard({ data }: AdminProps) {
  const [periodo, setPeriodo] = useState<Periodo>('90');
  const { reservas, salidas, tours, promos } = data;

  const a = useMemo(() => {
    const ahora = Date.now();
    const dias = periodo === 'todo' ? null : Number(periodo);
    const desde = dias ? ahora - dias * DIA_MS : 0;
    const enPeriodo = reservas.filter((r) => new Date(r.created_at).getTime() >= desde);
    const anterior = dias
      ? reservas.filter((r) => {
          const t = new Date(r.created_at).getTime();
          return t >= desde - dias * DIA_MS && t < desde;
        })
      : [];
    const act = enPeriodo.filter(activa);

    const ventas = suma(act, (r) => Number(r.total_q));
    const ventasPrev = suma(anterior.filter(activa), (r) => Number(r.total_q));
    const cobrado = suma(enPeriodo.filter((r) => r.estado === 'pagada'), (r) => Number(r.total_q));
    const porCobrar = suma(enPeriodo.filter((r) => r.estado === 'pendiente' || r.estado === 'confirmada'), (r) => Number(r.total_q));
    const viajeros = suma(act, (r) => r.personas);
    const descuentos = suma(act, (r) => Number(r.descuento_q ?? 0));
    const canceladas = enPeriodo.length - act.length;

    // Serie temporal: semanal hasta 90 días, mensual después
    const mensual = !dias || dias > 90;
    const cubetas = new Map<string, { label: string; value: number; n: number; orden: number }>();
    const primera = act.length ? Math.min(...act.map((r) => new Date(r.created_at).getTime())) : ahora;
    const inicio = new Date(dias ? desde : primera);
    if (mensual) {
      const c = new Date(inicio.getFullYear(), inicio.getMonth(), 1);
      while (c.getTime() <= ahora) {
        const k = `${c.getFullYear()}-${c.getMonth()}`;
        cubetas.set(k, { label: c.toLocaleDateString('es-GT', { month: 'short', year: '2-digit' }), value: 0, n: 0, orden: c.getTime() });
        c.setMonth(c.getMonth() + 1);
      }
    } else {
      const c = inicioSemana(inicio);
      while (c.getTime() <= ahora) {
        cubetas.set(c.toDateString(), { label: c.toLocaleDateString('es-GT', { day: 'numeric', month: 'short' }), value: 0, n: 0, orden: c.getTime() });
        c.setDate(c.getDate() + 7);
      }
    }
    for (const r of act) {
      const d = new Date(r.created_at);
      const k = mensual ? `${d.getFullYear()}-${d.getMonth()}` : inicioSemana(d).toDateString();
      const b = cubetas.get(k);
      if (b) { b.value += Number(r.total_q); b.n += 1; }
    }
    const serie: Punto[] = [...cubetas.values()]
      .sort((x, y) => x.orden - y.orden)
      .map((b) => ({ label: b.label, value: b.value, detalle: `${b.n} reservaciones · ${mensual ? 'mes' : 'semana del'} ${b.label}` }));

    // Ventas por tour
    const porTour = new Map<string, { value: number; n: number; pax: number }>();
    for (const r of act) {
      const nombre = r.ga_salidas?.ga_tours?.nombre ?? 'Sin tour';
      const t = porTour.get(nombre) ?? { value: 0, n: 0, pax: 0 };
      t.value += Number(r.total_q); t.n += 1; t.pax += r.personas;
      porTour.set(nombre, t);
    }
    const tourSerie: Punto[] = [...porTour.entries()]
      .sort((x, y) => y[1].value - x[1].value)
      .map(([label, t]) => ({ label, value: t.value, detalle: `${t.n} reservaciones · ${t.pax} viajeros` }));

    // Día de la semana de la salida (viajeros)
    const porDia = Array.from({ length: 7 }, () => 0);
    for (const r of act) if (r.ga_salidas) porDia[new Date(`${r.ga_salidas.fecha}T12:00:00`).getDay()] += r.personas;
    const diaSerie: Punto[] = [1, 2, 3, 4, 5, 6, 0].map((i) => ({ label: DIAS[i], value: porDia[i], detalle: `${porDia[i]} viajeros` }));

    // Anticipación (días entre reservar y viajar)
    const antic = act
      .filter((r) => r.ga_salidas)
      .map((r) => (new Date(`${r.ga_salidas!.fecha}T12:00:00`).getTime() - new Date(r.created_at).getTime()) / DIA_MS);
    const anticipacion = antic.length ? antic.reduce((s, x) => s + x, 0) / antic.length : 0;

    // Clientes recurrentes en el periodo
    const porCliente = new Map<string, number>();
    for (const r of act) porCliente.set(r.email.toLowerCase(), (porCliente.get(r.email.toLowerCase()) ?? 0) + 1);
    const clientesUnicos = porCliente.size;
    const recurrentes = [...porCliente.values()].filter((n) => n > 1).length;

    // Estados
    const estados = (['pendiente', 'confirmada', 'pagada', 'cancelada'] as const).map((e) => {
      const rs = enPeriodo.filter((r) => r.estado === e);
      return { estado: e, n: rs.length, monto: suma(rs, (r) => Number(r.total_q)) };
    });

    // Promos usadas
    const usoPromos = promos
      .map((p) => {
        const rs = act.filter((r) => r.promo_id === p.id);
        return { titulo: p.titulo, codigo: p.codigo, n: rs.length, ventas: suma(rs, (r) => Number(r.total_q)), descuento: suma(rs, (r) => Number(r.descuento_q)) };
      })
      .filter((p) => p.n > 0)
      .sort((x, y) => y.ventas - x.ventas);

    return {
      ventas, ventasPrev, cobrado, porCobrar, viajeros, descuentos, canceladas,
      n: act.length, total: enPeriodo.length, ticket: act.length ? ventas / act.length : 0,
      cancelacion: enPeriodo.length ? canceladas / enPeriodo.length : 0,
      serie, mensual, tourSerie, diaSerie, anticipacion, clientesUnicos, recurrentes, estados, usoPromos, comparar: !!dias,
    };
  }, [reservas, promos, periodo]);

  // Ocupación de las próximas salidas (independiente del periodo)
  const proximas = useMemo(() => {
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const limite = hoy.getTime() + 14 * DIA_MS;
    const ocupados = new Map<string, number>();
    for (const r of reservas) if (activa(r)) ocupados.set(r.salida_id, (ocupados.get(r.salida_id) ?? 0) + r.personas);
    const nombre = new Map(tours.map((t) => [t.id, t.nombre]));
    return salidas
      .filter((s) => {
        const t = new Date(`${s.fecha}T12:00:00`).getTime();
        return s.activo && t >= hoy.getTime() && t <= limite && (ocupados.get(s.id) ?? 0) > 0;
      })
      .map((s) => ({ ...s, tour: nombre.get(s.tour_id) ?? '—', ocupados: ocupados.get(s.id) ?? 0 }))
      .slice(0, 12);
  }, [reservas, salidas, tours]);

  const delta = a.ventasPrev > 0 ? (a.ventas - a.ventasPrev) / a.ventasPrev : null;
  const pct = (x: number) => `${Math.round(x * 100)}%`;

  return (
    <div className="dash">
      <div className="admin-title">
        <div>
          <h2>Dashboard de ventas</h2>
          <p className="muted">Basado en la fecha en que se hizo cada reservación.</p>
        </div>
        <div className="seg" role="group" aria-label="Periodo">
          {PERIODOS.map((p) => (
            <button key={p.id} type="button" className={periodo === p.id ? 'active' : ''} onClick={() => setPeriodo(p.id)}>{p.label}</button>
          ))}
        </div>
      </div>

      <div className="kpis">
        <div className="kpi kpi-hero">
          <span>Ventas</span>
          <strong>{formatQ(a.ventas)}</strong>
          {a.comparar && (
            <small className={delta === null ? 'muted' : delta >= 0 ? 'up' : 'down'}>
              {delta === null ? 'Sin datos del periodo anterior' : (
                <>{delta >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />} {delta >= 0 ? '+' : ''}{pct(delta)} vs. periodo anterior</>
              )}
            </small>
          )}
        </div>
        <div className="kpi"><span>Cobrado</span><strong>{formatQ(a.cobrado)}</strong><small className="muted">reservaciones pagadas</small></div>
        <div className="kpi"><span>Por cobrar</span><strong>{formatQ(a.porCobrar)}</strong><small className="muted">pendientes y confirmadas</small></div>
        <div className="kpi"><span>Reservaciones</span><strong>{a.n}</strong><small className="muted">{a.viajeros} viajeros</small></div>
        <div className="kpi"><span>Ticket promedio</span><strong>{formatQ(a.ticket)}</strong><small className="muted">por reservación</small></div>
        <div className="kpi"><span>Cancelación</span><strong>{pct(a.cancelacion)}</strong><small className="muted">{a.canceladas} de {a.total}</small></div>
      </div>

      <div className="dash-grid">
        <div className="span-2">
          <BarChart titulo={`Ventas por ${a.mensual ? 'mes' : 'semana'}`} data={a.serie} formato={qCorto} />
        </div>
        <BarChart titulo="Ventas por tour" data={a.tourSerie} formato={qCorto} orientacion="horizontal" />
        <BarChart titulo="Viajeros por día de salida" data={a.diaSerie} formato={(n) => String(Math.round(n))} alto={180} />

        <div className="panel">
          <h3>Comportamiento de clientes</h3>
          <dl className="facts">
            <div><dt>Clientes únicos</dt><dd>{a.clientesUnicos}</dd></div>
            <div><dt>Clientes que repiten</dt><dd>{a.recurrentes} <small className="muted">({a.clientesUnicos ? pct(a.recurrentes / a.clientesUnicos) : '0%'})</small></dd></div>
            <div><dt>Reservan con anticipación de</dt><dd>{a.anticipacion.toFixed(1)} días <small className="muted">promedio</small></dd></div>
            <div><dt>Tamaño de grupo</dt><dd>{a.n ? (a.viajeros / a.n).toFixed(1) : '0'} personas</dd></div>
            <div><dt>Descuentos otorgados</dt><dd>{formatQ(a.descuentos)}</dd></div>
          </dl>
        </div>

        <div className="panel">
          <h3>Estado de las reservaciones</h3>
          <ul className="estados">
            {a.estados.map((e) => (
              <li key={e.estado}>
                <span className={`estado-pill estado-${e.estado}`}>{e.estado}</span>
                <span>{e.n}</span>
                <span className="muted">{formatQ(e.monto)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="panel span-2">
          <h3>Próximas salidas con reservaciones <small className="muted">(14 días)</small></h3>
          {proximas.length === 0 ? (
            <p className="muted">No hay salidas con reservaciones en los próximos 14 días.</p>
          ) : (
            <table className="mini">
              <thead><tr><th>Fecha</th><th>Tour</th><th>Ocupación</th></tr></thead>
              <tbody>
                {proximas.map((s) => (
                  <tr key={s.id}>
                    <td>{formatFecha(s.fecha)}</td>
                    <td>{s.tour}</td>
                    <td>
                      <div className="meter" aria-label={`${s.ocupados} de ${s.cupo}`}>
                        <span style={{ width: `${Math.min(100, (s.ocupados / s.cupo) * 100)}%` }} />
                      </div>
                      <small>{s.ocupados} / {s.cupo}</small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {a.usoPromos.length > 0 && (
          <div className="panel span-2">
            <h3>Rendimiento de promociones</h3>
            <table className="mini">
              <thead><tr><th>Promoción</th><th>Usos</th><th>Ventas</th><th>Descuento</th></tr></thead>
              <tbody>
                {a.usoPromos.map((p) => (
                  <tr key={p.titulo}><td>{p.titulo} {p.codigo && <code>{p.codigo}</code>}</td><td>{p.n}</td><td>{formatQ(p.ventas)}</td><td>{formatQ(p.descuento)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
