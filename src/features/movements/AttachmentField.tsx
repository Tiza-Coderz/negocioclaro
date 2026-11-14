import { useEffect, useId, useMemo, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { attachmentUrl } from '@/data/repositories/movements';
import { compressImage, formatBytes } from '@/lib/image';

/** Foto del vale o factura: se comprime a WebP en el móvil antes de subir. */
export function AttachmentField({
  existingPath,
  onRemoveExisting,
  photo,
  onPhoto,
}: {
  existingPath: string | null;
  onRemoveExisting: () => void;
  photo: Blob | null;
  onPhoto: (b: Blob | null) => void;
}) {
  const id = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [originalSize, setOriginalSize] = useState<number | null>(null);

  // URL temporal para la vista previa; se libera al cambiar de foto o desmontar.
  const preview = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo]);
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  async function openExisting() {
    if (!existingPath) return;
    try {
      window.open(await attachmentUrl(existingPath), '_blank', 'noopener');
    } catch {
      setError('No se pudo abrir el comprobante.');
    }
  }

  return (
    <div className="space-y-2">
      <span className="block text-sm font-medium text-slate-700">
        Foto del vale o factura (opcional)
      </span>

      {existingPath && !photo && (
        <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm ring-1 ring-slate-200">
          <Icon name="paperclip" className="size-4 text-slate-500" />
          <button
            type="button"
            className="text-brand-700 flex-1 text-left font-medium underline"
            onClick={() => void openExisting()}
          >
            Ver comprobante
          </button>
          <button
            type="button"
            className="text-red-700"
            onClick={onRemoveExisting}
            aria-label="Quitar comprobante"
          >
            <Icon name="trash" className="size-4" />
          </button>
        </div>
      )}

      {preview ? (
        <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-2 ring-1 ring-slate-200">
          <img
            src={preview}
            alt="Vista previa del comprobante"
            className="size-16 rounded-lg object-cover"
          />
          <div className="flex-1 text-xs text-slate-600">
            <p className="font-medium text-slate-800">Foto lista</p>
            <p>
              {originalSize ? `${formatBytes(originalSize)} → ` : ''}
              {formatBytes(photo?.size ?? 0)}
            </p>
          </div>
          <button
            type="button"
            className="p-2 text-red-700"
            onClick={() => onPhoto(null)}
            aria-label="Quitar foto"
          >
            <Icon name="trash" className="size-4" />
          </button>
        </div>
      ) : (
        <label
          htmlFor={id}
          className="has-[:focus-visible]:ring-brand-500 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 px-3 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 has-[:focus-visible]:ring-2"
        >
          {busy ? <Spinner className="size-4" /> : <Icon name="camera" className="size-5" />}
          {busy ? 'Comprimiendo…' : existingPath ? 'Reemplazar foto' : 'Tomar o elegir foto'}
          <input
            id={id}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (!file) return;
              setError(null);
              setBusy(true);
              try {
                setOriginalSize(file.size);
                onPhoto(await compressImage(file));
              } catch (err) {
                setError(err instanceof Error ? err.message : 'No se pudo procesar la foto.');
              } finally {
                setBusy(false);
              }
            }}
          />
        </label>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
