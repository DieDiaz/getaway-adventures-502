import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check, Copy, Download, Mail, MessageCircle } from 'lucide-react';
import { formatQ, formatFecha, SITE_URL } from '../../lib/supabase';
import { descargarCSV } from '../../lib/csv';
import type { Cliente, Promocion } from '../../types';
import type { AdminProps } from './AdminApp';

const telWa = (t: string) => {
  const d = t.replace(/\D/g, '');
  return d.length === 8 ? `502${d}` : d;
};
const primerNombre = (n: string) => n.trim().split(/\s+/)[0] ?? '';
const personalizar = (plantilla: string, c: Cliente) => plantilla.replace(/\{nombre\}/gi, primerNombre(c.nombre));

function textoPromo(p: Promocion, tourNombre: string | null) {
  const partes = [`¡Hola {nombre}! 🌋 ${p.titulo}`];
  if (p.descripcion) partes.push(p.descripcion);
  if (p.codigo && p.descuento_pct > 0) partes.push(`Usa el código ${p.codigo} y obtén ${Number(p.descuento_pct)}% de descuento${tourNombre ? ` en ${tourNombre}` : ''}.`);
  if (p.hasta) partes.push(`Válido hasta el ${formatFecha(p.hasta, { day: 'numeric', month: 'long' })}.`);
  partes.push(`Reserva aquí: ${SITE_URL()}`);
  partes.push('— Getaway Adventures 502');
  return partes.join('\n\n');
}

export default function Clientes({ data }: AdminProps) {
  const { clientes, promos, tours } = data;
  const [params] = useSearchParams();
  const [busqueda, setBusqueda] = useState('');
  const [soloConsent, setSoloConsent] = useState(true);
  const [tourFiltro, setTourFiltro] = useState('');
  const [segmento, setSegmento] = useState<'todos' | 'recurrentes' | 'inactivos' | 'nuevos'>('todos');
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [asunto, setAsunto] = useState('Nueva aventura con Getaway Adventures');
  const [mensaje, setMensaje] = useState('¡Hola {nombre}! 🌋 Tenemos nuevas salidas disponibles. Reserva aquí: ' + SITE_URL());
  const [enviados, setEnviados] = useState<Set<string>>(new Set());
  const [copiado, setCopiado] = useState(false);

  // Si se llega desde "Enviar a clientes" en una promoción, precargar el mensaje
  useEffect(() => {
    const p = promos.find((x) => x.id === params.get('promo'));
    if (!p) return;
    const tour = p.tour_id ? tours.find((t) => t.id === p.tour_id) : null;
    setMensaje(textoPromo(p, tour?.nombre ?? null));
    setAsunto(p.titulo);
    if (tour) setTourFiltro('');
  }, [params, promos, tours]);

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const hace90 = Date.now() - 90 * 86_400_000;
    const hace30 = Date.now() - 30 * 86_400_000;
    return clientes.filter((c) =>
      (!soloConsent || c.acepta_promos) &&
      (!tourFiltro || c.tours.includes(tourFiltro)) &&
      (segmento === 'todos' ||
        (segmento === 'recurrentes' && c.reservas_activas > 1) ||
        (segmento === 'inactivos' && new Date(c.ultima_reserva).getTime() < hace90) ||
        (segmento === 'nuevos' && new Date(c.primera_reserva).getTime() >= hace30)) &&
      (!q || [c.nombre, c.email, c.telefono].some((v) => v.toLowerCase().includes(q))));
  }, [clientes, busqueda, soloConsent, tourFiltro, segmento]);

  const seleccionados = visibles.filter((c) => sel.has(c.email));
  const todosSel = visibles.length > 0 && seleccionados.length === visibles.length;

  const toggle = (email: string) => setSel((s) => {
    const n = new Set(s);
    if (n.has(email)) n.delete(email); else n.add(email);
    return n;
  });
  const toggleTodos = () => setSel(todosSel ? new Set() : new Set(visibles.map((c) => c.email)));

  function abrirWa(c: Cliente) {
    window.open(`https://wa.me/${telWa(c.telefono)}?text=${encodeURIComponent(personalizar(mensaje, c))}`, '_blank', 'noopener');
    setEnviados((s) => new Set(s).add(c.email));
  }

  const correos = seleccionados.map((c) => c.email).join(',');
  const cuerpoCorreo = mensaje.replace(/\{nombre\}/gi, '').replace(/¡Hola\s*!/g, '¡Hola!');
  const mailto = `mailto:?bcc=${encodeURIComponent(correos)}&subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpoCorreo)}`;

  async function copiarCorreos() {
    await navigator.clipboard.writeText(seleccionados.map((c) => c.email).join(', '));
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1500);
  }

  function exportar() {
    const filas = (seleccionados.length ? seleccionados : visibles);
    descargarCSV(`clientes-${new Date().toISOString().slice(0, 10)}.csv`, [
      ['Nombre', 'Correo', 'Teléfono', 'Reservaciones', 'Viajeros', 'Total', 'Pagado', 'Acepta promos', 'Primera reserva', 'Última reserva', 'Último viaje', 'Tours'],
      ...filas.map((c) => [c.nombre, c.email, c.telefono, c.reservas, c.viajeros, c.total_q, c.pagado_q, c.acepta_promos ? 'sí' : 'no',
        c.primera_reserva.slice(0, 10), c.ultima_reserva.slice(0, 10), c.ultimo_viaje, c.tours.join(' | ')]),
    ]);
  }

  return (
    <div>
      <div className="admin-title">
        <div>
          <h2>Base de clientes</h2>
          <p className="muted">{clientes.length} clientes · {clientes.filter((c) => c.acepta_promos).length} aceptan recibir promociones</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={exportar}><Download size={15} /> Exportar CSV</button>
      </div>

      <div className="toolbar">
        <input placeholder="Buscar por nombre, correo o teléfono…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        <select value={segmento} onChange={(e) => setSegmento(e.target.value as typeof segmento)}>
          <option value="todos">Todos</option>
          <option value="recurrentes">Recurrentes (2+ viajes)</option>
          <option value="nuevos">Nuevos (últimos 30 días)</option>
          <option value="inactivos">Sin reservar hace 90+ días</option>
        </select>
        <select value={tourFiltro} onChange={(e) => setTourFiltro(e.target.value)}>
          <option value="">Cualquier tour</option>
          {tours.map((t) => <option key={t.id} value={t.nombre}>{t.nombre}</option>)}
        </select>
        <label className="check"><input type="checkbox" checked={soloConsent} onChange={(e) => setSoloConsent(e.target.checked)} /> Solo quienes aceptan promociones</label>
      </div>

      <div className="clientes-layout">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th><input type="checkbox" aria-label="Seleccionar todos" checked={todosSel} onChange={toggleTodos} /></th>
                <th>Cliente</th><th>Viajes</th><th>Total</th><th>Último viaje</th><th />
              </tr>
            </thead>
            <tbody>
              {visibles.map((c) => (
                <tr key={c.email} className={sel.has(c.email) ? 'is-sel' : ''}>
                  <td><input type="checkbox" aria-label={`Seleccionar ${c.nombre}`} checked={sel.has(c.email)} onChange={() => toggle(c.email)} /></td>
                  <td>
                    {c.nombre} {!c.acepta_promos && <span className="badge badge-off" title="No aceptó recibir promociones">sin consentimiento</span>}
                    <br /><small className="muted">{c.email} · {c.telefono}</small>
                    <br /><small className="muted">{c.tours.join(', ')}</small>
                  </td>
                  <td>{c.reservas_activas}<br /><small className="muted">{c.viajeros} pax</small></td>
                  <td>{formatQ(Number(c.total_q))}<br /><small className="muted">pagado {formatQ(Number(c.pagado_q))}</small></td>
                  <td>{c.ultimo_viaje ? formatFecha(c.ultimo_viaje) : '—'}</td>
                  <td>
                    <button className={`icon-btn wa ${enviados.has(c.email) ? 'done' : ''}`} title="Escribir por WhatsApp" onClick={() => abrirWa(c)}>
                      {enviados.has(c.email) ? <Check size={16} /> : <MessageCircle size={16} />}
                    </button>
                  </td>
                </tr>
              ))}
              {visibles.length === 0 && <tr><td colSpan={6} className="center muted">No hay clientes con estos filtros.</td></tr>}
            </tbody>
          </table>
        </div>

        <aside className="composer card">
          <h3>Escribir a clientes</h3>
          <label>Usar una promoción
            <select value="" onChange={(e) => {
              const p = promos.find((x) => x.id === e.target.value);
              if (!p) return;
              const tour = p.tour_id ? tours.find((t) => t.id === p.tour_id) : null;
              setMensaje(textoPromo(p, tour?.nombre ?? null));
              setAsunto(p.titulo);
            }}>
              <option value="">Elegir…</option>
              {promos.map((p) => <option key={p.id} value={p.id}>{p.titulo}</option>)}
            </select>
          </label>
          <label>Asunto (correo)<input value={asunto} onChange={(e) => setAsunto(e.target.value)} /></label>
          <label>Mensaje <small className="muted">— usa {'{nombre}'} para personalizar</small>
            <textarea rows={9} value={mensaje} onChange={(e) => setMensaje(e.target.value)} />
          </label>
          {seleccionados[0] && (
            <div className="preview">
              <small className="muted">Vista previa para {primerNombre(seleccionados[0].nombre)}:</small>
              <p>{personalizar(mensaje, seleccionados[0])}</p>
            </div>
          )}

          <p className="muted small">{seleccionados.length} seleccionados</p>
          <div className="composer-actions">
            <a className={`btn btn-sm ${seleccionados.length ? '' : 'is-disabled'}`} href={seleccionados.length ? mailto : undefined}>
              <Mail size={15} /> Correo a todos (CCO)
            </a>
            <button className="btn btn-ghost btn-sm" disabled={!seleccionados.length} onClick={copiarCorreos}>
              {copiado ? <Check size={15} /> : <Copy size={15} />} {copiado ? 'Copiados' : 'Copiar correos'}
            </button>
          </div>

          {seleccionados.length > 0 && (
            <div className="wa-queue">
              <small className="muted">WhatsApp: el navegador solo permite abrir un chat a la vez. Envía uno por uno:</small>
              <ul>
                {seleccionados.map((c) => (
                  <li key={c.email}>
                    <span>{c.nombre}</span>
                    <button className={`btn btn-sm ${enviados.has(c.email) ? 'btn-ghost' : 'btn-wa'}`} onClick={() => abrirWa(c)}>
                      {enviados.has(c.email) ? 'Enviado ✓' : 'Enviar'}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
