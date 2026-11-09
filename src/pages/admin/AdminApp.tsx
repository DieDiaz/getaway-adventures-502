import { FormEvent, useCallback, useEffect, useState } from 'react';
import { NavLink, useParams } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { BarChart3, CalendarCheck, Map, Megaphone, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Cliente, Promocion, Reservacion, Salida, Tour } from '../../types';
import Dashboard from './Dashboard';
import Reservaciones from './Reservaciones';
import Tours from './Tours';
import Promociones from './Promociones';
import Clientes from './Clientes';
import './admin.css';

export interface AdminData {
  reservas: Reservacion[];
  tours: Tour[];
  salidas: Salida[];
  promos: Promocion[];
  clientes: Cliente[];
}

export interface AdminProps {
  data: AdminData;
  recargar: () => Promise<void>;
  setReservas: (fn: (r: Reservacion[]) => Reservacion[]) => void;
}

const SECCIONES = [
  { id: 'dashboard', label: 'Dashboard', Icon: BarChart3 },
  { id: 'reservaciones', label: 'Reservaciones', Icon: CalendarCheck },
  { id: 'tours', label: 'Tours y salidas', Icon: Map },
  { id: 'promociones', label: 'Promociones', Icon: Megaphone },
  { id: 'clientes', label: 'Clientes', Icon: Users },
] as const;

export default function AdminApp() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [esAdmin, setEsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setEsAdmin(null);
      return;
    }
    supabase.rpc('ga_es_admin').then(({ data }) => setEsAdmin(Boolean(data)));
  }, [session]);

  if (session === undefined) return <Cargando />;
  if (!session) return <Login />;
  if (esAdmin === null) return <Cargando />;
  if (!esAdmin)
    return (
      <div className="container section center">
        <h2>Sin acceso</h2>
        <p className="muted">La cuenta {session.user.email} no es administradora de la agencia.</p>
        <button className="btn btn-ghost" onClick={() => supabase.auth.signOut()}>Cerrar sesión</button>
      </div>
    );
  return <Panel email={session.user.email ?? ''} />;
}

function Cargando() {
  return <div className="container section"><div className="card skeleton tall" /></div>;
}

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function entrar(e: FormEvent) {
    e.preventDefault();
    setCargando(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setCargando(false);
    if (error) setError('Correo o contraseña incorrectos.');
  }

  return (
    <div className="container section">
      <form className="card login" onSubmit={entrar}>
        <h2>Acceso agencia</h2>
        <label>Correo<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" /></label>
        <label>Contraseña<input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /></label>
        {error && <p className="alert alert-error">{error}</p>}
        <button className="btn btn-block" disabled={cargando}>{cargando ? 'Entrando…' : 'Entrar'}</button>
      </form>
    </div>
  );
}

function Panel({ email }: { email: string }) {
  const { tab = 'dashboard' } = useParams();
  const [data, setData] = useState<AdminData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recargar = useCallback(async () => {
    const [r, t, s, p, c] = await Promise.all([
      supabase.from('ga_reservaciones').select('*, ga_salidas(fecha, tour_id, ga_tours(nombre))').order('created_at', { ascending: false }).limit(5000),
      supabase.from('ga_tours').select('*').order('orden'),
      supabase.from('ga_salidas').select('*').order('fecha'),
      supabase.from('ga_promociones').select('*').order('created_at', { ascending: false }),
      supabase.from('ga_clientes').select('*').order('ultima_reserva', { ascending: false }),
    ]);
    const err = r.error ?? t.error ?? s.error ?? p.error ?? c.error;
    if (err) {
      setError(err.message);
      return;
    }
    setError(null);
    setData({
      reservas: r.data as unknown as Reservacion[],
      tours: t.data as Tour[],
      salidas: s.data as Salida[],
      promos: p.data as Promocion[],
      clientes: c.data as Cliente[],
    });
  }, []);

  useEffect(() => { recargar(); }, [recargar]);

  const setReservas = (fn: (r: Reservacion[]) => Reservacion[]) =>
    setData((d) => (d ? { ...d, reservas: fn(d.reservas) } : d));

  const props = data ? { data, recargar, setReservas } : null;

  return (
    <div className="admin">
      <aside className="admin-side">
        <nav>
          {SECCIONES.map(({ id, label, Icon }) => (
            <NavLink key={id} to={`/admin/${id}`} className={() => `admin-tab ${tab === id ? 'active' : ''}`}>
              <Icon size={18} aria-hidden />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="admin-user">
          <small className="muted">{email}</small>
          <button className="btn btn-ghost btn-sm" onClick={() => supabase.auth.signOut()}>Salir</button>
        </div>
      </aside>

      <section className="admin-main">
        {error && <p className="alert alert-error">{error}</p>}
        {!props ? (
          <div className="card skeleton tall" />
        ) : tab === 'reservaciones' ? (
          <Reservaciones {...props} />
        ) : tab === 'tours' ? (
          <Tours {...props} />
        ) : tab === 'promociones' ? (
          <Promociones {...props} />
        ) : tab === 'clientes' ? (
          <Clientes {...props} />
        ) : (
          <Dashboard {...props} />
        )}
      </section>
    </div>
  );
}
