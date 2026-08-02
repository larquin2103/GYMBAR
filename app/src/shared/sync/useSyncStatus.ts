import { useCallback, useEffect, useState } from 'react';
import {
  doc,
  onSnapshot,
  getDocFromServer,
  enableNetwork,
  waitForPendingWrites,
} from 'firebase/firestore';
import { isFirebaseConfigured, getDb } from '@/shared/lib/firebase';
import { useOnlineStatus } from '@/shared/hooks/useOnlineStatus';

export type SyncState = 'local' | 'offline' | 'connecting' | 'syncing' | 'synced';

export interface SyncStatus {
  state: SyncState;
  /** Conectividad del sistema operativo (no garantiza servidor). */
  online: boolean;
  /** Hay escrituras locales aún sin confirmar por el servidor. */
  pending: boolean;
  /** Última vez que el servidor confirmó datos (ida y vuelta real). */
  lastSyncedAt: Date | null;
  /** true mientras corre un "sincronizar ahora" manual. */
  busy: boolean;
  /** ¿Hay nube (Firebase configurado)? En demo es false. */
  cloud: boolean;
  /** Fuerza reconexión y confirma contra el servidor. */
  syncNow: () => Promise<boolean>;
}

/**
 * Estado de sincronización con la nube, honesto: el verde ("Sincronizado") solo
 * aparece si hubo una ida y vuelta REAL con Firestore (snapshot con
 * metadata.fromCache === false). Que el SO diga "en línea" no basta: un
 * proxy/antivirus puede cortar Firestore y servir solo la caché. Inspirado en
 * la sync de contamypime.
 */
export function useSyncStatus(orgId: string | undefined): SyncStatus {
  const online = useOnlineStatus();
  const [confirmed, setConfirmed] = useState(false);
  const [pending, setPending] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isFirebaseConfigured || !orgId) return;
    const db = getDb();
    const ref = doc(db, 'organizations', orgId);
    const unsub = onSnapshot(
      ref,
      { includeMetadataChanges: true },
      (snap) => {
        setPending(snap.metadata.hasPendingWrites);
        if (!snap.metadata.fromCache) {
          setConfirmed(true);
          setLastSyncedAt(new Date());
        }
      },
      () => {
        // error de servidor: conserva el último estado conocido
      },
    );
    return unsub;
  }, [orgId]);

  const syncNow = useCallback(async (): Promise<boolean> => {
    if (!isFirebaseConfigured || !orgId) return false;
    setBusy(true);
    try {
      const db = getDb();
      await enableNetwork(db);
      await waitForPendingWrites(db);
      await getDocFromServer(doc(db, 'organizations', orgId));
      setConfirmed(true);
      setLastSyncedAt(new Date());
      return true;
    } catch {
      return false;
    } finally {
      setBusy(false);
    }
  }, [orgId]);

  let state: SyncState;
  if (!isFirebaseConfigured) state = 'local';
  else if (!online) state = 'offline';
  else if (busy || pending) state = 'syncing';
  else if (!confirmed) state = 'connecting';
  else state = 'synced';

  return { state, online, pending, lastSyncedAt, busy, cloud: isFirebaseConfigured, syncNow };
}
