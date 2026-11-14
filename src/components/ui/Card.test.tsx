// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Card } from './Card';

describe('Card', () => {
  it('usa fondo blanco y borde gris por defecto', () => {
    render(<Card>x</Card>);
    expect(screen.getByText('x').className).toMatch(/bg-white/);
    expect(screen.getByText('x').className).toMatch(/ring-slate-200/);
  });

  it('un fondo propio reemplaza al blanco (no compiten en el CSS)', () => {
    render(<Card className="bg-brand-700 text-white">x</Card>);
    expect(screen.getByText('x').className).not.toMatch(/bg-white/);
  });

  it('un color de borde propio reemplaza al gris', () => {
    render(<Card className="ring-red-200">x</Card>);
    expect(screen.getByText('x').className).not.toMatch(/ring-slate-200/);
    expect(screen.getByText('x').className).toMatch(/ring-1/);
  });
});
