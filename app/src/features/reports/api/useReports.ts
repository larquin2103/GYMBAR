import { useQuery } from '@tanstack/react-query';
import { getOperationalData } from '@/data/operational.factory';
import { useSession } from '@/shared/session/SessionContext';

export function useIncomeReport(fromKey: string, toKey: string, enabled = true) {
  const { organizationId } = useSession();
  const { reports } = getOperationalData();
  return useQuery({
    queryKey: ['report-income', organizationId, fromKey, toKey],
    queryFn: () => reports.income(organizationId, fromKey, toKey),
    enabled,
  });
}

export function useAttendanceReport(fromKey: string, toKey: string, enabled = true) {
  const { organizationId } = useSession();
  const { reports } = getOperationalData();
  return useQuery({
    queryKey: ['report-attendance', organizationId, fromKey, toKey],
    queryFn: () => reports.attendance(organizationId, fromKey, toKey),
    enabled,
  });
}

export function useExpiringReport(withinDays: number, enabled = true) {
  const { organizationId } = useSession();
  const { reports } = getOperationalData();
  return useQuery({
    queryKey: ['report-expiring', organizationId, withinDays],
    queryFn: () => reports.expiring(organizationId, withinDays),
    enabled,
  });
}

export function useRosterReport(enabled = true) {
  const { organizationId } = useSession();
  const { reports } = getOperationalData();
  return useQuery({
    queryKey: ['report-roster', organizationId],
    queryFn: () => reports.roster(organizationId),
    enabled,
  });
}
