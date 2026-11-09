import { supabase } from './supabase';

const BUCKET = 'ga-media';
const MAX_LADO = 2000;

/** Reduce la imagen en el navegador (máx. 2000 px, JPEG 85%) antes de subirla. */
async function optimizar(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const escala = Math.min(1, MAX_LADO / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * escala);
  canvas.height = Math.round(bitmap.height * escala);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('No se pudo procesar la imagen'))), 'image/jpeg', 0.85),
  );
}

/** Sube una imagen al bucket público y devuelve su URL. */
export async function subirImagen(file: File, carpeta: 'tours' | 'promos'): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('El archivo debe ser una imagen');
  const blob = await optimizar(file);
  const nombre = `${carpeta}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const { error } = await supabase.storage.from(BUCKET).upload(nombre, blob, {
    contentType: 'image/jpeg',
    cacheControl: '31536000',
  });
  if (error) throw new Error(error.message);
  return supabase.storage.from(BUCKET).getPublicUrl(nombre).data.publicUrl;
}

/** Borra del bucket una imagen subida desde el panel (ignora las de /public). */
export async function borrarImagen(url: string) {
  const marca = `/storage/v1/object/public/${BUCKET}/`;
  const i = url.indexOf(marca);
  if (i === -1) return;
  await supabase.storage.from(BUCKET).remove([url.slice(i + marca.length)]);
}
