export type GroupColor = 'blue' | 'cyan' | 'green' | 'grey' | 'orange' | 'pink' | 'purple' | 'red' | 'yellow';

export interface TabGroup { id: string; title: string; color: GroupColor; collapsed: boolean }
export interface TabState { id: string; parentId?: string; openedFromUrl?: string; runtimeId?: number; windowId?: number; title: string; url: string; favicon?: string; thumbnail?: string; index: number; groupId?: string; pinned: boolean; sleeping: boolean; active: boolean }
export interface SessionState { groups: TabGroup[]; tabs: TabState[] }
export interface SessionVersion { id: string; workspaceId?: string; number: number; createdAt: number; reason: 'change' | 'manual' | 'startup'; stateHash: string; state: SessionState }
export interface TabVisit { id: string; tabId: string; at: number; title: string; url: string; kind: 'created' | 'navigated' | 'activated' | 'closed' }
export interface Workspace { id: string; name: string; createdAt: number }
export interface LogicalTab { id: string; runtimeId: number; parentId?: string; openedFromUrl?: string; title: string; url: string; thumbnail?: string; createdAt: number; closedAt?: number }
export interface SessionBackup { format: 'pk-session-v2'; version: 1; exportedAt: number; workspaces: Workspace[]; versions: SessionVersion[]; tabs: LogicalTab[]; visits: TabVisit[] }

export type RuntimeRequest =
  | { type: 'CAPTURE_VERSION'; reason?: SessionVersion['reason'] }
  | { type: 'RESTORE_VERSION'; versionId: string }
  | { type: 'OPEN_TAB'; tabId: string; url: string }
  | { type: 'ACTIVATE_TAB'; runtimeId?: number; windowId?: number; url: string }
  | { type: 'CLOSE_TAB'; runtimeId: number }
  | { type: 'SWITCH_WORKSPACE'; workspaceId: string }
  | { type: 'CREATE_WORKSPACE'; name: string };

export function diffVersions(previous: SessionVersion | undefined, current: SessionVersion) {
  const before = previous?.state.tabs ?? [];
  const matched = new Set<string>();
  const added: TabState[] = [];
  const changed: TabState[] = [];
  for (const tab of current.state.tabs) {
    const old = before.find((item) => item.id === tab.id) ?? before.find((item) => item.url === tab.url && !matched.has(item.id));
    if (!old) { added.push(tab); continue; }
    matched.add(old.id);
    if (old.url !== tab.url || old.groupId !== tab.groupId || old.index !== tab.index || old.sleeping !== tab.sleeping || old.pinned !== tab.pinned || windowSignature(previous!.state, old) !== windowSignature(current.state, tab)) changed.push(tab);
  }
  return { added, removed: before.filter((tab) => !matched.has(tab.id)), changed };
}

export function stateSignature(state: SessionState) {
  const groups = new Map(state.groups.map((group) => [group.id, `${group.title}|${group.color}|${group.collapsed}`]));
  const tabs = state.tabs.map((tab) => ({ window: windowSignature(state, tab), url: tab.url, index: tab.index, group: tab.groupId ? groups.get(tab.groupId) : '', pinned: tab.pinned, sleeping: tab.sleeping })).sort((a, b) => a.window.localeCompare(b.window) || a.index - b.index || a.url.localeCompare(b.url));
  return JSON.stringify(tabs);
}

const windowSignature = (state: SessionState, tab: TabState) => JSON.stringify(state.tabs.filter((item) => item.windowId === tab.windowId).sort((a, b) => a.index - b.index).map((item) => item.url));

export function compactVersions(versions: SessionVersion[]) {
  return versions.filter((version, index) => version.reason === 'manual' || index === versions.length - 1 || stateSignature(version.state) !== stateSignature(versions[index + 1].state));
}

const rowsHaveIds = (rows: unknown): rows is { id: string }[] => Array.isArray(rows) && rows.every((row) => typeof row === 'object' && row !== null && typeof (row as { id?: unknown }).id === 'string');

export function isSessionBackup(value: unknown): value is SessionBackup {
  if (typeof value !== 'object' || value === null) return false;
  const backup = value as Partial<SessionBackup>;
  return backup.format === 'pk-session-v2' && backup.version === 1 && typeof backup.exportedAt === 'number' && rowsHaveIds(backup.workspaces) && rowsHaveIds(backup.tabs) && rowsHaveIds(backup.visits) && Array.isArray(backup.versions) && backup.versions.every((item) => typeof item?.id === 'string' && typeof item.number === 'number' && Array.isArray(item.state?.tabs) && Array.isArray(item.state?.groups));
}

export function relatedTabIds(tabs: TabState[], focusedId?: string) {
  if (!focusedId) return new Set(tabs.map((tab) => tab.id));
  const related = new Set([focusedId]);
  let size = 0;
  while (size !== related.size) {
    size = related.size;
    for (const tab of tabs) if (related.has(tab.id) || (tab.parentId && related.has(tab.parentId))) { related.add(tab.id); if (tab.parentId) related.add(tab.parentId); }
  }
  return related;
}

export const domainOf = (url: string) => {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
};

export const isTrackableUrl = (url?: string) => Boolean(url && /^https?:\/\//.test(url));
