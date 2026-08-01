import { z } from 'zod';

/** Roles del sistema. El acceso real se valida en Firestore Rules + Cloud Functions. */
export const Role = z.enum(['admin', 'reception', 'trainer']);
export type Role = z.infer<typeof Role>;

/** Estados de una membresía (ver doc 03 · máquina de estados). */
export const MembershipStatus = z.enum(['pending', 'active', 'frozen', 'expired', 'cancelled']);
export type MembershipStatus = z.infer<typeof MembershipStatus>;

/** Estado agregado del cliente, derivado y cacheado en el documento member. */
export const MemberStatus = z.enum(['active', 'expired', 'pending', 'frozen', 'cancelled']);
export type MemberStatus = z.infer<typeof MemberStatus>;

/** Tipos de plan comercial. */
export const PlanType = z.enum(['daily', 'weekly', 'biweekly', 'monthly', 'annual', 'promo']);
export type PlanType = z.infer<typeof PlanType>;

/** Métodos de pago aceptados. */
export const PaymentMethod = z.enum(['cash', 'card', 'transfer', 'other']);
export type PaymentMethod = z.infer<typeof PaymentMethod>;

/** Resultado de un intento de check-in (siempre se registra el intento). */
export const CheckInResult = z.enum(['allowed', 'expired', 'pending_payment', 'denied']);
export type CheckInResult = z.infer<typeof CheckInResult>;

/** Origen del check-in, para analítica de mostrador. */
export const CheckInSource = z.enum(['qr', 'search', 'code', 'phone', 'kiosk']);
export type CheckInSource = z.infer<typeof CheckInSource>;

/** Objetivo de entrenamiento del cliente (para seguimiento y evolución). */
export const MemberGoal = z.enum(['lose_weight', 'gain_muscle', 'maintain', 'endurance']);
export type MemberGoal = z.infer<typeof MemberGoal>;

export const MEMBER_GOAL_LABELS: Record<MemberGoal, string> = {
  lose_weight: 'Bajar de peso',
  gain_muscle: 'Ganar masa muscular',
  maintain: 'Mantenerse',
  endurance: 'Resistencia',
};
