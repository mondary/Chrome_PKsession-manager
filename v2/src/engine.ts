import { db } from './db';
import { isTrackableUrl, stateSignature, type GroupColor, type LogicalTab, type SessionState, type SessionVersion, type TabState, type TabVisit } from './model';

const DEFAULT_WORKSPACE_ID = 'default';
const ACTIVE_WORKSPACE_KEY = 'activeWorkspaceId';
async function activeWorkspaceId() {
  const stored = await chrome.storage.local.get(ACTIVE_WORKSPACE_KEY);
  return (stored[ACTIVE_WORKSPACE_KEY] as string | undefined) ?? DEFAULT_WORKSPACE_ID;
}
async function runtimeMap() {
  const stored = await chrome.storage.session.get('tabIdentities');
  return (stored.tabIdentities ?? {}) as Record<number, string>;
}

async function logicalTab(tab: chrome.tabs.Tab) {
  if (tab.id == null) throw new Error('Onglet sans identifiant.');
  const mapping = await runtimeMap();
  if (mapping[tab.id]) {
    const existing = await db.tabs.get(mapping[tab.id]);
    if (existing) return existing;
  }
  const workspaceId = await activeWorkspaceId();
  const latest = (await db.versions.toArray()).filter((item) => (item.workspaceId ?? DEFAULT_WORKSPACE_ID) === workspaceId).sort((a, b) => b.number - a.number)[0];
  const reusable = latest?.state.tabs
    .filter((saved) => saved.url === (tab.url ?? tab.pendingUrl) && !Object.values(mapping).includes(saved.id))
    .sort((a, b) => Math.abs(a.index - tab.index) - Math.abs(b.index - tab.index))[0];
  const opener = tab.openerTabId == null ? undefined : await chrome.tabs.get(tab.openerTabId).catch(() => undefined);
  const openerId = tab.openerTabId == null ? undefined : mapping[tab.openerTabId];
  const record: LogicalTab = { id: reusable?.id ?? crypto.randomUUID(), runtimeId: tab.id, parentId: reusable?.parentId ?? openerId, openedFromUrl: reusable?.openedFromUrl ?? opener?.url, title: tab.title ?? 'Nouvel onglet', url: tab.url ?? tab.pendingUrl ?? '', createdAt: Date.now() };
  mapping[tab.id] = record.id;
  await Promise.all([db.tabs.put(record), chrome.storage.session.set({ tabIdentities: mapping })]);
  return record;
}

export async function recordVisit(tab: chrome.tabs.Tab, kind: TabVisit['kind'], url = tab.url ?? tab.pendingUrl ?? '') {
  if (!isTrackableUrl(url) || tab.incognito) return;
  const logical = await logicalTab(tab);
  const visit: TabVisit = { id: crypto.randomUUID(), tabId: logical.id, at: Date.now(), title: tab.title ?? url, url, kind };
  await db.transaction('rw', db.tabs, db.visits, async () => {
    await db.visits.add(visit);
    await db.tabs.update(logical.id, { title: visit.title, url, ...(kind === 'closed' ? { closedAt: visit.at } : {}) });
  });
}

export async function recordClosed(runtimeId: number) {
  const mapping = await runtimeMap();
  const logical = mapping[runtimeId] ? await db.tabs.get(mapping[runtimeId]) : undefined;
  if (!logical) return;
  await db.visits.add({ id: crypto.randomUUID(), tabId: logical.id, at: Date.now(), title: logical.title, url: logical.url, kind: 'closed' });
  await db.tabs.update(logical.id, { closedAt: Date.now() });
  delete mapping[runtimeId];
  await chrome.storage.session.set({ tabIdentities: mapping });
}

export async function captureThumbnail(runtimeId: number) {
  const tab = await chrome.tabs.get(runtimeId);
  if (!isTrackableUrl(tab.url ?? tab.pendingUrl) || tab.incognito) return;
  const logical = await logicalTab(tab);
  await new Promise((resolve) => setTimeout(resolve, 350));
  const [active] = await chrome.tabs.query({ active: true, windowId: tab.windowId });
  if (active?.id !== runtimeId) return;
  const thumbnail = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'jpeg', quality: 55 });
  await db.tabs.update(logical.id, { thumbnail });
}

async function buildState(): Promise<SessionState> {
  const windows = await chrome.windows.getAll({ populate: true, windowTypes: ['normal'] });
  const state: SessionState = { groups: [], tabs: [] };
  for (const window of windows) {
    if (window.id == null || window.incognito) continue;
    const groups = await chrome.tabGroups.query({ windowId: window.id });
    for (const group of groups) state.groups.push({ id: String(group.id), title: group.title || 'Sans titre', color: group.color as GroupColor, collapsed: group.collapsed });
    for (const tab of window.tabs ?? []) {
      const url = tab.url ?? tab.pendingUrl ?? '';
      if (!isTrackableUrl(url) || tab.incognito) continue;
      const logical = await logicalTab(tab);
      state.tabs.push({ id: logical.id, parentId: logical.parentId, openedFromUrl: logical.openedFromUrl, runtimeId: tab.id, windowId: tab.windowId, title: tab.title ?? url, url, favicon: tab.favIconUrl, thumbnail: logical.thumbnail, index: tab.index, groupId: tab.groupId >= 0 ? String(tab.groupId) : undefined, pinned: tab.pinned, sleeping: tab.discarded || Boolean(tab.frozen), active: tab.active });
    }
  }
  return state;
}

const hashState = async (state: SessionState) => {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(stateSignature(state)));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('');
};

export async function captureVersion(reason: SessionVersion['reason'] = 'change') {
  const state = await buildState();
  const stateHash = await hashState(state);
  const workspaceId = await activeWorkspaceId();
  const latest = (await db.versions.toArray()).filter((item) => (item.workspaceId ?? DEFAULT_WORKSPACE_ID) === workspaceId).sort((a, b) => b.number - a.number)[0];
  if (latest?.stateHash === stateHash && reason !== 'manual') return latest;
  const version: SessionVersion = { id: crypto.randomUUID(), workspaceId, number: (latest?.number ?? 0) + 1, createdAt: Date.now(), reason, stateHash, state };
  await db.transaction('rw', db.workspaces, db.versions, async () => {
    const existing = await db.workspaces.get(workspaceId);
    await db.workspaces.put(existing ?? { id: workspaceId, name: workspaceId === DEFAULT_WORKSPACE_ID ? 'Session principale' : 'Session', createdAt: Date.now() });
    await db.versions.add(version);
  });
  return version;
}

export async function switchWorkspace(workspaceId: string) {
  await captureVersion('change');
  const tabs = await chrome.tabs.query({});
  await chrome.tabs.remove(tabs.filter((tab) => !tab.incognito && isTrackableUrl(tab.url ?? tab.pendingUrl) && tab.id != null).map((tab) => tab.id!));
  await chrome.storage.local.set({ [ACTIVE_WORKSPACE_KEY]: workspaceId });
  const latest = (await db.versions.toArray()).filter((item) => (item.workspaceId ?? DEFAULT_WORKSPACE_ID) === workspaceId).sort((a, b) => b.number - a.number)[0];
  if (latest) await restoreVersion(latest.id);
  return latest?.id ?? (await captureVersion('change')).id;
}

export async function createWorkspace(name: string) {
  const id = crypto.randomUUID();
  await db.workspaces.add({ id, name, createdAt: Date.now() });
  await switchWorkspace(id);
  return id;
}

export async function restoreVersion(versionId: string) {
  const version = await db.versions.get(versionId);
  if (!version) throw new Error('Version introuvable.');
  const tabs = [...version.state.tabs].sort((a, b) => a.index - b.index);
  if (!tabs.length) return 0;
  const windows = new Map<number, TabState[]>();
  for (const tab of tabs) {
    const windowId = tab.windowId ?? 0;
    const windowTabs = windows.get(windowId);
    if (windowTabs) windowTabs.push(tab);
    else windows.set(windowId, [tab]);
  }
  let restored = 0;
  for (const windowTabs of windows.values()) {
    const createdWindow = await chrome.windows.create({ url: windowTabs[0].url, focused: restored === 0 });
    if (!createdWindow || createdWindow.id == null || createdWindow.tabs?.[0]?.id == null) continue;
    const windowId = createdWindow.id;
    const firstTabId = createdWindow.tabs[0].id;
    const ids = new Map<string, number>([[windowTabs[0].id, firstTabId]]);
    await chrome.tabs.update(firstTabId, { pinned: windowTabs[0].pinned });
    for (const tab of windowTabs.slice(1)) {
      const created = await chrome.tabs.create({ windowId, url: tab.url, active: false, pinned: tab.pinned });
      if (created.id != null) ids.set(tab.id, created.id);
    }
    for (const group of version.state.groups) {
      const tabIds = windowTabs.filter((tab) => tab.groupId === group.id).map((tab) => ids.get(tab.id)).filter((id): id is number => id != null);
      if (!tabIds.length) continue;
      const groupId = await new Promise<number>((resolve, reject) => chrome.tabs.group({ tabIds: tabIds as [number, ...number[]], createProperties: { windowId } }, (id) => chrome.runtime.lastError ? reject(new Error(chrome.runtime.lastError.message)) : resolve(id)));
      await chrome.tabGroups.update(groupId, { title: group.title, color: group.color, collapsed: group.collapsed });
    }
    const active = windowTabs.find((tab) => tab.active);
    if (active && ids.get(active.id) != null) await chrome.tabs.update(ids.get(active.id)!, { active: true });
    restored += windowTabs.length;
  }
  return restored;
}
