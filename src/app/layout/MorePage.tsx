import { Link } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { PageHeader } from '@/components/ui/PageHeader';
import { useAuth } from '../providers/AuthProvider';
import { useBusiness } from '../providers/BusinessProvider';
import { NAV_ITEMS } from './nav';

/** Menú "Más" del móvil: el resto de secciones que no caben en la barra inferior. */
export default function MorePage() {
  const { business } = useBusiness();
  const { signOut } = useAuth();
  const items = NAV_ITEMS.filter((i) => !['/', '/movimientos', '/cuentas'].includes(i.to));

  return (
    <>
      <PageHeader title="Más opciones" subtitle={business.name} />
      <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
        {items.map((item) => (
          <li key={item.to}>
            <Link
              to={item.to}
              className="flex items-center gap-3 px-4 py-4 text-slate-800 hover:bg-slate-50"
            >
              <Icon name={item.icon} className="text-brand-600" />
              <span className="flex-1 font-medium">{item.label}</span>
              <span aria-hidden className="text-slate-400">
                ›
              </span>
            </Link>
          </li>
        ))}
        <li>
          <button
            type="button"
            onClick={() => void signOut()}
            className="flex w-full items-center gap-3 px-4 py-4 text-left text-red-700 hover:bg-red-50"
          >
            <Icon name="logout" />
            <span className="font-medium">Cerrar sesión</span>
          </button>
        </li>
      </ul>
    </>
  );
}
