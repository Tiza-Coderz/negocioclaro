import { useQuery } from '@tanstack/react-query';
import { useBusinessId } from '@/app/providers/BusinessProvider';
import { queryKeys } from '../queryKeys';
import { fetchCategories, fetchClients, fetchSuppliers } from '../repositories/catalogs';

// Los catálogos cambian poco: los mantenemos frescos 10 minutos.
const STALE = 10 * 60_000;

export function useCategories() {
  const businessId = useBusinessId();
  return useQuery({
    queryKey: queryKeys.categories(businessId),
    queryFn: () => fetchCategories(businessId),
    staleTime: STALE,
  });
}

export function useClients() {
  const businessId = useBusinessId();
  return useQuery({
    queryKey: queryKeys.clients(businessId),
    queryFn: () => fetchClients(businessId),
    staleTime: STALE,
  });
}

export function useSuppliers() {
  const businessId = useBusinessId();
  return useQuery({
    queryKey: queryKeys.suppliers(businessId),
    queryFn: () => fetchSuppliers(businessId),
    staleTime: STALE,
  });
}
