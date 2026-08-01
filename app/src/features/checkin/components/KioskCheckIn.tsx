import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react';
import { Delete, Check, AlertTriangle, XCircle, Dumbbell } from 'lucide-react';
import { memberFullName } from '@/domain/member/member.entity';
import { cn } from '@/shared/lib/cn';
import { useKioskCheckIn } from '../api/useCheckin';

type Result =
  | { kind: 'welcome'; name: string }
  | { kind: 'reception'; name: string }
  | { kind: 'error'; message: string };

/**
 * Panel de autoservicio: el cliente teclea su PIN de 4 dígitos para confirmar su
 * asistencia. Al completar 4 dígitos se registra automáticamente y se muestra el
 * resultado unos segundos antes de volver a estar listo para el siguiente.
 */
export function KioskCheckIn() {
  const [pin, setPin] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const kiosk = useKioskCheckIn();
  const resetTimer = useRef<ReturnType<typeof setTimeout>>();

  const submit = useCallback(
    async (code: string) => {
      try {
        const member = await kiosk.mutateAsync(code);
        // En autoservicio solo pasa quien está al día; el resto va a recepción.
        setResult(
          member.status === 'active'
            ? { kind: 'welcome', name: memberFullName(member) }
            : { kind: 'reception', name: memberFullName(member) },
        );
      } catch {
        setResult({ kind: 'error', message: 'Código no encontrado' });
      }
      setPin('');
      resetTimer.current = setTimeout(() => setResult(null), 4000);
    },
    [kiosk],
  );

  const press = useCallback(
    (digit: string) => {
      if (result) setResult(null);
      setPin((prev) => {
        const next = (prev + digit).slice(0, 4);
        if (next.length === 4) void submit(next);
        return next;
      });
    },
    [result, submit],
  );

  const backspace = useCallback(() => setPin((p) => p.slice(0, -1)), []);

  // Soporte de teclado físico (útil con un teclado numérico en el kiosko).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (/^[0-9]$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') backspace();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [press, backspace]);

  useEffect(() => () => clearTimeout(resetTimer.current), []);

  return (
    <div className="mx-auto flex max-w-sm flex-col items-center py-4">
      <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-contrast">
        <Dumbbell className="h-6 w-6" />
      </div>
      <h2 className="text-lg font-semibold text-content">Confirma tu asistencia</h2>
      <p className="mb-6 text-sm text-content-muted">Ingresa tu código de 4 dígitos</p>

      {/* Puntos del PIN */}
      <div className="mb-6 flex gap-3">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn(
              'h-4 w-4 rounded-full border-2 transition-colors',
              i < pin.length ? 'border-primary bg-primary' : 'border-border',
            )}
          />
        ))}
      </div>

      {/* Resultado */}
      {result && (
        <div
          className={cn(
            'mb-6 flex w-full items-center gap-3 rounded-lg border p-4',
            result.kind === 'welcome'
              ? 'border-state-active/40 bg-state-active/10'
              : result.kind === 'reception'
                ? 'border-state-pending/40 bg-state-pending/10'
                : 'border-state-expired/40 bg-state-expired/10',
          )}
        >
          {result.kind === 'welcome' ? (
            <Check className="h-6 w-6 shrink-0 text-state-active" />
          ) : result.kind === 'reception' ? (
            <AlertTriangle className="h-6 w-6 shrink-0 text-state-pending" />
          ) : (
            <XCircle className="h-6 w-6 shrink-0 text-state-expired" />
          )}
          <div>
            {result.kind === 'error' ? (
              <div className="text-sm font-medium text-state-expired">{result.message}</div>
            ) : (
              <>
                <div className="font-semibold text-content">{result.name}</div>
                <div
                  className={cn(
                    'text-sm',
                    result.kind === 'welcome' ? 'text-content-muted' : 'text-state-pending',
                  )}
                >
                  {result.kind === 'welcome'
                    ? '¡Bienvenido! Entrada registrada'
                    : 'Pasa por recepción'}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Teclado numérico */}
      <div className="grid w-full grid-cols-3 gap-3">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <KeypadButton key={d} onClick={() => press(d)}>
            {d}
          </KeypadButton>
        ))}
        <div />
        <KeypadButton onClick={() => press('0')}>0</KeypadButton>
        <KeypadButton onClick={backspace} aria-label="Borrar">
          <Delete className="mx-auto h-5 w-5" />
        </KeypadButton>
      </div>
    </div>
  );
}

function KeypadButton({
  children,
  onClick,
  ...props
}: {
  children: ReactNode;
  onClick: () => void;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-16 rounded-xl border border-border bg-surface/40 text-2xl font-semibold text-content transition-colors hover:border-primary/40 hover:bg-surface active:bg-primary-soft"
      {...props}
    >
      {children}
    </button>
  );
}
