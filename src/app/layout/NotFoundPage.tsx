import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/ui/States';

export function NotFoundPage() {
  return (
    <EmptyState
      icon="🧭"
      title="Esta página no existe"
      description="Puede que el enlace esté mal escrito o que la página se haya movido."
      action={
        <Link to="/" className="text-brand-700 font-semibold underline">
          Volver al inicio
        </Link>
      }
    />
  );
}
