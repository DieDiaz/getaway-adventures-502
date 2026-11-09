import { useState } from 'react';
import './charts.css';

export interface Punto {
  label: string;
  value: number;
  /** Texto extra para el tooltip (p. ej. "5 reservaciones") */
  detalle?: string;
}

interface Props {
  data: Punto[];
  formato: (n: number) => string;
  /** vertical = columnas (series de tiempo), horizontal = ranking por categoría */
  orientacion?: 'vertical' | 'horizontal';
  alto?: number;
  titulo: string;
  vacio?: string;
}

/** Barras de una sola serie con tooltip al pasar el mouse y vista de tabla accesible. */
export default function BarChart({ data, formato, orientacion = 'vertical', alto = 220, titulo, vacio = 'Sin datos en este periodo' }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const [tabla, setTabla] = useState(false);
  const max = Math.max(...data.map((d) => d.value), 0);
  const ticks = max > 0 ? [0, 0.5, 1].map((f) => f * max) : [];

  return (
    <figure className="viz">
      <figcaption className="viz-head">
        <span className="viz-title">{titulo}</span>
        {data.length > 0 && (
          <button type="button" className="viz-toggle" onClick={() => setTabla((t) => !t)}>
            {tabla ? 'Ver gráfica' : 'Ver tabla'}
          </button>
        )}
      </figcaption>

      {data.length === 0 || max === 0 ? (
        <p className="viz-empty">{vacio}</p>
      ) : tabla ? (
        <table className="viz-table">
          <tbody>
            {data.map((d) => (
              <tr key={d.label}><th scope="row">{d.label}</th><td>{formato(d.value)}</td><td className="muted">{d.detalle}</td></tr>
            ))}
          </tbody>
        </table>
      ) : orientacion === 'vertical' ? (
        <div className="viz-v" style={{ height: alto }}>
          <div className="viz-grid" aria-hidden>
            {ticks.slice().reverse().map((t) => (
              <div key={t} className="viz-gridline"><span>{formato(t)}</span></div>
            ))}
          </div>
          <div className="viz-cols" role="list">
            {data.map((d, i) => (
              <div
                key={d.label}
                role="listitem"
                className={`viz-col ${hover === i ? 'is-hover' : ''}`}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                aria-label={`${d.label}: ${formato(d.value)}`}
                tabIndex={0}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
              >
                <div className="viz-bar" style={{ height: `${(d.value / max) * 100}%` }} />
                {hover === i && (
                  <div className="viz-tip" role="tooltip">
                    <strong>{formato(d.value)}</strong>
                    <span>{d.label}</span>
                    {d.detalle && <span className="muted">{d.detalle}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="viz-xlabels" aria-hidden>
            {data.map((d, i) => (
              <span key={d.label} className={i % Math.ceil(data.length / 8) === 0 ? '' : 'is-hidden'}>{d.label}</span>
            ))}
          </div>
        </div>
      ) : (
        <ul className="viz-h">
          {data.map((d, i) => (
            <li
              key={d.label}
              className={hover === i ? 'is-hover' : ''}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              <span className="viz-h-label">{d.label}</span>
              <span className="viz-h-track">
                <span className="viz-h-bar" style={{ width: `${(d.value / max) * 100}%` }} />
              </span>
              <span className="viz-h-value">{formato(d.value)}</span>
              {hover === i && d.detalle && <span className="viz-tip viz-tip-h" role="tooltip">{d.detalle}</span>}
            </li>
          ))}
        </ul>
      )}
    </figure>
  );
}
