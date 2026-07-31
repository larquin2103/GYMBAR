import { useRef, useEffect } from 'react';
import { ScanLine, QrCode } from 'lucide-react';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Card, CardBody } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/Badge';
import { EmptyState } from '@/shared/ui/EmptyState';

/**
 * Pantalla de mostrador. El campo de búsqueda recibe foco por defecto para operar
 * sin mouse (ver docs/06). La lógica de validación offline llega en la Fase 2.
 */
export default function CheckInPage() {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div>
      <PageHeader
        title="Check-in"
        description="Registra la entrada del cliente en segundos"
        action={<Badge>Offline-first · Fase 2</Badge>}
      />

      <Card>
        <CardBody className="p-6">
          <label htmlFor="checkin-search" className="text-sm font-medium text-content">
            Buscar cliente
          </label>
          <div className="mt-2 flex gap-2">
            <div className="flex h-12 flex-1 items-center gap-2 rounded-md border border-border bg-surface/40 px-3">
              <ScanLine className="h-5 w-5 text-content-muted" aria-hidden />
              <input
                id="checkin-search"
                ref={inputRef}
                placeholder="Nombre, teléfono o código…"
                className="h-full w-full bg-transparent text-base text-content outline-none placeholder:text-content-muted"
              />
            </div>
            <button
              type="button"
              className="inline-flex h-12 items-center gap-2 rounded-md border border-border px-4 text-sm font-medium text-content hover:bg-surface"
            >
              <QrCode className="h-5 w-5" aria-hidden />
              Escanear QR
            </button>
          </div>
          <p className="mt-2 text-xs text-content-muted">
            El campo tiene foco automático: escribe y presiona Enter para el siguiente cliente.
          </p>
        </CardBody>
      </Card>

      <div className="mt-6">
        <EmptyState
          icon={ScanLine}
          title="Listo para registrar entradas"
          description="Busca un cliente para validar su membresía y registrar el acceso. Funciona incluso sin conexión."
        />
      </div>
    </div>
  );
}
