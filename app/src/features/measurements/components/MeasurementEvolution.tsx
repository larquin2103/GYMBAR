import { LineChart, type LinePoint } from '@/shared/ui/LineChart';
import { computeBMI, type Measurement } from '@/domain/measurement/measurement.entity';

/**
 * Vista de evolución de un cliente: gráfico de peso + tabla de las últimas
 * mediciones con IMC calculado. Presentacional puro; se reutiliza en la ficha
 * del cliente y en el módulo de Medidas.
 */
export function MeasurementEvolution({ measurements }: { measurements: Measurement[] }) {
  const weightPoints: LinePoint[] = measurements
    .filter((m) => m.weightKg != null)
    .slice()
    .reverse()
    .map((m) => ({
      label: m.date.toLocaleDateString('es', { day: '2-digit', month: 'short' }),
      value: m.weightKg as number,
    }));
  // Altura más reciente registrada, para calcular IMC en filas sin altura.
  const latestHeight = measurements.find((m) => m.heightCm != null)?.heightCm ?? null;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div>
        <div className="mb-1 text-xs font-medium uppercase tracking-wide text-content-muted">
          Evolución del peso
        </div>
        <LineChart points={weightPoints} unit="kg" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-content-muted">
            <tr>
              <th className="pb-2 font-medium">Fecha</th>
              <th className="pb-2 text-right font-medium">Peso</th>
              <th className="pb-2 text-right font-medium">IMC</th>
              <th className="pb-2 text-right font-medium">Grasa</th>
              <th className="pb-2 text-right font-medium">Músculo</th>
              <th className="pb-2 text-right font-medium">Cintura</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {measurements.slice(0, 8).map((m) => {
              const bmi = computeBMI(m.weightKg, m.heightCm ?? latestHeight);
              return (
                <tr key={m.id}>
                  <td className="py-2 text-content-muted">
                    {m.date.toLocaleDateString('es', { day: '2-digit', month: 'short' })}
                  </td>
                  <td className="py-2 text-right tabular text-content">
                    {m.weightKg != null ? `${m.weightKg} kg` : '—'}
                  </td>
                  <td className="py-2 text-right tabular text-content-muted">
                    {bmi != null ? bmi : '—'}
                  </td>
                  <td className="py-2 text-right tabular text-content-muted">
                    {m.bodyFatPct != null ? `${m.bodyFatPct}%` : '—'}
                  </td>
                  <td className="py-2 text-right tabular text-content-muted">
                    {m.muscleKg != null ? `${m.muscleKg} kg` : '—'}
                  </td>
                  <td className="py-2 text-right tabular text-content-muted">
                    {m.waistCm != null ? `${m.waistCm} cm` : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
