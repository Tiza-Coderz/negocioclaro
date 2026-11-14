// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('App', () => {
  it('muestra el nombre del producto', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'NegocioClaro' })).toBeInTheDocument();
  });
});
