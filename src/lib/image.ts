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

/** Firestore rule limit for a stored thumbnail (see firestore.rules → mealPhotos). */
export const MAX_THUMB_CHARS = 200_000;

/**
 * ~320 px thumbnail as a data URL, typically 10–25 KB.
 * Safari can't *encode* WebP (canvas.toBlob silently returns a PNG that can be 10× bigger),
 * so fall back to JPEG, and shrink until it fits the Firestore limit with a safety margin.
 */
export async function makeThumbnail(file: Blob, maxSide = 320): Promise<string | null> {
  const attempts: [number, number, string][] = [
    [maxSide, 0.7, 'image/webp'],
    [maxSide, 0.7, 'image/jpeg'],
    [Math.round(maxSide * 0.75), 0.6, 'image/jpeg'],
    [Math.round(maxSide * 0.5), 0.5, 'image/jpeg'],
  ];
  for (const [side, quality, type] of attempts) {
    const blob = await resizeImage(file, side, quality, type);
    if (blob.type !== type) continue; // encoder not supported here
    const url = await blobToDataUrl(blob);
    if (url.length < MAX_THUMB_CHARS * 0.75) return url;
  }
  return null; // no photo rather than a rejected save
}
