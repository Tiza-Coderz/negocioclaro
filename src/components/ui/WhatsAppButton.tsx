import { cn } from './cn';
import { whatsappUrl } from '@/lib/whatsapp';

export function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn('size-5', className)} fill="currentColor" aria-hidden>
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.9-4.45 9.9-9.91A9.86 9.86 0 0 0 12.04 2Zm5.8 14.06c-.24.68-1.42 1.3-1.96 1.35-.5.05-1.13.07-1.82-.11a16.7 16.7 0 0 1-1.65-.61c-2.9-1.25-4.8-4.17-4.94-4.36-.14-.2-1.18-1.57-1.18-3s.75-2.13 1.02-2.42a1.07 1.07 0 0 1 .78-.36h.56c.18 0 .42-.07.66.5.24.58.82 2 .89 2.15.07.14.12.31.02.5-.1.2-.14.31-.29.48l-.43.5c-.14.14-.29.3-.12.59.17.29.74 1.22 1.6 1.98 1.1.98 2.02 1.28 2.31 1.42.29.15.46.12.63-.07.17-.2.72-.84.92-1.13.19-.29.38-.24.65-.14.26.1 1.68.79 1.97.93.29.15.48.22.55.34.07.12.07.7-.17 1.38Z" />
    </svg>
  );
}

/**
 * Enlace a WhatsApp (wa.me). Es un <a> y no un <button> porque navega:
 * así funciona aunque JavaScript falle y se puede abrir en otra pestaña.
 */
export function WhatsAppButton({
  phone,
  message,
  label = 'WhatsApp',
  size = 'md',
  iconOnly = false,
  className,
}: {
  phone: string | null | undefined;
  message?: string;
  label?: string;
  size?: 'sm' | 'md';
  iconOnly?: boolean;
  className?: string;
}) {
  const href = whatsappUrl(phone, message);
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={iconOnly ? `${label} (abre WhatsApp)` : undefined}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl bg-[#1f9e55] font-semibold text-white shadow-sm hover:bg-[#1a8a4a]',
        size === 'sm' ? 'h-9 px-3 text-sm' : 'h-11 px-4 text-sm',
        iconOnly && (size === 'sm' ? 'w-9 px-0' : 'w-11 px-0'),
        className,
      )}
    >
      <WhatsAppIcon />
      {!iconOnly && label}
    </a>
  );
}
