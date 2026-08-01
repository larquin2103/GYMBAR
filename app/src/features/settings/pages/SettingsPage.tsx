import { useEffect, useState } from 'react';
import { Building2, Check } from 'lucide-react';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Card, CardBody } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Field, Input } from '@/shared/ui/Field';
import { cn } from '@/shared/lib/cn';
import { useOrgSettings, useUpdateOrgSettings } from '../api/useSettings';

const CURRENCIES = [
  { code: 'CUP', label: 'Peso cubano (MN)' },
  { code: 'MXN', label: 'Peso mexicano' },
  { code: 'USD', label: 'Dólar (USD)' },
];

export default function SettingsPage() {
  const { data: settings, isLoading } = useOrgSettings();
  const update = useUpdateOrgSettings();
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('CUP');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [kioskBlock, setKioskBlock] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings) {
      setName(settings.name);
      setCurrency(settings.currency);
      setPhone(settings.phone ?? '');
      setAddress(settings.address ?? '');
      setKioskBlock(settings.kioskBlockExpired);
    }
  }, [settings]);

  async function onSave() {
    await update.mutateAsync({
      name: name.trim() || 'Mi Gimnasio',
      currency,
      phone: phone.trim() || null,
      address: address.trim() || null,
      kioskBlockExpired: kioskBlock,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div>
      <PageHeader title="Configuración" description="Ajustes de tu gimnasio" />

      {isLoading ? (
        <div className="text-sm text-content-muted">Cargando…</div>
      ) : (
        <div className="max-w-2xl space-y-5">
          <Card>
            <CardBody>
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-content">
                <Building2 className="h-4 w-4 text-content-muted" />
                Datos del gimnasio
              </div>
              <div className="space-y-4">
                <Field label="Nombre" htmlFor="org-name">
                  <Input id="org-name" value={name} onChange={(e) => setName(e.target.value)} />
                </Field>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Teléfono" htmlFor="org-phone">
                    <Input id="org-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </Field>
                  <Field label="Moneda" htmlFor="org-currency">
                    <select
                      id="org-currency"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="h-10 w-full rounded-md border border-border bg-bg px-3 text-sm text-content"
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                <Field label="Dirección" htmlFor="org-address">
                  <Input
                    id="org-address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </Field>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <div className="mb-3 text-sm font-semibold text-content">Check-in de autoservicio</div>
              <button
                type="button"
                onClick={() => setKioskBlock((v) => !v)}
                className="flex w-full items-center justify-between rounded-md border border-border px-4 py-3 text-left"
              >
                <div>
                  <div className="text-sm text-content">Bloquear acceso a clientes vencidos</div>
                  <div className="text-xs text-content-muted">
                    En autoservicio muestra “Pasa por recepción” a quien no está al día.
                  </div>
                </div>
                <span
                  className={cn(
                    'relative ml-4 h-5 w-9 shrink-0 rounded-full transition-colors',
                    kioskBlock ? 'bg-primary' : 'bg-border',
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform',
                      kioskBlock ? 'left-0.5 translate-x-4' : 'left-0.5',
                    )}
                  />
                </span>
              </button>
            </CardBody>
          </Card>

          <div className="flex items-center gap-3">
            <Button onClick={onSave} loading={update.isPending}>
              Guardar cambios
            </Button>
            {saved && (
              <span className="inline-flex items-center gap-1 text-sm text-state-active">
                <Check className="h-4 w-4" />
                Guardado
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
