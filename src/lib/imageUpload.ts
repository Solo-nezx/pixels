/**
 * Client-side image handling for uploads from the user's device.
 *
 * The project runs on Firebase's free (Spark) plan, where Cloud Storage is not
 * provisioned, so uploads are compressed in the browser and stored inline as
 * JPEG data URLs. Firestore caps a document at 1 MB, and base64 inflates bytes
 * by ~33%, so the byte budgets here are deliberately small.
 */

/** Reject absurd inputs early rather than decoding a 100 MB file. */
const MAX_INPUT_BYTES = 25 * 1024 * 1024;

export interface CompressOptions {
  /** Longest edge of the output, in px. */
  maxDim?: number;
  /** Target maximum encoded size, in bytes (before base64 inflation). */
  maxBytes?: number;
}

export const isImageFile = (file: File): boolean => file.type.startsWith('image/');

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file);
    } catch {
      /* fall through to <img> decoding */
    }
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('decode_failed')); };
    img.src = url;
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('read_failed'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Downscale + re-encode an image so it fits the given byte budget.
 * Tries decreasing JPEG quality first, then shrinks the canvas, so photos keep
 * as much resolution as the budget allows.
 *
 * @throws 'not_an_image' | 'file_too_large' | 'decode_failed' | 'compress_failed'
 */
export async function compressImage(
  file: File,
  { maxDim = 900, maxBytes = 100_000 }: CompressOptions = {},
): Promise<string> {
  if (!isImageFile(file)) throw new Error('not_an_image');
  if (file.size > MAX_INPUT_BYTES) throw new Error('file_too_large');

  const bitmap = await loadBitmap(file);
  const srcW = (bitmap as ImageBitmap).width;
  const srcH = (bitmap as ImageBitmap).height;
  const close = () => {
    if ('close' in bitmap && typeof (bitmap as ImageBitmap).close === 'function') {
      (bitmap as ImageBitmap).close();
    }
  };

  let scale = Math.min(1, maxDim / Math.max(srcW, srcH));

  try {
    for (let attempt = 0; attempt < 5; attempt++) {
      const w = Math.max(1, Math.round(srcW * scale));
      const h = Math.max(1, Math.round(srcH * scale));

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('compress_failed');
      // Flatten onto white so transparent PNGs don't turn black as JPEG.
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(bitmap as CanvasImageSource, 0, 0, w, h);

      for (const quality of [0.82, 0.7, 0.58, 0.45]) {
        const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', quality));
        if (blob && blob.size <= maxBytes) return await blobToDataUrl(blob);
      }
      scale *= 0.75; // still over budget — shrink and try again
    }
  } finally {
    close();
  }

  throw new Error('compress_failed');
}

/** Localised message for a compressImage rejection. */
export function uploadErrorMessage(err: unknown, isAr: boolean): string {
  const code = err instanceof Error ? err.message : '';
  if (code === 'not_an_image') return isAr ? 'الملف ليس صورة.' : 'That file is not an image.';
  if (code === 'file_too_large') return isAr ? 'الصورة كبيرة جداً (الحد 25 ميجابايت).' : 'Image is too large (25 MB max).';
  return isAr ? 'تعذّر معالجة الصورة.' : 'Could not process that image.';
}

/** Rough byte size of a data URL's payload (for total-post budgeting). */
export const dataUrlBytes = (dataUrl: string): number =>
  dataUrl.startsWith('data:') ? Math.ceil((dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75) : 0;
