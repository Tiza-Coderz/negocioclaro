import type { IconName } from '@/components/ui/Icon';

export interface NavItem {
  to: string;
  label: string;
  icon: IconName;
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Inicio', icon: 'home' },
  { to: '/movimientos', label: 'Movimientos', icon: 'list' },
  { to: '/cuentas', label: 'Cuentas', icon: 'wallet' },
  { to: '/tasas', label: 'Tasas de cambio', icon: 'exchange' },
  { to: '/contactos', label: 'Clientes y proveedores', icon: 'users' },
  { to: '/nomina', label: 'Trabajadores y nómina', icon: 'briefcase' },
  { to: '/reportes', label: 'Reportes', icon: 'file' },
  { to: '/ajustes', label: 'Ajustes', icon: 'settings' },
];

/** Barra inferior en móvil: lo más usado + botón central de registro rápido. */
export const BOTTOM_NAV: (NavItem | 'quick')[] = [
  { to: '/', label: 'Inicio', icon: 'home' },
  { to: '/movimientos', label: 'Movimientos', icon: 'list' },
  'quick',
  { to: '/cuentas', label: 'Cuentas', icon: 'wallet' },
  { to: '/mas', label: 'Más', icon: 'menu' },
];
