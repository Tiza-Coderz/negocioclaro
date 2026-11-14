/**
 * Comprime una foto (vale, factura) en el navegador antes de subirla:
 * máx. 1280 px de lado y WebP calidad 0.7. Una foto de móvil de 4 MB queda en
 * ~100–200 KB: clave con datos móviles caros y conexiones lentas.
 */
export async function compressImage(
  file: File,
  { maxSide = 1280, quality = 0.7 }: { maxSide?: number; quality?: number } = {},
): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new Error('El archivo debe ser una imagen.');
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo procesar la imagen.');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/webp', quality),
  );
  if (!blob) throw new Error('No se pudo comprimir la imagen.');
  return blob;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
