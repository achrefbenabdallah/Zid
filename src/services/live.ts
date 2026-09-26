import { useEffect, useState } from 'react';
import { onSnapshot, type DocumentReference, type Query } from 'firebase/firestore';

/**
 * Subscribe to a Firestore query and return its documents as `{ id, ...data }`.
 * `key` must change whenever the query changes (queries aren't referentially stable).
 */
export function useLiveQuery<T extends { id: string }>(build: () => Query | null, key: string) {
  const [state, setState] = useState<{ data: T[]; loading: boolean; error?: Error }>({ data: [], loading: true });

  useEffect(() => {
    const q = build();
    if (!q) {
      setState({ data: [], loading: false });
      return;
    }
    setState((s) => ({ ...s, loading: true }));
    return onSnapshot(
      q,
      (snap) => setState({ data: snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T), loading: false }),
      (error) => {
        console.error(`[firestore] query ${key} failed:`, error);
        setState({ data: [], loading: false, error });
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
