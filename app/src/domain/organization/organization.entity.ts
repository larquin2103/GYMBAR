/** Ajustes de la organización (gimnasio). Editables solo por admin. */
export interface OrganizationSettings {
  name: string;
  /** Código ISO de la moneda de cobro (ej. 'CUP'). */
  currency: string;
  phone: string | null;
  address: string | null;
  /**
   * En el check-in de autoservicio, bloquear el acceso a clientes no activos
   * (mostrar "Pasa por recepción"). Si es false, se permite con aviso.
   */
  kioskBlockExpired: boolean;
}

export interface OrganizationSettingsInput {
  name?: string;
  currency?: string;
  phone?: string | null;
  address?: string | null;
  kioskBlockExpired?: boolean;
}

export interface OrganizationRepository {
  getSettings(orgId: string): Promise<OrganizationSettings>;
  updateSettings(orgId: string, input: OrganizationSettingsInput): Promise<void>;
}
