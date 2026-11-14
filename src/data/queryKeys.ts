/** Claves de TanStack Query centralizadas para invalidar con precisión. */
export const queryKeys = {
  business: ['business'] as const,
  rates: (businessId: string) => ['rates', businessId] as const,
  movements: (businessId: string, filters?: object) =>
    filters ? (['movements', businessId, filters] as const) : (['movements', businessId] as const),
  categories: (businessId: string) => ['categories', businessId] as const,
  clients: (businessId: string) => ['clients', businessId] as const,
  suppliers: (businessId: string) => ['suppliers', businessId] as const,
  debts: (businessId: string) => ['debts', businessId] as const,
  workers: (businessId: string) => ['workers', businessId] as const,
  payroll: (businessId: string) => ['payroll', businessId] as const,
  dashboard: (businessId: string) => ['dashboard', businessId] as const,
};
