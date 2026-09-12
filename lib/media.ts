import { put } from '@vercel/blob';
import { runtime } from './db';
import { AppError } from './validation';

// Leave room for multipart overhead below Vercel Functions' request limit.
export const maxImageBytes = 4 * 1024 * 1024;
export async function storeImage(key: string, bytes: Uint8Array, contentType: string) {
  if (!runtime('BLOB_READ_WRITE_TOKEN')) throw new AppError('Image storage is not configured. Connect a Vercel Blob store.', 503);
  const blob = await put('products/' + key, Buffer.from(bytes), { access: 'public', contentType, addRandomSuffix: false, cacheControlMaxAge: 31536000 });
  return blob.url;
}
