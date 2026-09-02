import { db } from './db';
import { isTrackableUrl, stateSignature, type GroupColor, type LogicalTab, type SessionState, type SessionVersion, type TabState, type TabVisit } from './model';

const WORKSPACE_ID = 'default';
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
  const latest = await db.versions.orderBy('number').last();
  const reusable = latest?.state.tabs
    .filter((saved) => saved.url === (tab.url ?? tab.pendingUrl) && !Object.values(mapping).includes(saved.id))
    .sort((a, b) => Math.abs(a.index - tab.index) - Math.abs(b.index - tab.index))[0];
  const openerId = tab.openerTabId == null ? undefined : mapping[tab.openerTabId];
  const record: LogicalTab = { id: reusable?.id ?? crypto.randomUUID(), runtimeId: tab.id, parentId: reusable?.parentId ?? openerId, title: tab.title ?? 'Nouvel onglet', url: tab.url ?? tab.pendingUrl ?? '', createdAt: Date.now() };
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
      state.tabs.push({ id: logical.id, parentId: logical.parentId, runtimeId: tab.id, windowId: tab.windowId, title: tab.title ?? url, url, favicon: tab.favIconUrl, thumbnail: logical.thumbnail, index: tab.index, groupId: tab.groupId >= 0 ? String(tab.groupId) : undefined, pinned: tab.pinned, sleeping: tab.discarded || Boolean(tab.frozen), active: tab.active });
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
  const latest = await db.versions.orderBy('number').last();
  if (latest?.stateHash === stateHash) return latest;
  const version: SessionVersion = { id: crypto.randomUUID(), number: (latest?.number ?? 0) + 1, createdAt: Date.now(), reason, stateHash, state };
  await db.transaction('rw', db.workspaces, db.versions, async () => {
    await db.workspaces.put({ id: WORKSPACE_ID, name: 'Espace de navigation', createdAt: Date.now() });
    await db.versions.add(version);
  });
  return version;
}

export async function restoreVersion(versionId: string) {
  const version = await db.versions.get(versionId);
  if (!version) throw new Error('Version introuvable.');
  const tabs = [...version.state.tabs].sort((a, b) => a.index - b.index);
  if (!tabs.length) return 0;
  const createdWindow = await chrome.windows.create({ url: tabs[0].url, focused: true });
  if (!createdWindow || createdWindow.id == null || createdWindow.tabs?.[0]?.id == null) return 0;
  const windowId = createdWindow.id;
  const firstTabId = createdWindow.tabs[0].id;
  const ids = new Map<string, number>([[tabs[0].id, firstTabId]]);
  await chrome.tabs.update(firstTabId, { pinned: tabs[0].pinned });
  for (const tab of tabs.slice(1)) {
    const created = await chrome.tabs.create({ windowId, url: tab.url, active: false, pinned: tab.pinned });
    if (created.id != null) ids.set(tab.id, created.id);
  }
  for (const group of version.state.groups) {
    const tabIds = tabs.filter((tab) => tab.groupId === group.id).map((tab) => ids.get(tab.id)).filter((id): id is number => id != null);
    if (!tabIds.length) continue;
    const groupId = await new Promise<number>((resolve, reject) => chrome.tabs.group({ tabIds: tabIds as [number, ...number[]], createProperties: { windowId } }, (id) => chrome.runtime.lastError ? reject(new Error(chrome.runtime.lastError.message)) : resolve(id)));
    await chrome.tabGroups.update(groupId, { title: group.title, color: group.color, collapsed: group.collapsed });
  }
  const active = tabs.find((tab) => tab.active);
  if (active && ids.get(active.id) != null) await chrome.tabs.update(ids.get(active.id)!, { active: true });
  return tabs.length;
}
