import { tokenManager } from './authMiddleware';

export async function downloadDocument(link) {
  const url = new URL(link, window.location.origin);
  if (url.origin !== window.location.origin || !/^\/api\/files\/[a-f\d]{24}$/i.test(url.pathname)) {
    throw new Error('Invalid document link');
  }
  const token = tokenManager.getToken();
  if (!token) throw new Error('Please sign in to download this document');
  const response = await fetch(url.href, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error('Unable to download document');
  const blob = await response.blob();
  const filename = response.headers.get('content-disposition')?.match(/filename="([a-zA-Z0-9._-]+)"/)?.[1] || 'document';
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
