import { useQuery } from '@tanstack/react-query';
import { getOperationalData } from '@/data/operational.factory';
import { useSession } from '@/shared/session/SessionContext';

/** Indicadores del dashboard (rollups en prod; cálculo en memoria en demo). */
export function useDashboardStats() {
  const { organizationId } = useSession();
  const { stats } = getOperationalData();
  return useQuery({
    queryKey: ['stats', organizationId, 'dashboard'],
    queryFn: () => stats.getDashboard(organizationId),
  });
}
