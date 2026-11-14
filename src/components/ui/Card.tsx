import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

/**
 * Tarjeta base. Si `className` trae su propio fondo o color de borde, se omite
 * el del estilo base: en Tailwind dos clases del mismo tipo no se "pisan" por
 * orden en el atributo, sino por orden en el CSS generado.
 */
export function Card({ className = '', ...rest }: HTMLAttributes<HTMLDivElement>) {
  const customBg = /(^|\s)bg-/.test(className);
  const customRing = /(^|\s)ring-(?!1(\s|$)|inset|offset)/.test(className);
  return (
    <div
      className={cn(
        'rounded-2xl p-4 shadow-sm ring-1',
        !customBg && 'bg-white',
        !customRing && 'ring-slate-200/70',
        className,
      )}
      {...rest}
    />
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0 whitespace-nowrap">{action}</div>}
    </div>
  );
}
