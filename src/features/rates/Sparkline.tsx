/** Mini gráfico de línea en SVG puro (no carga Recharts en esta pantalla). */
export function Sparkline({ values, className }: { values: number[]; className?: string }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values
    .map((v, i) => `${(i / (values.length - 1)) * 100},${30 - ((v - min) / span) * 28 - 1}`)
    .join(' ');
  return (
    <svg
      viewBox="0 0 100 30"
      preserveAspectRatio="none"
      className={className}
      role="img"
      aria-label={`Tendencia de los últimos ${values.length} registros: de ${values[0]} a ${values.at(-1)} CUP`}
    >
      <polyline
        points={points}
        fill="none"
        stroke="var(--color-brand-500)"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
