import { Cloud, CloudOff } from 'lucide-react';
import { useOnlineStatus } from '@/shared/hooks/useOnlineStatus';
import { cn } from '@/shared/lib/cn';

/** Indicador de conectividad siempre visible (ver docs/10). */
export function ConnectivityIndicator() {
  const online = useOnlineStatus();
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
        online ? 'text-content-muted' : 'bg-state-pending/12 text-state-pending',
      )}
      title={online ? 'Conectado' : 'Sin conexión · el check-in sigue funcionando'}
    >
      {online ? <Cloud className="h-3.5 w-3.5" /> : <CloudOff className="h-3.5 w-3.5" />}
      {online ? 'En línea' : 'Sin conexión'}
    </span>
  );
}
