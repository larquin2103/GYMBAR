/** Ajustes de la organización (gimnasio). Editables solo por admin. */
export interface OrganizationSettings {
  name: string;
  /** Código ISO de la moneda de cobro (ej. 'CUP'). */
  currency: string;
  phone: string | null;
  address: string | null;
  /**
   * Logo del gimnasio como data URI comprimido (se guarda en Firestore, no en
   * Storage). Null = sin logo (se muestra el ícono por defecto). Ver docs/13.
   */
  logoUrl: string | null;
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
  logoUrl?: string | null;
  kioskBlockExpired?: boolean;
}

export interface OrganizationRepository {
  getSettings(orgId: string): Promise<OrganizationSettings>;
  updateSettings(orgId: string, input: OrganizationSettingsInput): Promise<void>;
}
