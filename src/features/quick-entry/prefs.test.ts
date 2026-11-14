import { describe, expect, it } from 'vitest';
import { loadQuickPrefs, saveQuickPrefs } from './prefs';

function memoryStorage(initial?: string) {
  let value: string | null = initial ?? null;
  return {
    getItem: () => value,
    setItem: (_k: string, v: string) => {
      value = v;
    },
  };
}

describe('preferencias del registro rápido', () => {
  it('sin datos usa ingreso en CUP', () => {
    expect(loadQuickPrefs(memoryStorage())).toEqual({
      kind: 'ingreso',
      currency: 'CUP',
      lastCategory: {},
    });
  });

  it('guarda y recupera', () => {
    const s = memoryStorage();
    saveQuickPrefs({ kind: 'gasto', currency: 'USD', lastCategory: { gasto: 'c1' } }, s);
    expect(loadQuickPrefs(s)).toEqual({
      kind: 'gasto',
      currency: 'USD',
      lastCategory: { gasto: 'c1' },
    });
  });

  it('ignora datos corruptos o inválidos', () => {
    expect(loadQuickPrefs(memoryStorage('{no es json')).currency).toBe('CUP');
    expect(loadQuickPrefs(memoryStorage('{"currency":"BTC","kind":"x"}'))).toEqual({
      kind: 'ingreso',
      currency: 'CUP',
      lastCategory: {},
    });
  });

  it('si el almacenamiento falla no rompe', () => {
    const throwing = {
      getItem: () => {
        throw new Error('bloqueado');
      },
      setItem: () => {
        throw new Error('lleno');
      },
    };
    expect(loadQuickPrefs(throwing).kind).toBe('ingreso');
    expect(() =>
      saveQuickPrefs({ kind: 'gasto', currency: 'USD', lastCategory: {} }, throwing),
    ).not.toThrow();
  });
});
