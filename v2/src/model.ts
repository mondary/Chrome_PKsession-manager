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
  | { type: 'ACTIVATE_TAB'; runtimeId?: number; windowId?: number; url: string }
  | { type: 'CLOSE_TAB'; runtimeId: number };

export function diffVersions(previous: SessionVersion | undefined, current: SessionVersion) {
  const before = previous?.state.tabs ?? [];
  const matched = new Set<string>();
  const added: TabState[] = [];
  const changed: TabState[] = [];
  for (const tab of current.state.tabs) {
    const old = before.find((item) => item.id === tab.id) ?? before.find((item) => item.url === tab.url && !matched.has(item.id));
    if (!old) { added.push(tab); continue; }
    matched.add(old.id);
    if (old.url !== tab.url || old.groupId !== tab.groupId || old.index !== tab.index || old.sleeping !== tab.sleeping || old.pinned !== tab.pinned) changed.push(tab);
  }
  return { added, removed: before.filter((tab) => !matched.has(tab.id)), changed };
}

export function stateSignature(state: SessionState) {
  const groups = new Map(state.groups.map((group) => [group.id, `${group.title}|${group.color}|${group.collapsed}`]));
  const tabs = state.tabs.map((tab) => ({ url: tab.url, index: tab.index, group: tab.groupId ? groups.get(tab.groupId) : '', pinned: tab.pinned, sleeping: tab.sleeping })).sort((a, b) => a.index - b.index || a.url.localeCompare(b.url));
  return JSON.stringify(tabs);
}

export function compactVersions(versions: SessionVersion[]) {
  return versions.filter((version, index) => index === versions.length - 1 || stateSignature(version.state) !== stateSignature(versions[index + 1].state));
}

export const domainOf = (url: string) => {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
};

export const isTrackableUrl = (url?: string) => Boolean(url && /^https?:\/\//.test(url));
