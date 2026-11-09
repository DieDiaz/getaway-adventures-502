import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { supabase, formatQ, formatFecha } from '../../lib/supabase';
import { descargarCSV } from '../../lib/csv';
import type { EstadoReservacion } from '../../types';
import type { AdminProps } from './AdminApp';

const ESTADOS: EstadoReservacion[] = ['pendiente', 'confirmada', 'pagada', 'cancelada'];

export default function Reservaciones({ data, setReservas, recargar }: AdminProps) {
  const { reservas, tours } = data;
  const [filtro, setFiltro] = useState<EstadoReservacion | 'todas'>('todas');
  const [tourId, setTourId] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function cambiarEstado(id: string, estado: EstadoReservacion) {
    let previo: EstadoReservacion | undefined;
    setReservas((rs) => rs.map((r) => {
      if (r.id !== id) return r;
      previo = r.estado;
      return { ...r, estado };
    }));
    const { error } = await supabase.from('ga_reservaciones').update({ estado }).eq('id', id);
    if (error) {
      setError(error.message);
      setReservas((rs) => rs.map((r) => (r.id === id && previo ? { ...r, estado: previo } : r)));
    }
  }

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return reservas.filter((r) =>
      (filtro === 'todas' || r.estado === filtro) &&
      (!tourId || r.ga_salidas?.tour_id === tourId) &&
      (!q || [r.codigo, r.nombre, r.email, r.telefono, r.ga_salidas?.ga_tours?.nombre ?? '']
        .some((v) => v.toLowerCase().includes(q))));
  }, [reservas, filtro, tourId, busqueda]);

  function exportar() {
    descargarCSV(`reservaciones-${new Date().toISOString().slice(0, 10)}.csv`, [
      ['Código', 'Creada', 'Tour', 'Fecha salida', 'Nombre', 'Correo', 'Teléfono', 'Personas', 'Subtotal', 'Descuento', 'Total', 'Estado', 'Acepta promos', 'Notas'],
      ...visibles.map((r) => [
        r.codigo, new Date(r.created_at).toLocaleString('es-GT'), r.ga_salidas?.ga_tours?.nombre, r.ga_salidas?.fecha,
        r.nombre, r.email, r.telefono, r.personas, r.subtotal_q ?? r.total_q, r.descuento_q, r.total_q, r.estado,
        r.acepta_promos ? 'sí' : 'no', r.notas,
      ]),
    ]);
  }

  return (
    <div>
      <div className="admin-title">
        <div>
          <h2>Reservaciones</h2>
          <p className="muted">{visibles.length} de {reservas.length}</p>
        </div>
        <div className="row-actions">
          <button className="btn btn-ghost btn-sm" onClick={recargar}>Actualizar</button>
          <button className="btn btn-ghost btn-sm" onClick={exportar}><Download size={15} /> Exportar CSV</button>
        </div>
      </div>

      <div className="toolbar">
        <input placeholder="Buscar por código, nombre, correo, tour…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        <select value={tourId} onChange={(e) => setTourId(e.target.value)}>
          <option value="">Todos los tours</option>
          {tours.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
        </select>
        <select value={filtro} onChange={(e) => setFiltro(e.target.value as typeof filtro)}>
          <option value="todas">Todos los estados</option>
          {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
      </div>

      {error && <p className="alert alert-error">{error}</p>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Código</th><th>Tour / fecha</th><th>Cliente</th><th>Pax</th><th>Total</th><th>Estado</th></tr>
          </thead>
          <tbody>
            {visibles.map((r) => (
              <tr key={r.id}>
                <td><code>{r.codigo}</code><br /><small className="muted">{new Date(r.created_at).toLocaleDateString('es-GT')}</small></td>
                <td>{r.ga_salidas?.ga_tours?.nombre}<br /><small className="muted">{r.ga_salidas && formatFecha(r.ga_salidas.fecha)}</small></td>
                <td>
                  {r.nombre}<br />
                  <small><a href={`https://wa.me/${r.telefono.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">{r.telefono}</a> · <a href={`mailto:${r.email}`}>{r.email}</a></small>
                  {r.notas && <><br /><small className="muted">“{r.notas}”</small></>}
                </td>
                <td>{r.personas}</td>
                <td>
                  {formatQ(Number(r.total_q))}
                  {Number(r.descuento_q) > 0 && <><br /><small className="muted">−{formatQ(Number(r.descuento_q))} promo</small></>}
                </td>
                <td>
                  <select className={`estado estado-${r.estado}`} value={r.estado} onChange={(e) => cambiarEstado(r.id, e.target.value as EstadoReservacion)}>
                    {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
                  </select>
                </td>
              </tr>
            ))}
            {visibles.length === 0 && (
              <tr><td colSpan={6} className="center muted">No hay reservaciones.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
