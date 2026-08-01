import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Navigate, useNavigate } from 'react-router-dom';
import { Dumbbell } from 'lucide-react';
import { useAuth } from '@/shared/session/SessionContext';
import { isFirebaseConfigured } from '@/shared/lib/firebase';
import { Button } from '@/shared/ui/Button';
import { Field, Input } from '@/shared/ui/Field';

const LoginSchema = z.object({
  email: z.string().email('Correo inválido'),
  password: z.string().min(1, 'Ingresa tu contraseña'),
});
type LoginForm = z.infer<typeof LoginSchema>;

export default function LoginPage() {
  const { session, signIn } = useAuth();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(LoginSchema),
    defaultValues: isFirebaseConfigured
      ? undefined
      : { email: 'demo@gymbar.app', password: 'demo' },
  });

  if (session) return <Navigate to="/" replace />;

  const onSubmit = async (data: LoginForm) => {
    setFormError(null);
    try {
      await signIn(data.email, data.password);
      navigate('/', { replace: true });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'No se pudo iniciar sesión.');
    }
  };

  return (
    <div className="flex min-h-full items-center justify-center bg-surface/40 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-contrast">
            <Dumbbell className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-semibold text-content">Bienvenido a GYMBAR</h1>
          <p className="mt-1 text-sm text-content-muted">Ingresa para administrar tu gimnasio</p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4 rounded-lg border border-border bg-bg p-6 shadow-card"
        >
          <Field label="Correo" htmlFor="email" error={errors.email?.message} required>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              invalid={!!errors.email}
              {...register('email')}
            />
          </Field>
          <Field label="Contraseña" htmlFor="password" error={errors.password?.message} required>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              invalid={!!errors.password}
              {...register('password')}
            />
          </Field>

          {formError && (
            <p className="rounded-md bg-state-expired/10 px-3 py-2 text-sm text-state-expired">
              {formError}
            </p>
          )}

          <Button type="submit" className="w-full" loading={isSubmitting}>
            Iniciar sesión
          </Button>

          {!isFirebaseConfigured && (
            <p className="text-center text-xs text-content-muted">
              Modo demo: cualquier credencial inicia sesión como administrador.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
