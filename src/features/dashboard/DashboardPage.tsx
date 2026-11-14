import { useBusiness } from '@/app/providers/BusinessProvider';
import { EmptyState } from '@/components/ui/States';

/** Provisional: el dashboard con KPI y gráficos llega en su propio PR. */
export default function DashboardPage() {
  const { business } = useBusiness();
  return (
    <EmptyState
      icon="📊"
      title={`Bienvenido a ${business.name}`}
      description="Aquí verá la ganancia del mes, los gastos por categoría y el flujo de caja."
    />
  );
}
