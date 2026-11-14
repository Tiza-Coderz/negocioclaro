import { useState, type FormEvent } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { WhatsAppButton } from '@/components/ui/WhatsAppButton';
import { env } from '@/lib/env';
import { ResetDemoButton } from './ResetDemoButton';

export function LoginPage() {
  const { session, signIn } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState(env.demoMode ? env.demoEmail : '');
  const [password, setPassword] = useState(env.demoMode ? env.demoPassword : '');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const from = (location.state as { from?: string } | null)?.from ?? '/';
  if (session) return <Navigate to={from} replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="from-brand-700 to-brand-900 flex min-h-dvh flex-col bg-gradient-to-b lg:flex-row">
      <section className="px-6 pt-10 pb-8 text-white lg:flex lg:w-1/2 lg:flex-col lg:justify-center lg:px-16">
        <div className="flex items-center gap-3">
          <img
            src="/favicon.svg"
            alt=""
            width={44}
            height={44}
            className="size-11 rounded-xl ring-2 ring-white/30"
          />
          <span className="text-2xl font-bold">NegocioClaro</span>
        </div>
        <h1 className="mt-6 text-3xl leading-tight font-bold lg:text-4xl">
          Sepa cuánto gana su negocio, en USD y en CUP.
        </h1>
        <p className="text-brand-100 mt-3 max-w-md">
          Ingresos y gastos en cuatro monedas, consolidados con la tasa del día. Nómina, cuentas por
          cobrar y un informe mensual listo para su contador.
        </p>
      </section>

      <section className="flex flex-1 items-start justify-center rounded-t-3xl bg-slate-50 px-4 py-8 lg:items-center lg:rounded-none">
        <div className="w-full max-w-sm space-y-5">
          {env.demoMode && (
            <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
              <p className="font-semibold">Está viendo una demostración</p>
              <p className="mt-1">
                Negocio de ejemplo: <strong>Distribuidora Del Valle</strong> (Boyeros).
              </p>
              <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-mono text-[13px]">
                <dt className="text-amber-700">Usuario</dt>
                <dd>{env.demoEmail}</dd>
                <dt className="text-amber-700">Clave</dt>
                <dd>{env.demoPassword}</dd>
              </dl>
            </div>
          )}

          <form
            onSubmit={(e) => void onSubmit(e)}
            className="space-y-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
            noValidate
          >
            <h2 className="text-xl font-bold text-slate-900">Entrar</h2>
            <Input
              label="Correo electrónico"
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              label="Contraseña"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && (
              <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}
            <Button type="submit" block size="lg" loading={submitting}>
              Entrar
            </Button>
          </form>

          {env.demoMode && <ResetDemoButton />}

          {env.contactWhatsapp && (
            <div className="text-center text-sm text-slate-600">
              <p className="mb-2">¿Quiere esto para su negocio?</p>
              <WhatsAppButton
                phone={env.contactWhatsapp}
                message="Hola, vi la demo de NegocioClaro y me interesa para mi negocio."
                label="Escríbame por WhatsApp"
              />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
