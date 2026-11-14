import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState, type FormEvent } from 'react';
import { useBusinessId } from '@/app/providers/BusinessProvider';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input, Select, Textarea } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState, ErrorState, humanizeError, LoadingBlock } from '@/components/ui/States';
import { WhatsAppButton } from '@/components/ui/WhatsAppButton';
import { cn } from '@/components/ui/cn';
import { useClients, useSuppliers } from '@/data/hooks/useCatalogs';
import { queryKeys } from '@/data/queryKeys';
import { deleteContact, saveContact, type Supplier } from '@/data/repositories/catalogs';
import { normalizeCubanPhone } from '@/lib/whatsapp';
import { MUNICIPIOS_HABANA } from './municipios';

type Tab = 'clients' | 'suppliers';
type Contact = Partial<Supplier> & { id: string; name: string };

export default function ContactsPage() {
  const [tab, setTab] = useState<Tab>('clients');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Contact | 'new' | null>(null);
  const clients = useClients();
  const suppliers = useSuppliers();
  const query = tab === 'clients' ? clients : suppliers;

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ((query.data ?? []) as Contact[]).filter(
      (c) =>
        !q ||
        [c.name, c.contact_name, c.municipality, c.products].some((t) =>
          t?.toLowerCase().includes(q),
        ),
    );
  }, [query.data, search]);

  return (
    <>
      <PageHeader
        title="Clientes y proveedores"
        actions={
          <Button icon={<Icon name="plus" />} onClick={() => setEditing('new')}>
            {tab === 'clients' ? 'Nuevo cliente' : 'Nuevo proveedor'}
          </Button>
        }
      />
      <div role="tablist" className="mb-3 grid grid-cols-2 gap-1 rounded-xl bg-slate-200/70 p-1">
        {(
          [
            ['clients', 'Clientes'],
            ['suppliers', 'Proveedores'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={cn(
              'rounded-lg py-2 text-sm font-semibold',
              tab === value ? 'text-brand-700 bg-white shadow-sm' : 'text-slate-600',
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <Input
        label="Buscar"
        hideLabel
        type="search"
        placeholder="Buscar por nombre, municipio…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        wrapperClassName="mb-4"
      />

      {query.isPending ? (
        <LoadingBlock rows={5} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState
          title="Sin resultados"
          description="Añada su primer contacto con el botón de arriba."
        />
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
          {list.map((c) => (
            <li key={c.id} className="flex items-center gap-3 px-4 py-3">
              <button
                type="button"
                onClick={() => setEditing(c)}
                className="min-w-0 flex-1 text-left"
              >
                <span className="block truncate font-medium text-slate-900">{c.name}</span>
                <span className="block truncate text-xs text-slate-500">
                  {[c.contact_name, c.municipality, c.products].filter(Boolean).join(' · ')}
                </span>
              </button>
              {c.phone && (
                <a
                  href={`tel:${c.phone}`}
                  className="text-brand-700 rounded-xl p-2.5 ring-1 ring-slate-200 hover:bg-slate-50"
                  aria-label={`Llamar a ${c.name}`}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="size-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    aria-hidden
                  >
                    <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
                  </svg>
                </a>
              )}
              <WhatsAppButton
                phone={c.phone}
                iconOnly
                size="md"
                label={`WhatsApp de ${c.name}`}
                message={`Buenas, ${c.contact_name ?? ''}. Le escribimos de la distribuidora.`}
              />
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <ContactDialog
          table={tab}
          contact={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

function ContactDialog({
  table,
  contact,
  onClose,
}: {
  table: Tab;
  contact: Contact | null;
  onClose: () => void;
}) {
  const businessId = useBusinessId();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: contact?.name ?? '',
    contact_name: contact?.contact_name ?? '',
    phone: contact?.phone ?? '',
    municipality: contact?.municipality ?? '',
    products: contact?.products ?? '',
    notes: contact?.notes ?? '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const invalidate = () =>
    qc.invalidateQueries({
      queryKey:
        table === 'clients' ? queryKeys.clients(businessId) : queryKeys.suppliers(businessId),
    });
  const save = useMutation({
    mutationFn: () =>
      saveContact(
        table,
        businessId,
        {
          name: form.name.trim(),
          contact_name: form.contact_name.trim() || null,
          phone: form.phone.trim() || null,
          municipality: form.municipality || null,
          products: form.products.trim() || null,
          notes: form.notes.trim() || null,
        },
        contact?.id,
      ),
    onSuccess: async () => {
      await invalidate();
      onClose();
    },
  });
  const remove = useMutation({
    mutationFn: () => deleteContact(table, contact?.id ?? ''),
    onSuccess: async () => {
      await invalidate();
      onClose();
    },
  });
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (form.name.trim().length < 2) next.name = 'Escriba el nombre.';
    if (form.phone.trim() && !normalizeCubanPhone(form.phone))
      next.phone = 'Teléfono no válido (8 dígitos o con +53).';
    setErrors(next);
    if (!Object.keys(next).length) save.mutate();
  }

  const label = table === 'clients' ? 'cliente' : 'proveedor';
  return (
    <Dialog
      open
      onClose={onClose}
      title={contact ? `Editar ${label}` : `Nuevo ${label}`}
      footer={
        <>
          {contact && (
            <Button
              variant="ghost"
              className="mr-auto text-red-700"
              loading={remove.isPending}
              onClick={() => {
                if (window.confirm(`¿Eliminar este ${label}? Sus movimientos se conservan.`))
                  remove.mutate();
              }}
            >
              Eliminar
            </Button>
          )}
          <Button variant="secondary" onClick={onClose} className="ml-auto">
            Cancelar
          </Button>
          <Button type="submit" form="contact-form" loading={save.isPending}>
            Guardar
          </Button>
        </>
      }
    >
      <form id="contact-form" onSubmit={onSubmit} className="space-y-4" noValidate>
        <Input
          label="Nombre del negocio o persona"
          value={form.name}
          onChange={set('name')}
          error={errors.name}
          autoFocus
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Persona de contacto"
            value={form.contact_name}
            onChange={set('contact_name')}
          />
          <Input
            label="Teléfono"
            type="tel"
            inputMode="tel"
            placeholder="5X XXX XXX"
            value={form.phone}
            onChange={set('phone')}
            error={errors.phone}
          />
        </div>
        <Select label="Municipio" value={form.municipality} onChange={set('municipality')}>
          <option value="">— Sin especificar —</option>
          {MUNICIPIOS_HABANA.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </Select>
        {table === 'suppliers' && (
          <Input
            label="¿Qué le vende?"
            placeholder="Ej. pollo, aceite"
            value={form.products}
            onChange={set('products')}
          />
        )}
        <Textarea label="Notas" value={form.notes} onChange={set('notes')} />
        {(save.error ?? remove.error) && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {humanizeError(save.error ?? remove.error)}
          </p>
        )}
      </form>
    </Dialog>
  );
}
