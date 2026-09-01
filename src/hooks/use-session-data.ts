import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { demoEvents, demoSnapshots, demoState } from '@/lib/demo';
import { hasExtensionRuntime } from '@/lib/runtime';

export function useSnapshots() {
  const value = useLiveQuery(() => db.snapshots.orderBy('createdAt').toArray(), []);
  return value?.length ? value : hasExtensionRuntime() ? value ?? [] : demoSnapshots;
}
export function useSnapshotState(stateHash?: string) {
  const value = useLiveQuery(() => stateHash && stateHash !== 'demo' ? db.states.get(stateHash) : undefined, [stateHash]);
  return value?.state ?? (!hasExtensionRuntime() || stateHash === 'demo' ? demoState : undefined);
}
export function useEvents() {
  const value = useLiveQuery(() => db.events.orderBy('timestamp').toArray(), []);
  return value?.length ? value : hasExtensionRuntime() ? value ?? [] : demoEvents;
}
