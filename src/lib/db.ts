import Dexie, { type EntityTable } from 'dexie';
import type { ActivityEventV1, ArchiveVisitV1, ExportBundleV1, LogicalTabV1, SessionSnapshotV1, SettingsV1, StateBlobV1 } from './types';

export class PKSessionDB extends Dexie {
  snapshots!: EntityTable<SessionSnapshotV1, 'id'>;
  states!: EntityTable<StateBlobV1, 'hash'>;
  logicalTabs!: EntityTable<LogicalTabV1, 'id'>;
  events!: EntityTable<ActivityEventV1, 'id'>;
  archive!: EntityTable<ArchiveVisitV1, 'id'>;
  settings!: EntityTable<SettingsV1, 'key'>;
  constructor() {
    super('pk-session-v1');
    this.version(1).stores({
      snapshots: 'id, createdAt, reason, stateHash',
      states: 'hash',
      logicalTabs: 'id, [runId+runtimeTabId], runId, runtimeTabId, createdAt, closedAt',
      events: 'id, tabId, timestamp, type, domain, [tabId+timestamp]',
      archive: 'id, timestamp, domain, url',
      settings: 'key',
    });
  }
}

export const db = new PKSessionDB();
export const defaultSettings: SettingsV1 = { key: 'settings', excludedDomains: [], captureIntervalMinutes: 15, importLegacyHistory: false };

export async function getSettings() { return (await db.settings.get('settings')) ?? defaultSettings; }
export async function exportBundle(): Promise<ExportBundleV1> {
  const [snapshots, states, logicalTabs, events, archive, settings] = await Promise.all([db.snapshots.toArray(), db.states.toArray(), db.logicalTabs.toArray(), db.events.toArray(), db.archive.toArray(), getSettings()]);
  return { schemaVersion: 1, exportedAt: Date.now(), snapshots, states, logicalTabs, events, archive, settings };
}
export async function importBundle(bundle: ExportBundleV1) {
  if (bundle?.schemaVersion !== 1 || !Array.isArray(bundle.snapshots) || !Array.isArray(bundle.states)) throw new Error('Format de sauvegarde incompatible.');
  await db.transaction('rw', [db.snapshots, db.states, db.logicalTabs, db.events, db.archive, db.settings], async () => {
    await Promise.all([db.snapshots.bulkPut(bundle.snapshots), db.states.bulkPut(bundle.states), db.logicalTabs.bulkPut(bundle.logicalTabs ?? []), db.events.bulkPut(bundle.events ?? []), db.archive.bulkPut(bundle.archive ?? []), db.settings.put(bundle.settings ?? defaultSettings)]);
  });
}
