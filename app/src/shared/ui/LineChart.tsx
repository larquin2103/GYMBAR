export interface LinePoint {
  label: string;
  value: number;
}

/**
 * Gráfico de línea SVG minimalista para mostrar evolución (ej. peso en el
 * tiempo). Sin dependencias externas; escala automática al rango de datos.
 */
export function LineChart({
  points,
  unit = '',
  height = 160,
}: {
  points: LinePoint[];
  unit?: string;
  height?: number;
}) {
  if (points.length < 2) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-content-muted">
        Se necesitan al menos 2 registros para ver la evolución.
      </div>
    );
  }

  const w = 100; // viewBox width (se estira con preserveAspectRatio)
  const h = 40;
  const pad = 4;
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const x = (i: number) => pad + (i / (points.length - 1)) * (w - pad * 2);
  const y = (v: number) => h - pad - ((v - min) / range) * (h - pad * 2);

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(p.value)}`).join(' ');
  const area = `${path} L ${x(points.length - 1)} ${h - pad} L ${x(0)} ${h - pad} Z`;

  const first = points[0]!.value;
  const last = points[points.length - 1]!.value;
  const delta = Math.round((last - first) * 10) / 10;

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-metric tabular text-content">
          {last}
          {unit && <span className="ml-1 text-base font-medium text-content-muted">{unit}</span>}
        </span>
        <span
          className={`tabular text-sm font-medium ${delta < 0 ? 'text-state-active' : delta > 0 ? 'text-state-frozen' : 'text-content-muted'}`}
        >
          {delta > 0 ? '+' : ''}
          {delta} {unit} en total
        </span>
      </div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        style={{ height, width: '100%' }}
        role="img"
        aria-label="Gráfico de evolución"
      >
        <path d={area} fill="rgb(var(--color-primary))" opacity="0.08" />
        <path
          d={path}
          fill="none"
          stroke="rgb(var(--color-primary))"
          strokeWidth="0.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {points.map((p, i) => (
          <circle key={i} cx={x(i)} cy={y(p.value)} r="0.9" fill="rgb(var(--color-primary))" />
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-xs text-content-muted">
        <span>{points[0]!.label}</span>
        <span>{points[points.length - 1]!.label}</span>
      </div>
    </div>
  );
}
