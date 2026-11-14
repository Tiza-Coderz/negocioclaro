import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';
import { useBusinessId } from '@/app/providers/BusinessProvider';
import { queryKeys } from '../queryKeys';
import {
  deleteRate,
  fetchRates,
  saveRate,
  toRateTable,
  type ForeignCurrency,
} from '../repositories/rates';

export function useRates() {
  const businessId = useBusinessId();
  const query = useQuery({
    queryKey: queryKeys.rates(businessId),
    queryFn: () => fetchRates(businessId),
    staleTime: 5 * 60_000,
  });
  const table = useMemo(() => toRateTable(query.data ?? []), [query.data]);
  return { ...query, table };
}

/** Guardar/borrar una tasa reconsolida movimientos en la BD: refrescamos todo lo dependiente. */
function useInvalidateAfterRateChange() {
  const businessId = useBusinessId();
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: queryKeys.rates(businessId) }),
      qc.invalidateQueries({ queryKey: queryKeys.movements(businessId) }),
      qc.invalidateQueries({ queryKey: queryKeys.dashboard(businessId) }),
    ]);
}

export function useSaveRate() {
  const businessId = useBusinessId();
  const { session } = useAuth();
  const invalidate = useInvalidateAfterRateChange();
  return useMutation({
    mutationFn: (input: {
      date: string;
      currency: ForeignCurrency;
      cupPerUnit: number;
      note?: string;
    }) => saveRate({ ...input, businessId, userId: session?.user.id ?? null }),
    onSuccess: invalidate,
  });
}

export function useDeleteRate() {
  const invalidate = useInvalidateAfterRateChange();
  return useMutation({ mutationFn: deleteRate, onSuccess: invalidate });
}
