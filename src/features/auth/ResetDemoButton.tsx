import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { humanizeError } from '@/components/ui/States';
import { resetDemoPublic } from '@/data/repositories/demo';

/**
 * "Restablecer demo": borra lo que hayan cambiado los visitantes y vuelve a
 * sembrar los 6 meses de datos. Funciona sin sesión (RPC pública limitada a
 * 1 vez por minuto y solo sobre el negocio demo).
 */
export function ResetDemoButton() {
  const queryClient = useQueryClient();
  const [done, setDone] = useState(false);
  const mutation = useMutation({
    mutationFn: resetDemoPublic,
    onSuccess: async () => {
      setDone(true);
      await queryClient.invalidateQueries();
    },
  });

  return (
    <div className="text-center">
      <Button
        variant="ghost"
        size="sm"
        icon={<Icon name="refresh" className="size-4" />}
        loading={mutation.isPending}
        onClick={() => {
          if (window.confirm('¿Restablecer todos los datos de la demo? Se perderán los cambios.')) {
            setDone(false);
            mutation.mutate();
          }
        }}
      >
        Restablecer demo
      </Button>
      <p aria-live="polite" className="mt-1 text-xs">
        {done && <span className="text-emerald-700">Datos de la demo restablecidos.</span>}
        {mutation.isError && <span className="text-red-700">{humanizeError(mutation.error)}</span>}
      </p>
    </div>
  );
}
