// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// Sin sesión: la app debe llevar al login y mostrar las credenciales demo.
vi.mock('@/data/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } } }),
    },
  },
  unwrap: <T,>(r: { data: T }) => r.data,
}));
vi.mock('@/lib/env', () => ({
  env: {
    supabaseUrl: 'http://localhost',
    supabaseAnonKey: 'x',
    demoMode: true,
    demoEmail: 'admin@demo.cu',
    demoPassword: 'demo1234',
    contactWhatsapp: '5351234567',
  },
}));

describe('App', () => {
  it('sin sesión muestra el login con las credenciales demo', async () => {
    const { App } = await import('./App');
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument();
    expect(screen.getByText('admin@demo.cu')).toBeInTheDocument();
    expect(screen.getByText('demo1234')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Restablecer demo/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /WhatsApp/ })).toHaveAttribute(
      'href',
      expect.stringContaining('https://wa.me/5351234567'),
    );
  });
});
