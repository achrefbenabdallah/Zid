import { useEffect, useState } from 'react';
import { onSnapshot, type DocumentReference, type Query } from 'firebase/firestore';

/**
 * Subscribe to a Firestore query and return its documents as `{ id, ...data }`.
 * `key` must change whenever the query changes (queries aren't referentially stable).
 */
export function useLiveQuery<T extends { id: string }>(build: () => Query | null, key: string) {
  /**
   * `loading` turns false on the first snapshot, which may come from the offline cache and be
   * incomplete (docs created on another device). `synced` turns true once the server has
   * confirmed the result — wait for it before building something from the data.
   */
  const [state, setState] = useState<{ data: T[]; loading: boolean; synced: boolean; error?: Error }>({ data: [], loading: true, synced: false });

  useEffect(() => {
    const q = build();
    if (!q) {
      setState({ data: [], loading: false, synced: true });
      return;
    }
    setState((s) => ({ ...s, loading: true, synced: false }));
    return onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snap) =>
        setState({ data: snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T), loading: false, synced: !snap.metadata.fromCache }),
      (error) => {
        console.error(`[firestore] query ${key} failed:`, error);
        setState({ data: [], loading: false, synced: true, error });
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return state;
}

export function useLiveDoc<T>(build: () => DocumentReference | null, key: string) {
  const [state, setState] = useState<{ data: T | null; loading: boolean; error?: Error }>({ data: null, loading: true });

  useEffect(() => {
    const ref = build();
    if (!ref) {
      setState({ data: null, loading: false });
      return;
    }
    return onSnapshot(
      ref,
      (snap) => setState({ data: snap.exists() ? (snap.data() as T) : null, loading: false }),
      (error) => setState({ data: null, loading: false, error }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return state;
}
