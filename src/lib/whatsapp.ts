/**
 * Normaliza un teléfono cubano a formato internacional sin "+".
 * Acepta "+53 5 123 4567", "53512345 67", "51234567" (móvil de 8 dígitos)…
 * Devuelve null si no parece un número válido.
 */
export function normalizeCubanPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 8) return `53${digits}`; // número nacional
  if (digits.length === 10 && digits.startsWith('53')) return digits;
  if (digits.length >= 10 && digits.length <= 15) return digits; // otro país (p. ej. Zelle en EE. UU.)
  return null;
}

export function whatsappUrl(phone: string | null | undefined, message?: string): string | null {
  const number = normalizeCubanPhone(phone);
  if (!number) return null;
  const text = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${number}${text}`;
}
