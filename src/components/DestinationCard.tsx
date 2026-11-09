import * as React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { asset } from '../lib/supabase';

interface DestinationCardProps extends React.HTMLAttributes<HTMLDivElement> {
  imageUrl?: string | null;
  location: string;
  flag?: string;
  stats: string;
  href: string;
  /** Color HSL sin "hsl()", ej. "150 50% 25%" */
  themeColor: string;
  /** Fondo cuando no hay imagen */
  fallback?: string;
  cta?: string;
  badge?: string;
}

export const DestinationCard = React.forwardRef<HTMLDivElement, DestinationCardProps>(
  ({ className = '', imageUrl, location, flag, stats, href, themeColor, fallback, cta = 'Reservar ahora', badge, style, ...props }, ref) => (
    <div
      ref={ref}
      className={`dcard ${className}`}
      style={{ '--theme-color': themeColor, ...style } as React.CSSProperties}
      {...props}
    >
      <Link to={href} className="dcard-link" aria-label={`Ver detalles de ${location}`}>
        <div
          className="dcard-bg"
          style={{ backgroundImage: [imageUrl && `url(${asset(imageUrl)})`, fallback].filter(Boolean).join(', ') }}
        />
        <div className="dcard-overlay" />
        {badge && <span className="dcard-badge">{badge}</span>}

        <div className="dcard-content">
          <h3>
            {location} {flag && <span className="dcard-flag">{flag}</span>}
          </h3>
          <p>{stats}</p>
          <div className="dcard-cta">
            <span>{cta}</span>
            <ArrowRight size={16} className="dcard-arrow" />
          </div>
        </div>
      </Link>
    </div>
  ),
);
DestinationCard.displayName = 'DestinationCard';
