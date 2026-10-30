// Small helpers shared by every AI chat in the app.

// Always returns parsed JSON. If the server answers with an HTML page (for example a missing route),
// we turn it into a readable error instead of "Unexpected token '<'".
export async function postJson<T = any>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const raw = await res.text();
  let data: any = null;
  try { data = raw ? JSON.parse(raw) : null; } catch { /* not JSON */ }
  if (!data) {
    throw new Error(res.status === 404 || raw.trim().startsWith('<')
      ? 'The AI service could not be reached. Please restart the server (npm run dev) and try again.'
      : 'The server sent an unexpected answer. Please try again.');
  }
  if (!res.ok || data.success === false) throw new Error(data.error || 'Something went wrong. Please try again.');
  return data as T;
}

export interface ChatImagePayload { mimeType: string; data: string; preview: string }

// Shrinks a picked image so it is quick to upload (max 1280px, JPEG).
export function fileToChatImage(file: File): Promise<ChatImagePayload> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('Please choose an image file.'));
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that image.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Could not open that image.'));
      img.onload = () => {
        const scale = Math.min(1, 1280 / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale); canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        const thumbScale = Math.min(1, 220 / Math.max(img.width, img.height));
        const t = document.createElement('canvas');
        t.width = Math.round(img.width * thumbScale); t.height = Math.round(img.height * thumbScale);
        t.getContext('2d')!.drawImage(img, 0, 0, t.width, t.height);
        resolve({ mimeType: 'image/jpeg', data: dataUrl.split(',')[1], preview: t.toDataURL('image/jpeg', 0.6) });
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

type StoreKind = 'local' | 'session';
const store = (kind: StoreKind) => (kind === 'session' ? sessionStorage : localStorage);
export function loadJson<T>(key: string | null, fallback: T, kind: StoreKind = 'local'): T {
  if (!key) return fallback;
  try { const v = store(kind).getItem(key); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
}
export function saveJson(key: string | null, value: unknown, kind: StoreKind = 'local') {
  if (!key) return;
  try { store(kind).setItem(key, JSON.stringify(value)); } catch { /* storage full, ignore */ }
}
