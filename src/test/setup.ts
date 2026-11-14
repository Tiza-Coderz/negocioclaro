import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';

// Con `globals: false` Testing Library no limpia el DOM sola entre tests.
afterEach(async () => {
  if (typeof document === 'undefined') return;
  const { cleanup } = await import('@testing-library/react');
  cleanup();
});
