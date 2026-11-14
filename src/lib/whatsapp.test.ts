import { describe, expect, it } from 'vitest';
import { normalizeCubanPhone, whatsappUrl } from './whatsapp';

describe('normalizeCubanPhone', () => {
  it.each([
    ['51234567', '5351234567'],
    ['+53 5 123 4567', '5351234567'],
    ['53-51234567', '5351234567'],
    ['+1 (305) 555-0101', '13055550101'],
  ])('%s → %s', (input, expected) => {
    expect(normalizeCubanPhone(input)).toBe(expected);
  });

  it.each([null, undefined, '', '123', 'abc'])('rechaza %s', (input) => {
    expect(normalizeCubanPhone(input)).toBeNull();
  });
});

describe('whatsappUrl', () => {
  it('codifica el mensaje', () => {
    expect(whatsappUrl('51234567', 'Hola, ¿cómo está?')).toBe(
      'https://wa.me/5351234567?text=Hola%2C%20%C2%BFc%C3%B3mo%20est%C3%A1%3F',
    );
  });

  it('sin teléfono válido no genera enlace', () => {
    expect(whatsappUrl('12')).toBeNull();
  });
});
