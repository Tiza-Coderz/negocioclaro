import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { useBusiness } from '@/app/providers/BusinessProvider';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { Input, Select } from '@/components/ui/Field';
import { PageHeader } from '@/components/ui/PageHeader';
import { humanizeError } from '@/components/ui/States';
import { queryKeys } from '@/data/queryKeys';
import { updateBusiness } from '@/data/repositories/business';
import { ResetDemoButton } from '@/features/auth/ResetDemoButton';
import { MUNICIPIOS_HABANA } from '@/features/contacts/municipios';
import { env } from '@/lib/env';
import { normalizeCubanPhone } from '@/lib/whatsapp';

export default function SettingsPage() {
  const { business, role } = useBusiness();
  const qc = useQueryClient();
  const [name, setName] = useState(business.name);
  const [municipality, setMunicipality] = useState(business.municipality ?? '');
  const [phone, setPhone] = useState(business.phone_whatsapp ?? '');
  const [alertDays, setAlertDays] = useState(String(business.alert_days_before));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const save = useMutation({
    mutationFn: () =>
      updateBusiness(business.id, {
        name: name.trim(),
        municipality: municipality || null,
        phone_whatsapp: normalizeCubanPhone(phone),
        alert_days_before: Number(alertDays),
      }),
    onSuccess: async () => {
      setSaved(true);
      await qc.invalidateQueries({ queryKey: queryKeys.business });
    },
  });
  const isOwner = role === 'dueno';

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaved(false);
    const next: Record<string, string> = {};
    if (name.trim().length < 2) next.name = 'Escriba el nombre del negocio.';
    if (phone.trim() && !normalizeCubanPhone(phone)) next.phone = 'Número no válido.';
    const days = Number(alertDays);
    if (!Number.isInteger(days) || days < 0 || days > 60) next.alertDays = 'Entre 0 y 60 días.';
    setErrors(next);
    if (!Object.keys(next).length) save.mutate();
  }

  return (
    <>
      <PageHeader title="Ajustes" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Datos del negocio"
            subtitle={isOwner ? undefined : 'Solo el dueño puede modificarlos.'}
          />
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <fieldset disabled={!isOwner} className="space-y-4">
              <Input
                label="Nombre"
                value={name}
                onChange={(e) => setName(e.target.value)}
                error={errors.name}
              />
              <Select
                label="Municipio"
                value={municipality}
                onChange={(e) => setMunicipality(e.target.value)}
              >
                <option value="">— Sin especificar —</option>
                {MUNICIPIOS_HABANA.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </Select>
              <Input
                label="WhatsApp del negocio"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                error={errors.phone}
                hint="Para enviarse a sí mismo el resumen mensual."
              />
              <Input
                label="Avisar de cuentas por vencer con (días de antelación)"
                type="number"
                inputMode="numeric"
                min={0}
                max={60}
                value={alertDays}
                onChange={(e) => setAlertDays(e.target.value)}
                error={errors.alertDays}
              />
            </fieldset>
            {isOwner && (
              <Button type="submit" loading={save.isPending}>
                Guardar cambios
              </Button>
            )}
            <p aria-live="polite" className="text-sm">
              {saved && <span className="text-emerald-700">Cambios guardados.</span>}
              {save.isError && <span className="text-red-700">{humanizeError(save.error)}</span>}
            </p>
          </form>
        </Card>

        {env.demoMode && business.is_demo && (
          <Card>
            <CardHeader
              title="Modo demostración"
              subtitle="Vuelva a los datos de ejemplo de 6 meses en cualquier momento."
            />
            <ResetDemoButton />
          </Card>
        )}
      </div>
    </>
  );
}
