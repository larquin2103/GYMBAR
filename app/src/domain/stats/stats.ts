/** Indicadores accionables del dashboard (ver docs · Dashboard). */
export interface DashboardStats {
  activeMembers: number;
  expiredMembers: number;
  checkinsToday: number;
  incomeTodayCents: number;
  incomeMonthCents: number;
  pendingRenewals: number;
  currency: string;
  /** Asistencias por día de la semana actual (lun→dom). */
  weeklyAttendance: number[];
}

export interface StatsRepository {
  getDashboard(orgId: string): Promise<DashboardStats>;
}
