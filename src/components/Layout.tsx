import { Link, Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { INSTAGRAM_URL, LOGO, MAPS_URL, whatsappLink } from '../lib/supabase';
import { useLang, type Lang } from '../lib/i18n';

function LangSwitch() {
  const { lang, setLang, t } = useLang();
  const opciones: { code: Lang; label: string; title: string }[] = [
    { code: 'en', label: 'EN', title: 'English' },
    { code: 'es', label: 'ES', title: 'Español' },
  ];
  return (
    <div className="lang-switch" role="group" aria-label={t('nav.langLabel')}>
      {opciones.map((o) => (
        <button key={o.code} type="button" lang={o.code} title={o.title} aria-pressed={lang === o.code} onClick={() => setLang(o.code)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function Layout() {
  const { pathname } = useLocation();
  const { t } = useLang();
  const esAdmin = pathname.startsWith('/admin');
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
            <a href={`${import.meta.env.BASE_URL}#tours`}>{t('nav.tours')}</a>
            <a href={`${import.meta.env.BASE_URL}#como-funciona`}>{t('nav.howToBook')}</a>
            {!esAdmin && <LangSwitch />}
            <a href={whatsappLink(t('wa.info'))} target="_blank" rel="noreferrer" className="btn btn-sm">WhatsApp</a>
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
              <p>{t('footer.tagline')}</p>
              <p className="footer-small">Go explore · Live the story</p>
            </div>
          </div>
          <div className="footer-links">
            <a href={whatsappLink(t('wa.info'))} target="_blank" rel="noreferrer">WhatsApp +502 5633 3618</a>
            <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer">@getaway.adventures502</a>
            <a href={MAPS_URL} target="_blank" rel="noreferrer">{t('footer.agency')}</a>
            <Link to="/admin">{t('footer.admin')}</Link>
          </div>
        </div>
      </footer>
    </>
  );
}
