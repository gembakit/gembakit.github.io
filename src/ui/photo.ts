// Fotos tomadas en planta: se reducen en el teléfono antes de guardarlas
// (lado mayor de 1280 px, JPEG) para que no llenen el almacenamiento ni la
// sincronización. Se guardan como texto (data URL) dentro de la medición.

export const MAX_SIDE = 1280;
export const QUALITY = 0.72;

/** Medidas que caben en un cuadrado de `max` sin deformar. */
export function fitSize(w: number, h: number, max = MAX_SIDE): { w: number; h: number } {
  const k = Math.min(1, max / Math.max(w, h));
  return { w: Math.max(1, Math.round(w * k)), h: Math.max(1, Math.round(h * k)) };
}

/** Lee una foto del teléfono y la devuelve reducida como data URL JPEG. */
export async function compressPhoto(file: Blob, max = MAX_SIDE, quality = QUALITY): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('photo'));
      i.src = url;
    });
    const { w, h } = fitSize(img.naturalWidth || img.width, img.naturalHeight || img.height, max);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas');
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL('image/jpeg', quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}
