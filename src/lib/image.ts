/**
 * Downscale a photo in the browser. Phone photos are 3–12 MB; the vision model only
 * needs ~1024 px, and the stored thumbnail (Firestore, free plan) must stay ~20 KB.
 */
export async function resizeImage(file: Blob, maxSide: number, quality: number, type = 'image/jpeg'): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Image encode failed'))), type, quality),
  );
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

/** ~320 px WebP thumbnail as a data URL, typically 10–25 KB. */
export async function makeThumbnail(file: Blob): Promise<string> {
  const small = await resizeImage(file, 320, 0.7, 'image/webp');
  return blobToDataUrl(small);
}
