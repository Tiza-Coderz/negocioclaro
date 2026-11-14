import { useQuery } from '@tanstack/react-query';
import { useBusinessId } from '@/app/providers/BusinessProvider';
import { queryKeys } from '@/data/queryKeys';
import { fetchMovements } from '@/data/repositories/movements';
import { lastMonths, monthRange, type YearMonth } from '@/domain/dates';

/** Movimientos de los 6 meses que terminan en `month` (una sola consulta ligera). */
export function useDashboardData(month: YearMonth) {
  const businessId = useBusinessId();
  const months = lastMonths(month, 6);
  const from = monthRange(months[0] ?? month).from;
  const to = monthRange(month).to;
  const query = useQuery({
    queryKey: [...queryKeys.dashboard(businessId), from, to],
    queryFn: () => fetchMovements(businessId, { from, to }),
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });
  return { ...query, months };
}
