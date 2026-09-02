import Dexie, { type EntityTable } from 'dexie';
import type { LogicalTab, SessionVersion, TabVisit, Workspace } from './model';

class SessionDb extends Dexie {
  workspaces!: EntityTable<Workspace, 'id'>;
  versions!: EntityTable<SessionVersion, 'id'>;
  tabs!: EntityTable<LogicalTab, 'id'>;
  visits!: EntityTable<TabVisit, 'id'>;

  constructor() {
    super('pk-session-v2');
    this.version(1).stores({
      workspaces: 'id, createdAt',
      versions: 'id, number, createdAt, stateHash',
      tabs: 'id, runtimeId, parentId, createdAt, closedAt',
      visits: 'id, tabId, at, kind, [tabId+at]',
    });
    this.version(2).stores({ versions: 'id, workspaceId, number, createdAt, stateHash' });
  }
}

export const db = new SessionDb();
