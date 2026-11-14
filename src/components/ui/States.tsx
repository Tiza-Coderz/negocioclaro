import type { ReactNode } from 'react';
import { Button } from './Button';
import { cn } from './cn';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg bg-slate-200', className)} aria-hidden />;
}

/** Bloque de carga accesible con texto para lectores de pantalla. */
export function LoadingBlock({ rows = 3, label = 'Cargando…' }: { rows?: number; label?: string }) {
  return (
    <div role="status" aria-live="polite" className="space-y-3">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon = '📭',
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-300 px-6 py-10 text-center">
      <div className="text-3xl" aria-hidden>
        {icon}
      </div>
      <p className="font-semibold text-slate-800">{title}</p>
      {description && <p className="max-w-sm text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/** Mensaje de error con reintento. Pensado para conexiones inestables. */
export function ErrorState({
  error,
  onRetry,
  title = 'No pudimos cargar la información',
}: {
  error?: unknown;
  onRetry?: () => void;
  title?: string;
}) {
  const offline = typeof navigator !== 'undefined' && !navigator.onLine;
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-2 rounded-2xl bg-red-50 px-6 py-8 text-center ring-1 ring-red-200"
    >
      <div className="text-3xl" aria-hidden>
        {offline ? '📡' : '⚠️'}
      </div>
      <p className="font-semibold text-red-900">{offline ? 'Está sin conexión' : title}</p>
      <p className="max-w-sm text-sm text-red-800">
        {offline
          ? 'Revise sus datos móviles o el wifi. Lo que ya cargó sigue disponible.'
          : humanizeError(error)}
      </p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry} className="mt-2">
          Reintentar
        </Button>
      )}
    </div>
  );
}

export function humanizeError(error: unknown): string {
  const msg = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  if (/Failed to fetch|NetworkError|network/i.test(msg))
    return 'La conexión falló. Compruebe su internet e inténtelo de nuevo.';
  if (/JWT|not authenticated|401/i.test(msg)) return 'Su sesión expiró. Vuelva a iniciar sesión.';
  if (/row-level security|permission|403/i.test(msg))
    return 'No tiene permiso para realizar esta acción.';
  if (/duplicate key|unique/i.test(msg)) return 'Ya existe un registro con esos datos.';
  return msg || 'Ocurrió un error inesperado. Inténtelo de nuevo.';
}
