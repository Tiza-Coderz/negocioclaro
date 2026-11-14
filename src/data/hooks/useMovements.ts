import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useBusinessId } from '@/app/providers/BusinessProvider';
import { queryKeys } from '../queryKeys';
import {
  createMovement,
  deleteMovement,
  fetchMovements,
  updateMovement,
  uploadAttachment,
  type MovementDraft,
  type MovementFilters,
} from '../repositories/movements';

export function useMovements(filters: MovementFilters) {
  const businessId = useBusinessId();
  return useQuery({
    queryKey: queryKeys.movements(businessId, filters),
    queryFn: () => fetchMovements(businessId, filters),
    placeholderData: (prev) => prev,
  });
}

function useInvalidateMovements() {
  const businessId = useBusinessId();
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: queryKeys.movements(businessId) }),
      qc.invalidateQueries({ queryKey: queryKeys.dashboard(businessId) }),
      qc.invalidateQueries({ queryKey: queryKeys.debts(businessId) }),
    ]);
}

export interface SaveMovementInput {
  id?: string;
  draft: MovementDraft;
  /** Foto nueva ya comprimida (opcional). */
  photo?: Blob | null;
}

export function useSaveMovement() {
  const businessId = useBusinessId();
  const invalidate = useInvalidateMovements();
  return useMutation({
    mutationFn: async ({ id, draft, photo }: SaveMovementInput) => {
      const attachmentPath = photo
        ? await uploadAttachment(businessId, photo)
        : draft.attachmentPath;
      const final = { ...draft, attachmentPath: attachmentPath ?? null };
      if (id) await updateMovement(businessId, id, final);
      else await createMovement(businessId, final);
    },
    onSuccess: invalidate,
  });
}

export function useDeleteMovement() {
  const invalidate = useInvalidateMovements();
  return useMutation({
    mutationFn: ({ id, attachmentPath }: { id: string; attachmentPath: string | null }) =>
      deleteMovement(id, attachmentPath),
    onSuccess: invalidate,
  });
}
