import { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import {
  Users,
  BadgeCheck,
  CreditCard,
  Wallet,
  CalendarCheck,
  Dumbbell,
  Ruler,
  Boxes,
  ShoppingBag,
  BarChart3,
  UserCog,
  Settings,
} from 'lucide-react';
import { Shell } from './layout/Shell';
import { CommandPaletteProvider } from './layout/CommandPalette';
import { PlaceholderPage } from '@/shared/ui/PlaceholderPage';

const DashboardPage = lazy(() => import('@/features/dashboard/pages/DashboardPage'));
const CheckInPage = lazy(() => import('@/features/checkin/pages/CheckInPage'));

function RootLayout() {
  return (
    <CommandPaletteProvider>
      <Shell />
    </CommandPaletteProvider>
  );
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'check-in', element: <CheckInPage /> },
      {
        path: 'members',
        element: (
          <PlaceholderPage
            title="Clientes"
            description="Alta, búsqueda instantánea y ficha del cliente"
            icon={Users}
            phase="Fase 1"
          />
        ),
      },
      {
        path: 'memberships',
        element: (
          <PlaceholderPage
            title="Membresías"
            description="Planes, asignación, renovación y congelamiento"
            icon={BadgeCheck}
            phase="Fase 2"
          />
        ),
      },
      {
        path: 'payments',
        element: (
          <PlaceholderPage
            title="Pagos"
            description="Registro de cobros, recibos e historial"
            icon={CreditCard}
            phase="Fase 2"
          />
        ),
      },
      {
        path: 'cashbox',
        element: (
          <PlaceholderPage
            title="Caja"
            description="Apertura, movimientos y cierre del turno"
            icon={Wallet}
            phase="Fase 2"
          />
        ),
      },
      {
        path: 'attendance',
        element: (
          <PlaceholderPage
            title="Asistencia"
            description="Historial de entradas y estadística semanal"
            icon={CalendarCheck}
            phase="Fase 3"
          />
        ),
      },
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
      {
        path: 'settings/users',
        element: (
          <PlaceholderPage
            title="Usuarios"
            description="Gestión de personal y roles"
            icon={UserCog}
            phase="Fase 1"
          />
        ),
      },
      {
        path: 'settings',
        element: (
          <PlaceholderPage
            title="Configuración"
            description="Ajustes de la organización"
            icon={Settings}
            phase="Fase 1"
          />
        ),
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
