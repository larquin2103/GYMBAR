import {
  collection,
  doc,
  deleteDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  type Timestamp,
} from 'firebase/firestore';
import { isFirebaseConfigured, getDb } from '@/shared/lib/firebase';

const DEVICE_KEY = 'gymbar-device-id';

/** Id estable de este dispositivo/navegador (persistente en localStorage). */
export function getDeviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return 'device';
  }
}

/** Etiqueta legible del dispositivo a partir del user agent. */
export function getDeviceLabel(): string {
  const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent;
  const browser = /Edg/.test(ua)
    ? 'Edge'
    : /OPR|Opera/.test(ua)
      ? 'Opera'
      : /Chrome/.test(ua)
        ? 'Chrome'
        : /Firefox/.test(ua)
          ? 'Firefox'
          : /Safari/.test(ua)
            ? 'Safari'
            : 'Navegador';
  const os = /Windows/.test(ua)
    ? 'Windows'
    : /Android/.test(ua)
      ? 'Android'
      : /iPhone|iPad|iPod/.test(ua)
        ? 'iOS'
        : /Mac OS X/.test(ua)
          ? 'Mac'
          : /Linux/.test(ua)
            ? 'Linux'
            : '';
  return os ? `${browser} · ${os}` : browser;
}

/** Registra/actualiza este dispositivo en el gimnasio (última vez visto). */
export async function touchDevice(orgId: string): Promise<void> {
  if (!isFirebaseConfigured || !orgId) return;
  try {
    await setDoc(
      doc(getDb(), 'organizations', orgId, 'devices', getDeviceId()),
      { label: getDeviceLabel(), lastSeenAt: serverTimestamp() },
      { merge: true },
    );
  } catch {
    // sin conexión: se reintenta al reconectar
  }
}

export interface DeviceInfo {
  id: string;
  label: string;
  lastSeenAt: Date | null;
  isThis: boolean;
}

/** Escucha en vivo los dispositivos vinculados al gimnasio. */
export function subscribeDevices(orgId: string, cb: (devices: DeviceInfo[]) => void): () => void {
  if (!isFirebaseConfigured || !orgId) {
    cb([]);
    return () => {};
  }
  const thisId = getDeviceId();
  const q = query(
    collection(getDb(), 'organizations', orgId, 'devices'),
    orderBy('lastSeenAt', 'desc'),
  );
  return onSnapshot(
    q,
    (snap) => {
      cb(
        snap.docs.map((d) => {
          const x = d.data();
          const ts = x.lastSeenAt as Timestamp | undefined;
          return {
            id: d.id,
            label: (x.label as string) ?? 'Dispositivo',
            lastSeenAt: ts?.toDate?.() ?? null,
            isThis: d.id === thisId,
          };
        }),
      );
    },
    () => cb([]),
  );
}

/** Desvincula un dispositivo (deja de aparecer; volverá si se vuelve a usar). */
export async function removeDevice(orgId: string, id: string): Promise<void> {
  if (!isFirebaseConfigured) return;
  await deleteDoc(doc(getDb(), 'organizations', orgId, 'devices', id));
}
