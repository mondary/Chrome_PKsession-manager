export type GroupColor = 'blue' | 'cyan' | 'green' | 'grey' | 'orange' | 'pink' | 'purple' | 'red' | 'yellow';

export interface TabGroup { id: string; title: string; color: GroupColor; collapsed: boolean }
export interface TabState { id: string; parentId?: string; runtimeId?: number; windowId?: number; title: string; url: string; favicon?: string; thumbnail?: string; index: number; groupId?: string; pinned: boolean; sleeping: boolean; active: boolean }
export interface SessionState { groups: TabGroup[]; tabs: TabState[] }
export interface SessionVersion { id: string; number: number; createdAt: number; reason: 'change' | 'manual' | 'startup'; stateHash: string; state: SessionState }
export interface TabVisit { id: string; tabId: string; at: number; title: string; url: string; kind: 'created' | 'navigated' | 'closed' }
export interface Workspace { id: string; name: string; createdAt: number }
export interface LogicalTab { id: string; runtimeId: number; parentId?: string; title: string; url: string; thumbnail?: string; createdAt: number; closedAt?: number }

export type RuntimeRequest =
  | { type: 'CAPTURE_VERSION'; reason?: SessionVersion['reason'] }
  | { type: 'RESTORE_VERSION'; versionId: string }
  | { type: 'OPEN_TAB'; tabId: string; url: string }
  | { type: 'CLOSE_TAB'; runtimeId: number };

export function diffVersions(previous: SessionVersion | undefined, current: SessionVersion) {
  const before = new Map(previous?.state.tabs.map((tab) => [tab.id, tab]) ?? []);
  const after = new Map(current.state.tabs.map((tab) => [tab.id, tab]));
  return {
    added: current.state.tabs.filter((tab) => !before.has(tab.id)),
    removed: previous?.state.tabs.filter((tab) => !after.has(tab.id)) ?? [],
    changed: current.state.tabs.filter((tab) => {
      const old = before.get(tab.id);
      return old && (old.url !== tab.url || old.groupId !== tab.groupId || old.index !== tab.index || old.sleeping !== tab.sleeping);
    }),
  };
}

export const domainOf = (url: string) => {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
};

export const isTrackableUrl = (url?: string) => Boolean(url && /^https?:\/\//.test(url));
