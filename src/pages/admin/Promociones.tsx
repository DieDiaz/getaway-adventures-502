import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EyeOff, Eye, ImagePlus, Pencil, Plus, Send, Trash2 } from 'lucide-react';
import { asset, supabase, formatFecha } from '../../lib/supabase';
import { borrarImagen, subirImagen } from '../../lib/upload';
import type { Promocion } from '../../types';
import type { AdminProps } from './AdminApp';

type Borrador = Omit<Promocion, 'id' | 'created_at'> & { id?: string };
const NUEVA: Borrador = { titulo: '', descripcion: '', titulo_en: '', descripcion_en: '', imagen_url: null, codigo: '', descuento_pct: 10, tour_id: null, desde: null, hasta: null, activo: true };

export function estadoPromo(p: Promocion) {
  const hoy = new Date().toISOString().slice(0, 10);
  if (!p.activo) return { label: 'Pausada', cls: 'badge-off' };
  if (p.desde && p.desde > hoy) return { label: 'Programada', cls: 'badge-wait' };
  if (p.hasta && p.hasta < hoy) return { label: 'Vencida', cls: 'badge-off' };
  return { label: 'Vigente', cls: 'badge-on' };
}

export default function Promociones({ data, recargar }: AdminProps) {
  const { promos, tours } = data;
  const [editando, setEditando] = useState<Borrador | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const nombreTour = (id: string | null) => (id ? tours.find((t) => t.id === id)?.nombre ?? '—' : 'Todos los tours');

  async function toggle(p: Promocion) {
    const { error } = await supabase.from('ga_promociones').update({ activo: !p.activo }).eq('id', p.id);
    if (error) setError(error.message); else recargar();
  }

  async function eliminar(p: Promocion) {
    if (!confirm(`¿Eliminar la promoción "${p.titulo}"?`)) return;
    const { error } = await supabase.from('ga_promociones').delete().eq('id', p.id);
    if (error) return setError(error.message);
    if (p.imagen_url) await borrarImagen(p.imagen_url);
    recargar();
  }

  if (editando) return <EditorPromo inicial={editando} tours={tours} onCerrar={() => setEditando(null)} recargar={recargar} />;

  return (
    <div>
      <div className="admin-title">
        <div>
          <h2>Promociones</h2>
          <p className="muted">Las promociones vigentes aparecen en la página principal. Si tienen código, el cliente obtiene el descuento al reservar.</p>
        </div>
        <button className="btn btn-sm" onClick={() => setEditando(NUEVA)}><Plus size={16} /> Nueva promoción</button>
      </div>
      {error && <p className="alert alert-error">{error}</p>}

      {promos.length === 0 && <p className="muted card empty">Aún no hay promociones. Crea la primera.</p>}
      <div className="promo-grid">
        {promos.map((p) => {
          const est = estadoPromo(p);
          return (
            <article key={p.id} className="promo-admin card">
              <div className="promo-img" style={{ backgroundImage: p.imagen_url ? `url(${asset(p.imagen_url)})` : undefined }}>
                {p.descuento_pct > 0 && <span className="promo-pct">−{Number(p.descuento_pct)}%</span>}
              </div>
              <div className="promo-body">
                <div className="tour-name"><strong>{p.titulo}</strong><span className={`badge ${est.cls}`}>{est.label}</span></div>
                {p.codigo && <code className="promo-code">{p.codigo}</code>}
                <small className="muted">{nombreTour(p.tour_id)}</small>
                <small className="muted">
                  {p.desde ? `Desde ${formatFecha(p.desde)}` : 'Sin inicio'} · {p.hasta ? `hasta ${formatFecha(p.hasta)}` : 'sin vencimiento'}
                </small>
                <div className="tour-actions">
                  <button className="icon-btn" onClick={() => setEditando(p)}><Pencil size={16} /><span>Editar</span></button>
                  <button className="icon-btn" onClick={() => toggle(p)}>{p.activo ? <EyeOff size={16} /> : <Eye size={16} />}<span>{p.activo ? 'Pausar' : 'Activar'}</span></button>
                  <button className="icon-btn" onClick={() => navigate(`/admin/clientes?promo=${p.id}`)}><Send size={16} /><span>Enviar a clientes</span></button>
                  <button className="icon-btn danger" onClick={() => eliminar(p)}><Trash2 size={16} /><span>Eliminar</span></button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function EditorPromo({ inicial, tours, onCerrar, recargar }: {
  inicial: Borrador; tours: AdminProps['data']['tours']; onCerrar: () => void; recargar: () => Promise<void>;
}) {
  const [p, setP] = useState<Borrador>({ ...inicial, codigo: inicial.codigo ?? '' });
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const set = <K extends keyof Borrador>(k: K, v: Borrador[K]) => setP((x) => ({ ...x, [k]: v }));

  async function subir(files: FileList | null) {
    if (!files?.[0]) return;
    setSubiendo(true); setError(null);
    try { set('imagen_url', await subirImagen(files[0], 'promos')); }
    catch (e) { setError((e as Error).message); }
    finally { setSubiendo(false); }
  }

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setGuardando(true); setError(null);
    const fila = {
      titulo: p.titulo.trim(), descripcion: p.descripcion.trim(), imagen_url: p.imagen_url,
      titulo_en: p.titulo_en?.trim() || null, descripcion_en: p.descripcion_en?.trim() || null,
      codigo: p.codigo?.trim() ? p.codigo.trim().toUpperCase() : null, descuento_pct: Number(p.descuento_pct),
      tour_id: p.tour_id || null, desde: p.desde || null, hasta: p.hasta || null, activo: p.activo,
    };
    const { error } = p.id
      ? await supabase.from('ga_promociones').update(fila).eq('id', p.id)
      : await supabase.from('ga_promociones').insert(fila);
    setGuardando(false);
    if (error) {
      setError(error.code === '23505' ? 'Ese código ya está en uso por otra promoción.'
        : error.message.includes('codigo') ? 'El código solo puede tener letras, números, - y _ (3 a 30 caracteres).' : error.message);
      return;
    }
    await recargar();
    onCerrar();
  }

  return (
    <div>
      <div className="admin-title">
        <div>
          <button className="back" onClick={onCerrar}>← Volver a promociones</button>
          <h2>{p.id ? 'Editar promoción' : 'Nueva promoción'}</h2>
        </div>
      </div>
      <form className="editor card" onSubmit={guardar}>
        <div className="editor-grid">
          <label className="span-2">Título<input required maxLength={120} value={p.titulo} onChange={(e) => set('titulo', e.target.value)} placeholder="Black Friday en Acatenango" /></label>
          <label className="span-2">Descripción<textarea rows={3} value={p.descripcion} onChange={(e) => set('descripcion', e.target.value)} placeholder="Reserva este mes y obtén 15% de descuento…" /></label>
          <label className="span-2">Title (English) <small className="muted">(vacío = se usa el español)</small><input maxLength={120} value={p.titulo_en ?? ''} onChange={(e) => set('titulo_en', e.target.value)} placeholder="Black Friday on Acatenango" /></label>
          <label className="span-2">Description (English)<textarea rows={3} value={p.descripcion_en ?? ''} onChange={(e) => set('descripcion_en', e.target.value)} placeholder="Book this month and get 15% off…" /></label>
          <label>Código de descuento <small className="muted">(opcional)</small>
            <input value={p.codigo ?? ''} onChange={(e) => set('codigo', e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))} placeholder="ACATE15" maxLength={30} />
          </label>
          <label>Descuento (%)<input type="number" min={0} max={100} step="0.5" value={p.descuento_pct} onChange={(e) => set('descuento_pct', Number(e.target.value))} /></label>
          <label>Aplica a
            <select value={p.tour_id ?? ''} onChange={(e) => set('tour_id', e.target.value || null)}>
              <option value="">Todos los tours</option>
              {tours.map((t) => <option key={t.id} value={t.id}>{t.nombre}{t.activo ? '' : ' (de baja)'}</option>)}
            </select>
          </label>
          <label className="check"><input type="checkbox" checked={p.activo} onChange={(e) => set('activo', e.target.checked)} /> Activa</label>
          <label>Válida desde<input type="date" value={p.desde ?? ''} onChange={(e) => set('desde', e.target.value || null)} /></label>
          <label>Válida hasta<input type="date" value={p.hasta ?? ''} min={p.desde ?? undefined} onChange={(e) => set('hasta', e.target.value || null)} /></label>
        </div>

        <h3>Imagen</h3>
        <div className="foto-portada">
          {p.imagen_url ? <img src={asset(p.imagen_url)} alt="" /> : <div className="foto-vacia">Sin imagen</div>}
          <label className="btn btn-ghost btn-sm file-btn">
            <ImagePlus size={15} /> {p.imagen_url ? 'Cambiar imagen' : 'Subir imagen'}
            <input type="file" accept="image/*" hidden onChange={(e) => subir(e.target.files)} />
          </label>
        </div>
        {subiendo && <p className="muted">Subiendo imagen…</p>}
        {error && <p className="alert alert-error">{error}</p>}
        <div className="row-actions start">
          <button className="btn" disabled={guardando || subiendo}>{guardando ? 'Guardando…' : 'Guardar promoción'}</button>
          <button type="button" className="btn btn-ghost" onClick={onCerrar}>Cancelar</button>
        </div>
      </form>
    </div>
  );
}
