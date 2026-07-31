import {
  LayoutDashboard,
  Users,
  ScanLine,
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
  type LucideIcon,
} from 'lucide-react';
import type { Role } from '@gymbar/shared';

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  /** Roles que ven el ítem en la navegación (la seguridad real está en Rules). */
  roles: Role[];
  group: 'operación' | 'gestión' | 'sistema';
}

const ALL: Role[] = ['admin', 'reception', 'trainer'];

export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard, roles: ALL, group: 'operación' },
  { label: 'Check-in', path: '/check-in', icon: ScanLine, roles: ALL, group: 'operación' },
  { label: 'Clientes', path: '/members', icon: Users, roles: ALL, group: 'operación' },
  {
    label: 'Membresías',
    path: '/memberships',
    icon: BadgeCheck,
    roles: ['admin', 'reception'],
    group: 'gestión',
  },
  {
    label: 'Pagos',
    path: '/payments',
    icon: CreditCard,
    roles: ['admin', 'reception'],
    group: 'gestión',
  },
  {
    label: 'Caja',
    path: '/cashbox',
    icon: Wallet,
    roles: ['admin', 'reception'],
    group: 'gestión',
  },
  {
    label: 'Asistencia',
    path: '/attendance',
    icon: CalendarCheck,
    roles: ['admin', 'reception'],
    group: 'gestión',
  },
  {
    label: 'Rutinas',
    path: '/routines',
    icon: Dumbbell,
    roles: ['admin', 'trainer'],
    group: 'gestión',
  },
  { label: 'Medidas', path: '/measurements', icon: Ruler, roles: ALL, group: 'gestión' },
  {
    label: 'Inventario',
    path: '/inventory',
    icon: Boxes,
    roles: ['admin', 'reception'],
    group: 'gestión',
  },
  {
    label: 'Productos',
    path: '/products',
    icon: ShoppingBag,
    roles: ['admin', 'reception'],
    group: 'gestión',
  },
  {
    label: 'Reportes',
    path: '/reports',
    icon: BarChart3,
    roles: ['admin', 'reception'],
    group: 'gestión',
  },
  { label: 'Usuarios', path: '/settings/users', icon: UserCog, roles: ['admin'], group: 'sistema' },
  { label: 'Configuración', path: '/settings', icon: Settings, roles: ['admin'], group: 'sistema' },
];

export const NAV_GROUPS: NavItem['group'][] = ['operación', 'gestión', 'sistema'];
