import { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Ruler } from 'lucide-react';
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
const ReportsPage = lazy(() => import('@/features/reports/pages/ReportsPage'));
const RoutinesPage = lazy(() => import('@/features/routines/pages/RoutinesPage'));
const ProductsPage = lazy(() => import('@/features/products/pages/ProductsPage'));
const InventoryPage = lazy(() => import('@/features/products/pages/InventoryPage'));

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
          { path: 'routines', element: <RoutinesPage /> },
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
          { path: 'inventory', element: <InventoryPage /> },
          { path: 'products', element: <ProductsPage /> },
          { path: 'reports', element: <ReportsPage /> },
          { path: 'settings/users', element: <UsersPage /> },
          { path: 'settings', element: <SettingsPage /> },
          { path: '*', element: <Navigate to="/" replace /> },
        ],
      },
    ],
  },
]);
