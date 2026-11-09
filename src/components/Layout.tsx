import { Link, Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { INSTAGRAM_URL, LOGO, MAPS_URL, whatsappLink } from '../lib/supabase';

export default function Layout() {
  const { pathname } = useLocation();
  useEffect(() => {
    if (!window.location.hash) window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <>
      <header className="nav">
        <div className="container nav-inner">
          <Link to="/" className="brand">
            <img src={LOGO} alt="" width={38} height={38} className="brand-logo" />
            <span>Getaway <b>Adventures</b></span>
          </Link>
          <nav className="nav-links">
            <a href={`${import.meta.env.BASE_URL}#tours`}>Tours</a>
            <a href={`${import.meta.env.BASE_URL}#como-funciona`}>Cómo reservar</a>
            <a href={whatsappLink('¡Hola! Quiero información sobre sus tours.')} target="_blank" rel="noreferrer" className="btn btn-sm">WhatsApp</a>
          </nav>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
      <footer className="footer">
        <div className="container footer-inner">
          <div className="footer-brand">
            <img src={LOGO} alt="Getaway Adventures" width={56} height={56} className="brand-logo" />
            <div>
              <strong>Getaway Adventures 502</strong>
              <p>Tours y aventuras desde Antigua Guatemala 🇬🇹</p>
              <p className="footer-small">Go explore · Live the story</p>
            </div>
          </div>
          <div className="footer-links">
            <a href={whatsappLink('¡Hola! Quiero información sobre sus tours.')} target="_blank" rel="noreferrer">WhatsApp +502 5633 3618</a>
            <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer">@getaway.adventures502</a>
            <a href={MAPS_URL} target="_blank" rel="noreferrer">📍 Agencia en Antigua Guatemala</a>
            <Link to="/admin">Acceso agencia</Link>
          </div>
        </div>
      </footer>
    </>
  );
}
