import { useQuery } from '@tanstack/react-query';
import { createContext, useContext, type ReactNode } from 'react';
import { ErrorState, LoadingBlock } from '@/components/ui/States';
import { fetchMyBusiness, type Membership } from '@/data/repositories/business';
import { queryKeys } from '@/data/queryKeys';

const BusinessContext = createContext<Membership | null>(null);

/** Carga el negocio del usuario y lo pone a disposición de toda la app. */
export function BusinessProvider({ children }: { children: ReactNode }) {
  const query = useQuery({ queryKey: queryKeys.business, queryFn: fetchMyBusiness });

  if (query.isPending) {
    return (
      <div className="mx-auto max-w-3xl p-4">
        <LoadingBlock rows={4} label="Cargando su negocio…" />
      </div>
    );
  }
  if (query.isError) {
    return (
      <div className="mx-auto max-w-3xl p-4">
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      </div>
    );
  }
  if (!query.data) {
    return (
      <div className="mx-auto max-w-3xl p-4">
        <ErrorState
          title="Su usuario no tiene un negocio asociado"
          error="Pida al dueño del negocio que le invite."
        />
      </div>
    );
  }

  return <BusinessContext.Provider value={query.data}>{children}</BusinessContext.Provider>;
}

export function useBusiness(): Membership {
  const ctx = useContext(BusinessContext);
  if (!ctx) throw new Error('useBusiness debe usarse dentro de <BusinessProvider>');
  return ctx;
}

export function useBusinessId(): string {
  return useBusiness().business.id;
}
