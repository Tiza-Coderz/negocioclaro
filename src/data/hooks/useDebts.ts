import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useBusinessId } from '@/app/providers/BusinessProvider';
import { queryKeys } from '../queryKeys';
import {
  deleteDebt,
  fetchDebts,
  registerPayment,
  saveDebt,
  type DebtDraft,
  type DebtView,
} from '../repositories/debts';
import type { PaymentMethod } from '@/domain/currency';

export function useDebts() {
  const businessId = useBusinessId();
  return useQuery({ queryKey: queryKeys.debts(businessId), queryFn: () => fetchDebts(businessId) });
}

function useInvalidate() {
  const businessId = useBusinessId();
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: queryKeys.debts(businessId) }),
      qc.invalidateQueries({ queryKey: queryKeys.movements(businessId) }),
      qc.invalidateQueries({ queryKey: queryKeys.dashboard(businessId) }),
    ]);
}

export function useSaveDebt() {
  const businessId = useBusinessId();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ draft, id }: { draft: DebtDraft; id?: string }) =>
      saveDebt(businessId, draft, id),
    onSuccess: invalidate,
  });
}

export function useDeleteDebt() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: deleteDebt, onSuccess: invalidate });
}

export function useRegisterPayment() {
  const businessId = useBusinessId();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: {
      debt: DebtView;
      amountCents: number;
      date: string;
      method: PaymentMethod;
      categoryId: string | null;
    }) => registerPayment(businessId, input.debt, input),
    onSuccess: invalidate,
  });
}
