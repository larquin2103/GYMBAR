import { useQuery } from '@tanstack/react-query';
import { getOperationalData } from '@/data/operational.factory';
import { useSession } from '@/shared/session/SessionContext';
import { addDays, startOfDay } from '@/domain/membership/membership.logic';
import { dateKeyOf } from '@/domain/checkin/checkin.logic';

/** Entradas de los últimos `days` días (por defecto 30) para el módulo de asistencia. */
export function useAttendanceRange(days = 30) {
  const { organizationId } = useSession();
  const { checkins } = getOperationalData();
  const today = startOfDay(new Date());
  const fromKey = dateKeyOf(addDays(today, -(days - 1)));
  const toKey = dateKeyOf(today);
  return useQuery({
    queryKey: ['attendance', organizationId, fromKey, toKey],
    queryFn: () => checkins.listRange(organizationId, fromKey, toKey),
  });
}
