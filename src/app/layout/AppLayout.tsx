import { Suspense } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { LoadingBlock } from '@/components/ui/States';
import { cn } from '@/components/ui/cn';
import { useAuth } from '../providers/AuthProvider';
import { useBusiness } from '../providers/BusinessProvider';
import { BOTTOM_NAV, NAV_ITEMS } from './nav';
import { OfflineBanner } from './OfflineBanner';

function Logo() {
  return (
    <Link to="/" className="text-brand-700 flex items-center gap-2 font-bold">
      <img src="/favicon.svg" alt="" className="size-8" width={32} height={32} />
      <span>NegocioClaro</span>
    </Link>
  );
}

export function AppLayout() {
  const { business, role } = useBusiness();
  const { signOut } = useAuth();

  return (
    <div className="min-h-dvh lg:flex">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2"
      >
        Saltar al contenido
      </a>

      {/* Barra lateral (escritorio) */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="px-5 py-5">
          <Logo />
        </div>
        <nav aria-label="Principal" className="flex-1 space-y-1 px-3">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium',
                  isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50',
                )
              }
            >
              <Icon name={item.icon} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-200 p-4">
          <p className="truncate text-sm font-semibold text-slate-800">{business.name}</p>
          <p className="text-xs text-slate-500 capitalize">
            {role === 'dueno' ? 'Dueño' : 'Contador'} · {business.municipality}
          </p>
          <button
            type="button"
            onClick={() => void signOut()}
            className="mt-3 flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
          >
            <Icon name="logout" className="size-4" /> Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Cabecera (móvil) */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
          <Logo />
          <span className="max-w-[45%] truncate text-xs text-slate-500">{business.name}</span>
        </header>

        <OfflineBanner />

        <main
          id="contenido"
          className="mx-auto w-full max-w-6xl flex-1 px-4 pt-4 pb-28 lg:px-8 lg:pt-8 lg:pb-10"
        >
          <Suspense fallback={<LoadingBlock rows={4} />}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      {/* Navegación inferior (móvil) */}
      <nav
        aria-label="Principal"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        {BOTTOM_NAV.map((item) =>
          item === 'quick' ? (
            <Link
              key="quick"
              to="/registro-rapido"
              className="flex flex-col items-center justify-center"
              aria-label="Registro rápido"
            >
              <span className="bg-brand-600 -mt-6 flex size-14 items-center justify-center rounded-full text-white shadow-lg ring-4 ring-white">
                <Icon name="plus" className="size-7" />
              </span>
            </Link>
          ) : (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium',
                  isActive ? 'text-brand-700' : 'text-slate-500',
                )
              }
            >
              <Icon name={item.icon} />
              {item.label}
            </NavLink>
          ),
        )}
      </nav>
    </div>
  );
}
