export type SnapshotReason = 'interval' | 'manual' | 'startup';
export type ActivityType = 'created' | 'navigated' | 'activated' | 'updated' | 'closed' | 'restored';

export interface TabStateV1 {
  logicalId: string;
  runtimeId?: number;
  windowRef: string;
  groupRef?: string;
  index: number;
  url: string;
  title: string;
  favIconUrl?: string;
  pinned: boolean;
  active: boolean;
  discarded: boolean;
  frozen: boolean;
  lastAccessed?: number;
}

export type TabGroupColor = 'grey' | 'blue' | 'red' | 'yellow' | 'green' | 'pink' | 'purple' | 'cyan' | 'orange';
export interface GroupStateV1 { id: string; windowRef: string; title: string; color: TabGroupColor; collapsed: boolean; }
export interface WindowStateV1 { id: string; runtimeId?: number; focused: boolean; top?: number; left?: number; width?: number; height?: number; tabs: TabStateV1[]; groups: GroupStateV1[]; }
export interface SessionStateV1 { schemaVersion: 1; capturedAt: number; windows: WindowStateV1[]; }
export interface SessionSnapshotV1 { id: string; createdAt: number; reason: SnapshotReason; label?: string; stateHash: string; tabCount: number; windowCount: number; sleepingCount: number; pinnedCount: number; groupedCount: number; }
export interface StateBlobV1 { hash: string; state: SessionStateV1; }
export interface LogicalTabV1 { id: string; runId: string; runtimeTabId: number; createdAt: number; closedAt?: number; openerId?: string; title: string; lastUrl: string; windowId?: number; }
export interface ActivityEventV1 { id: string; tabId: string; timestamp: number; type: ActivityType; url?: string; title?: string; domain?: string; windowId?: number; groupId?: number; transitionType?: string; transitionQualifiers?: string[]; }
export interface ArchiveVisitV1 { id: string; timestamp: number; url: string; title: string; domain: string; }
export interface SettingsV1 { key: 'settings'; excludedDomains: string[]; captureIntervalMinutes: number; importLegacyHistory: boolean; }
export interface ExportBundleV1 { schemaVersion: 1; exportedAt: number; snapshots: SessionSnapshotV1[]; states: StateBlobV1[]; logicalTabs: LogicalTabV1[]; events: ActivityEventV1[]; archive: ArchiveVisitV1[]; settings: SettingsV1; }

export type RuntimeRequest =
  | { type: 'CREATE_SNAPSHOT'; label?: string }
  | { type: 'RESTORE_SNAPSHOT'; snapshotId: string }
  | { type: 'ACTIVATE_TAB'; runtimeTabId: number; windowId?: number }
  | { type: 'ACTIVATE_LOGICAL_TAB'; logicalTabId: string; fallbackUrl?: string }
  | { type: 'GET_OPEN_TABS' }
  | { type: 'CLOSE_TAB'; runtimeTabId: number }
  | { type: 'OPEN_URL'; url: string }
  | { type: 'IMPORT_HISTORY' };
