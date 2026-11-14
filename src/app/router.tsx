import { lazy } from 'react';
import { createBrowserRouter, Navigate, Outlet, useLocation } from 'react-router-dom';
import { LoadingBlock } from '@/components/ui/States';
import { LoginPage } from '@/features/auth/LoginPage';
import { AppLayout } from './layout/AppLayout';
import { NotFoundPage } from './layout/NotFoundPage';
import { useAuth } from './providers/AuthProvider';
import { BusinessProvider } from './providers/BusinessProvider';

// Cada pantalla es un chunk aparte: el móvil solo descarga lo que abre.
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'));
const MovementsPage = lazy(() => import('@/features/movements/MovementsPage'));
const QuickEntryPage = lazy(() => import('@/features/quick-entry/QuickEntryPage'));
const RatesPage = lazy(() => import('@/features/rates/RatesPage'));
const DebtsPage = lazy(() => import('@/features/debts/DebtsPage'));
const ContactsPage = lazy(() => import('@/features/contacts/ContactsPage'));
const MorePage = lazy(() => import('./layout/MorePage'));

function RequireAuth() {
  const { session, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return (
      <div className="mx-auto max-w-3xl p-4">
        <LoadingBlock rows={3} label="Comprobando su sesión…" />
      </div>
    );
  }
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return (
    <BusinessProvider>
      <Outlet />
    </BusinessProvider>
  );
}

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'movimientos', element: <MovementsPage /> },
          { path: 'registro-rapido', element: <QuickEntryPage /> },
          { path: 'tasas', element: <RatesPage /> },
          { path: 'cuentas', element: <DebtsPage /> },
          { path: 'contactos', element: <ContactsPage /> },
          { path: 'mas', element: <MorePage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);
