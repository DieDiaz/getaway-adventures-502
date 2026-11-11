import { FormEvent, useMemo, useState } from 'react';
import { CalendarPlus, EyeOff, Eye, ImagePlus, Pencil, Plus, Trash2, X } from 'lucide-react';
import { asset, supabase, formatQ, formatFecha } from '../../lib/supabase';
import { borrarImagen, subirImagen } from '../../lib/upload';
import type { Salida, Tour } from '../../types';
import type { AdminProps } from './AdminApp';

const slugify = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

type Borrador = Omit<Tour, 'id'> & { id?: string };
const NUEVO: Borrador = {
  slug: '', nombre: '', destino: '', descripcion: '', imagen_url: null, precio_q: 0, duracion: '1 día',
  incluye: [], punto_salida: 'Antigua Guatemala', horario: '', galeria: [], lat: null, lng: null, activo: true, orden: 99,
  nombre_en: '', destino_en: '', descripcion_en: '', duracion_en: '', punto_salida_en: '', horario_en: '', incluye_en: [],
};

export default function Tours({ data, recargar }: AdminProps) {
  const { tours, salidas, reservas } = data;
  const [editando, setEditando] = useState<Borrador | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stats = useMemo(() => {
    const m = new Map<string, { reservas: number; futuras: number }>();
    const hoy = new Date().toISOString().slice(0, 10);
    for (const t of tours) m.set(t.id, { reservas: 0, futuras: 0 });
    for (const r of reservas) if (r.ga_salidas) { const s = m.get(r.ga_salidas.tour_id); if (s) s.reservas++; }
    for (const s of salidas) if (s.activo && s.fecha >= hoy) { const x = m.get(s.tour_id); if (x) x.futuras++; }
    return m;
  }, [tours, salidas, reservas]);

  async function toggleActivo(t: Tour) {
    const msg = t.activo
      ? `¿Dar de baja "${t.nombre}"? Dejará de mostrarse en la página y no aceptará nuevas reservaciones. Las reservaciones existentes se conservan.`
      : `¿Reactivar "${t.nombre}"?`;
    if (!confirm(msg)) return;
    const { error } = await supabase.from('ga_tours').update({ activo: !t.activo }).eq('id', t.id);
    if (error) setError(error.message); else recargar();
  }

  async function eliminar(t: Tour) {
    if ((stats.get(t.id)?.reservas ?? 0) > 0) {
      alert('Este tour tiene reservaciones. Puedes darlo de baja, pero no eliminarlo, para conservar el historial.');
      return;
    }
    if (!confirm(`¿Eliminar definitivamente "${t.nombre}" y todas sus salidas? Esta acción no se puede deshacer.`)) return;
    const { error } = await supabase.from('ga_tours').delete().eq('id', t.id);
    if (error) return setError(error.message);
    await Promise.all([t.imagen_url, ...t.galeria].filter(Boolean).map((u) => borrarImagen(u!)));
    recargar();
  }

  if (editando) {
    return <EditorTour inicial={editando} salidas={salidas} reservas={data.reservas} onCerrar={() => setEditando(null)} recargar={recargar} />;
  }

  return (
    <div>
      <div className="admin-title">
        <div>
          <h2>Tours y salidas</h2>
          <p className="muted">{tours.filter((t) => t.activo).length} activos · {tours.filter((t) => !t.activo).length} dados de baja</p>
        </div>
        <button className="btn btn-sm" onClick={() => setEditando({ ...NUEVO, orden: tours.length + 1 })}><Plus size={16} /> Nuevo viaje</button>
      </div>
      {error && <p className="alert alert-error">{error}</p>}

      <div className="tour-list">
        {tours.map((t) => {
          const s = stats.get(t.id)!;
          return (
            <article key={t.id} className={`tour-row ${t.activo ? '' : 'is-off'}`}>
              <div className="tour-thumb" style={{ backgroundImage: t.imagen_url ? `url(${asset(t.imagen_url)})` : undefined }} />
              <div className="tour-info">
                <div className="tour-name">
                  <strong>{t.nombre}</strong>
                  <span className={`badge ${t.activo ? 'badge-on' : 'badge-off'}`}>{t.activo ? 'Activo' : 'Dado de baja'}</span>
                </div>
                <small className="muted">{t.destino} · {t.duracion} · {formatQ(Number(t.precio_q))}</small>
                <small className="muted">{s.reservas} reservaciones · {s.futuras} salidas próximas</small>
              </div>
              <div className="tour-actions">
                <button className="icon-btn" title="Editar" onClick={() => setEditando(t)}><Pencil size={17} /><span>Editar</span></button>
                <button className="icon-btn" title={t.activo ? 'Dar de baja' : 'Reactivar'} onClick={() => toggleActivo(t)}>
                  {t.activo ? <EyeOff size={17} /> : <Eye size={17} />}<span>{t.activo ? 'Dar de baja' : 'Reactivar'}</span>
                </button>
                <button className="icon-btn danger" title="Eliminar" onClick={() => eliminar(t)}><Trash2 size={17} /><span>Eliminar</span></button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- Editor ---------------- */

function EditorTour({ inicial, salidas, reservas, onCerrar, recargar }: {
  inicial: Borrador; salidas: Salida[]; reservas: AdminProps['data']['reservas'];
  onCerrar: () => void; recargar: () => Promise<void>;
}) {
  const [t, setT] = useState<Borrador>({ ...inicial, horario: inicial.horario ?? '' });
  const [incluyeTxt, setIncluyeTxt] = useState(inicial.incluye.join('\n'));
  const [incluyeEnTxt, setIncluyeEnTxt] = useState((inicial.incluye_en ?? []).join('\n'));
  const [slugManual, setSlugManual] = useState(!!inicial.id);
  const [guardando, setGuardando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const set = <K extends keyof Borrador>(k: K, v: Borrador[K]) => setT((x) => ({ ...x, [k]: v }));

  async function subir(files: FileList | null, destino: 'portada' | 'galeria') {
    if (!files?.length) return;
    setSubiendo(true); setError(null);
    try {
      const urls = await Promise.all([...files].map((f) => subirImagen(f, 'tours')));
      if (destino === 'portada') set('imagen_url', urls[0]);
      else set('galeria', [...t.galeria, ...urls]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubiendo(false);
    }
  }

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setGuardando(true); setError(null); setOk(null);
    const fila = {
      slug: t.slug || slugify(t.nombre), nombre: t.nombre.trim(), destino: t.destino.trim(), descripcion: t.descripcion.trim(),
      imagen_url: t.imagen_url, precio_q: Number(t.precio_q), duracion: t.duracion.trim(), horario: t.horario?.trim() || null,
      incluye: incluyeTxt.split('\n').map((x) => x.trim()).filter(Boolean), punto_salida: t.punto_salida.trim(),
      galeria: t.galeria, activo: t.activo, orden: Number(t.orden),
      lat: t.lat === null || String(t.lat) === '' ? null : Number(t.lat), lng: t.lng === null || String(t.lng) === '' ? null : Number(t.lng),
      nombre_en: t.nombre_en?.trim() || null, destino_en: t.destino_en?.trim() || null, descripcion_en: t.descripcion_en?.trim() || null,
      duracion_en: t.duracion_en?.trim() || null, punto_salida_en: t.punto_salida_en?.trim() || null, horario_en: t.horario_en?.trim() || null,
      incluye_en: incluyeEnTxt.split('\n').map((x) => x.trim()).filter(Boolean),
    };
    const res = t.id
      ? await supabase.from('ga_tours').update(fila).eq('id', t.id).select().single()
      : await supabase.from('ga_tours').insert(fila).select().single();
    setGuardando(false);
    if (res.error) {
      setError(res.error.code === '23505' ? 'Ya existe un tour con ese identificador (slug). Cambia el nombre o el slug.' : res.error.message);
      return;
    }
    setT({ ...(res.data as Tour), horario: res.data.horario ?? '' });
    setSlugManual(true);
    setOk(t.id ? 'Cambios guardados.' : 'Tour creado. Ahora agrega sus fechas de salida abajo.');
    recargar();
  }

  return (
    <div>
      <div className="admin-title">
        <div>
          <button className="back" onClick={onCerrar}>← Volver a tours</button>
          <h2>{t.id ? `Editar: ${inicial.nombre}` : 'Nuevo viaje'}</h2>
        </div>
        {t.id && <a className="btn btn-ghost btn-sm" href={`${import.meta.env.BASE_URL}tour/${t.slug}`} target="_blank" rel="noreferrer">Ver en la página</a>}
      </div>

      <form className="editor card" onSubmit={guardar}>
        <div className="editor-grid">
          <label>Nombre del viaje
            <input required value={t.nombre} onChange={(e) => { set('nombre', e.target.value); if (!slugManual) set('slug', slugify(e.target.value)); }} />
          </label>
          <label>Identificador en la URL (slug)
            <input required pattern="[a-z0-9-]+" value={t.slug} onChange={(e) => { setSlugManual(true); set('slug', slugify(e.target.value)); }} />
            <small className="muted">/tour/{t.slug || '…'}</small>
          </label>
          <label>Destino / lugar<input required value={t.destino} onChange={(e) => set('destino', e.target.value)} /></label>
          <label>Precio por persona (Q)<input required type="number" min={0} step="0.01" value={t.precio_q} onChange={(e) => set('precio_q', Number(e.target.value))} /></label>
          <label>Duración<input required value={t.duracion} onChange={(e) => set('duracion', e.target.value)} placeholder="2 días / 1 noche" /></label>
          <label>Punto de salida<input required value={t.punto_salida} onChange={(e) => set('punto_salida', e.target.value)} /></label>
          <label className="span-2">Horario<input value={t.horario ?? ''} onChange={(e) => set('horario', e.target.value)} placeholder="Salida 8:00 am desde Antigua · regreso 5:00 pm" /></label>
          <label className="span-2">Descripción<textarea required rows={3} value={t.descripcion} onChange={(e) => set('descripcion', e.target.value)} /></label>
          <label>Latitud <small className="muted">(para el mapa, ej. 14.5009)</small>
            <input type="number" step="0.0001" min={13} max={18.5} value={t.lat ?? ''} onChange={(e) => set('lat', e.target.value === '' ? null : Number(e.target.value))} />
          </label>
          <label>Longitud <small className="muted">(ej. -90.8762)</small>
            <input type="number" step="0.0001" min={-92.5} max={-88} value={t.lng ?? ''} onChange={(e) => set('lng', e.target.value === '' ? null : Number(e.target.value))} />
            <small className="muted">Tip: en Google Maps, clic derecho sobre el lugar → copia las coordenadas.</small>
          </label>
          <label>Incluye <small className="muted">(uno por línea)</small><textarea rows={5} value={incluyeTxt} onChange={(e) => setIncluyeTxt(e.target.value)} /></label>
          <div>
            <label>Orden en la página<input type="number" value={t.orden} onChange={(e) => set('orden', Number(e.target.value))} /></label>
            <label className="check"><input type="checkbox" checked={t.activo} onChange={(e) => set('activo', e.target.checked)} /> Visible en la página (activo)</label>
          </div>
        </div>

        <h3>English version</h3>
        <p className="muted">La página se muestra en inglés por defecto. Los campos vacíos usan el texto en español.</p>
        <div className="editor-grid">
          <label>Name (EN)<input value={t.nombre_en ?? ''} onChange={(e) => set('nombre_en', e.target.value)} placeholder={t.nombre} /></label>
          <label>Destination (EN)<input value={t.destino_en ?? ''} onChange={(e) => set('destino_en', e.target.value)} placeholder={t.destino} /></label>
          <label>Duration (EN)<input value={t.duracion_en ?? ''} onChange={(e) => set('duracion_en', e.target.value)} placeholder="2 days / 1 night" /></label>
          <label>Departure point (EN)<input value={t.punto_salida_en ?? ''} onChange={(e) => set('punto_salida_en', e.target.value)} placeholder={t.punto_salida} /></label>
          <label className="span-2">Schedule (EN)<input value={t.horario_en ?? ''} onChange={(e) => set('horario_en', e.target.value)} placeholder="Departs 8:00 am from Antigua · returns 5:00 pm" /></label>
          <label className="span-2">Description (EN)<textarea rows={3} value={t.descripcion_en ?? ''} onChange={(e) => set('descripcion_en', e.target.value)} /></label>
          <label className="span-2">What's included (EN) <small className="muted">(uno por línea)</small><textarea rows={5} value={incluyeEnTxt} onChange={(e) => setIncluyeEnTxt(e.target.value)} /></label>
        </div>

        <h3>Fotos</h3>
        <div className="fotos">
          <div className="foto-portada">
            {t.imagen_url ? <img src={asset(t.imagen_url)} alt="Portada" /> : <div className="foto-vacia">Sin portada</div>}
            <label className="btn btn-ghost btn-sm file-btn">
              <ImagePlus size={15} /> {t.imagen_url ? 'Cambiar portada' : 'Subir portada'}
              <input type="file" accept="image/*" hidden onChange={(e) => subir(e.target.files, 'portada')} />
            </label>
          </div>
          <div className="foto-galeria">
            {t.galeria.map((g) => (
              <div key={g} className="foto-item">
                <img src={asset(g)} alt="" />
                <button type="button" aria-label="Quitar foto" onClick={() => set('galeria', t.galeria.filter((x) => x !== g))}><X size={14} /></button>
              </div>
            ))}
            <label className="foto-add">
              <ImagePlus size={20} /><span>Agregar a galería</span>
              <input type="file" accept="image/*" multiple hidden onChange={(e) => subir(e.target.files, 'galeria')} />
            </label>
          </div>
        </div>
        {subiendo && <p className="muted">Subiendo fotos…</p>}

        {error && <p className="alert alert-error">{error}</p>}
        {ok && <p className="alert alert-ok">{ok}</p>}
        <div className="row-actions start">
          <button className="btn" disabled={guardando || subiendo}>{guardando ? 'Guardando…' : t.id ? 'Guardar cambios' : 'Crear viaje'}</button>
          <button type="button" className="btn btn-ghost" onClick={onCerrar}>Cerrar</button>
        </div>
      </form>

      {t.id && <SalidasTour tourId={t.id} salidas={salidas.filter((s) => s.tour_id === t.id)} reservas={reservas} recargar={recargar} />}
    </div>
  );
}

/* ---------------- Salidas ---------------- */

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function SalidasTour({ tourId, salidas, reservas, recargar }: {
  tourId: string; salidas: Salida[]; reservas: AdminProps['data']['reservas']; recargar: () => Promise<void>;
}) {
  const hoy = new Date().toISOString().slice(0, 10);
  const en30 = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
  const [gen, setGen] = useState({ desde: hoy, hasta: en30, cupo: 12, dias: [0, 1, 2, 3, 4, 5, 6] });
  const [verPasadas, setVerPasadas] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const ocupados = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of reservas) if (r.estado !== 'cancelada') m.set(r.salida_id, (m.get(r.salida_id) ?? 0) + r.personas);
    return m;
  }, [reservas]);
  const conReservas = useMemo(() => new Set(reservas.map((r) => r.salida_id)), [reservas]);

  const lista = salidas.filter((s) => verPasadas || s.fecha >= hoy);

  async function generar(e: FormEvent) {
    e.preventDefault();
    setError(null); setMsg(null);
    const filas: { tour_id: string; fecha: string; cupo: number }[] = [];
    for (let d = new Date(`${gen.desde}T12:00:00`); d <= new Date(`${gen.hasta}T12:00:00`); d.setDate(d.getDate() + 1)) {
      if (gen.dias.includes(d.getDay())) filas.push({ tour_id: tourId, fecha: d.toISOString().slice(0, 10), cupo: gen.cupo });
    }
    if (!filas.length) return setError('No hay fechas en ese rango con los días seleccionados.');
    if (filas.length > 400) return setError('Máximo 400 fechas a la vez.');
    const { error } = await supabase.from('ga_salidas').upsert(filas, { onConflict: 'tour_id,fecha', ignoreDuplicates: true });
    if (error) return setError(error.message);
    setMsg(`Se agregaron hasta ${filas.length} fechas (las que ya existían no se tocaron).`);
    recargar();
  }

  async function actualizar(id: string, cambios: Partial<Salida>) {
    const { error } = await supabase.from('ga_salidas').update(cambios).eq('id', id);
    if (error) setError(error.message); else recargar();
  }

  async function borrar(s: Salida) {
    if (conReservas.has(s.id)) return alert('Esta salida tiene reservaciones; puedes cerrarla pero no borrarla.');
    const { error } = await supabase.from('ga_salidas').delete().eq('id', s.id);
    if (error) setError(error.message); else recargar();
  }

  return (
    <div className="card editor">
      <h3>Fechas de salida</h3>

      <form className="generador" onSubmit={generar}>
        <label>Desde<input type="date" required value={gen.desde} onChange={(e) => setGen({ ...gen, desde: e.target.value })} /></label>
        <label>Hasta<input type="date" required value={gen.hasta} min={gen.desde} onChange={(e) => setGen({ ...gen, hasta: e.target.value })} /></label>
        <label>Cupo<input type="number" min={1} required value={gen.cupo} onChange={(e) => setGen({ ...gen, cupo: Number(e.target.value) })} /></label>
        <fieldset className="dias">
          <legend>Días</legend>
          {DIAS.map((d, i) => (
            <label key={d} className={`dia ${gen.dias.includes(i) ? 'on' : ''}`}>
              <input type="checkbox" checked={gen.dias.includes(i)} onChange={(e) => setGen({ ...gen, dias: e.target.checked ? [...gen.dias, i] : gen.dias.filter((x) => x !== i) })} />
              {d}
            </label>
          ))}
        </fieldset>
        <button className="btn btn-sm"><CalendarPlus size={15} /> Agregar fechas</button>
      </form>
      {error && <p className="alert alert-error">{error}</p>}
      {msg && <p className="alert alert-ok">{msg}</p>}

      <div className="admin-title compact">
        <small className="muted">{lista.length} fechas</small>
        <label className="check"><input type="checkbox" checked={verPasadas} onChange={(e) => setVerPasadas(e.target.checked)} /> Mostrar pasadas</label>
      </div>
      <div className="table-wrap">
        <table className="salidas-table">
          <thead><tr><th>Fecha</th><th>Ocupación</th><th>Cupo</th><th>Precio especial</th><th>Estado</th><th /></tr></thead>
          <tbody>
            {lista.map((s) => {
              const oc = ocupados.get(s.id) ?? 0;
              return (
                <tr key={s.id} className={s.activo ? '' : 'is-off'}>
                  <td>{formatFecha(s.fecha, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</td>
                  <td>
                    <div className="meter"><span style={{ width: `${Math.min(100, (oc / s.cupo) * 100)}%` }} /></div>
                    <small>{oc} / {s.cupo}</small>
                  </td>
                  <td><input className="inline-num" type="number" min={Math.max(1, oc)} defaultValue={s.cupo} onBlur={(e) => Number(e.target.value) !== s.cupo && actualizar(s.id, { cupo: Number(e.target.value) })} /></td>
                  <td><input className="inline-num" type="number" min={0} step="0.01" placeholder="—" defaultValue={s.precio_q ?? ''} onBlur={(e) => { const v = e.target.value === '' ? null : Number(e.target.value); if (v !== s.precio_q) actualizar(s.id, { precio_q: v }); }} /></td>
                  <td>
                    <button className={`badge-btn ${s.activo ? 'badge-on' : 'badge-off'}`} onClick={() => actualizar(s.id, { activo: !s.activo })} title={s.activo ? 'Cerrar esta salida' : 'Abrir esta salida'}>
                      {s.activo ? 'Abierta' : 'Cerrada'}
                    </button>
                  </td>
                  <td><button className="icon-btn danger" title="Borrar fecha" onClick={() => borrar(s)} disabled={conReservas.has(s.id)}><Trash2 size={15} /></button></td>
                </tr>
              );
            })}
            {lista.length === 0 && <tr><td colSpan={6} className="center muted">Sin fechas. Usa el formulario de arriba para agregarlas.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
