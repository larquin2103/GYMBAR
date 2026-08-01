import { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Dumbbell, Ruler, Boxes, ShoppingBag, BarChart3 } from 'lucide-react';
import { Shell } from './layout/Shell';
import { CommandPaletteProvider } from './layout/CommandPalette';
import { RequireAuth } from './auth/RequireAuth';
import { PlaceholderPage } from '@/shared/ui/PlaceholderPage';

const DashboardPage = lazy(() => import('@/features/dashboard/pages/DashboardPage'));
const CheckInPage = lazy(() => import('@/features/checkin/pages/CheckInPage'));
const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage'));
const MembersPage = lazy(() => import('@/features/members/pages/MembersPage'));
const MemberDetailPage = lazy(() => import('@/features/members/pages/MemberDetailPage'));
const MembershipsPage = lazy(() => import('@/features/billing/pages/MembershipsPage'));
const PaymentsPage = lazy(() => import('@/features/billing/pages/PaymentsPage'));
const CashboxPage = lazy(() => import('@/features/cashbox/pages/CashboxPage'));
const UsersPage = lazy(() => import('@/features/settings/pages/UsersPage'));
const SettingsPage = lazy(() => import('@/features/settings/pages/SettingsPage'));
const AttendancePage = lazy(() => import('@/features/attendance/pages/AttendancePage'));

function RootLayout() {
  return (
    <CommandPaletteProvider>
      <Shell />
    </CommandPaletteProvider>
  );
}

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        path: '/',
        element: <RootLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'check-in', element: <CheckInPage /> },
          { path: 'members', element: <MembersPage /> },
          { path: 'members/:memberId', element: <MemberDetailPage /> },
          { path: 'memberships', element: <MembershipsPage /> },
          { path: 'payments', element: <PaymentsPage /> },
          { path: 'cashbox', element: <CashboxPage /> },
          { path: 'attendance', element: <AttendancePage /> },
          {
            path: 'routines',
            element: (
              <PlaceholderPage
                title="Rutinas"
                description="Planes de entrenamiento asignados por el entrenador"
                icon={Dumbbell}
                phase="Fase 4"
              />
            ),
          },
          {
            path: 'measurements',
            element: (
              <PlaceholderPage
                title="Medidas"
                description="Registro y progreso de medidas corporales"
                icon={Ruler}
                phase="Fase 4"
              />
            ),
          },
          {
            path: 'inventory',
            element: (
              <PlaceholderPage
                title="Inventario"
                description="Control de stock de productos"
                icon={Boxes}
                phase="Fase 4"
              />
            ),
          },
          {
            path: 'products',
            element: (
              <PlaceholderPage
                title="Productos"
                description="Catálogo y punto de venta"
                icon={ShoppingBag}
                phase="Fase 4"
              />
            ),
          },
          {
            path: 'reports',
            element: (
              <PlaceholderPage
                title="Reportes"
                description="Exportación a PDF y Excel con filtros rápidos"
                icon={BarChart3}
                phase="Fase 3"
              />
            ),
          },
          { path: 'settings/users', element: <UsersPage /> },
          { path: 'settings', element: <SettingsPage /> },
          { path: '*', element: <Navigate to="/" replace /> },
        ],
      },
    ],
  },
]);
