import { isCurrency, type Currency, type MovementKind } from '@/domain/currency';

export interface QuickPrefs {
  kind: MovementKind;
  currency: Currency;
  lastCategory: Partial<Record<MovementKind, string>>;
}

const KEY = 'negocioclaro:quick-entry';
const DEFAULTS: QuickPrefs = { kind: 'ingreso', currency: 'CUP', lastCategory: {} };

/** Preferencias del registro rápido en este dispositivo (comodidad, no datos críticos). */
export function loadQuickPrefs(
  storage: Pick<Storage, 'getItem'> | undefined = safeStorage(),
): QuickPrefs {
  try {
    const raw = storage?.getItem(KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<QuickPrefs>;
    return {
      kind: parsed.kind === 'gasto' ? 'gasto' : 'ingreso',
      currency: isCurrency(parsed.currency) ? parsed.currency : DEFAULTS.currency,
      lastCategory:
        typeof parsed.lastCategory === 'object' && parsed.lastCategory ? parsed.lastCategory : {},
    };
  } catch {
    return DEFAULTS;
  }
}

export function saveQuickPrefs(
  prefs: QuickPrefs,
  storage: Pick<Storage, 'setItem'> | undefined = safeStorage(),
) {
  try {
    storage?.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // Modo privado o almacenamiento lleno: no pasa nada.
  }
}

function safeStorage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}
