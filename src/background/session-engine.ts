import { db, getSettings } from '@/lib/db';
import { domainOf, hashState, isTrackableUrl } from '@/lib/domain';
import type { ActivityEventV1, ActivityType, SessionSnapshotV1, SessionStateV1, SnapshotReason, TabGroupColor, TabStateV1, WindowStateV1 } from '@/lib/types';

let runIdPromise: Promise<string> | undefined;

async function getRunId() {
  runIdPromise ??= (async () => {
    const stored = await chrome.storage.session.get('runId');
    if (typeof stored.runId === 'string') return stored.runId;
    const id = crypto.randomUUID();
    await chrome.storage.session.set({ runId: id });
    return id;
  })();
  return runIdPromise;
}

async function shouldExclude(url?: string, incognito = false) {
  if (!isTrackableUrl(url) || incognito) return true;
  const domain = domainOf(url);
  const settings = await getSettings();
  return settings.excludedDomains.some((excluded) => domain === excluded || domain.endsWith(`.${excluded}`));
}

export async function logicalIdFor(tab: chrome.tabs.Tab) {
  if (tab.id == null) return crypto.randomUUID();
  const runId = await getRunId();
  const existing = await db.logicalTabs.where('[runId+runtimeTabId]').equals([runId, tab.id]).first();
  if (existing) return existing.id;
  const id = crypto.randomUUID();
  let openerId: string | undefined;
  if (tab.openerTabId != null) {
    openerId = (await db.logicalTabs.where('[runId+runtimeTabId]').equals([runId, tab.openerTabId]).first())?.id;
  }
  await db.logicalTabs.add({ id, runId, runtimeTabId: tab.id, createdAt: Date.now(), openerId, title: tab.title ?? 'Nouvel onglet', lastUrl: tab.url ?? tab.pendingUrl ?? '', windowId: tab.windowId });
  return id;
}

export async function recordTabEvent(tab: chrome.tabs.Tab, type: ActivityType, details: Partial<ActivityEventV1> = {}) {
  const url = details.url ?? tab.url ?? tab.pendingUrl;
  if (await shouldExclude(url, tab.incognito)) return;
  const tabId = await logicalIdFor(tab);
  const event: ActivityEventV1 = { id: crypto.randomUUID(), tabId, timestamp: details.timestamp ?? Date.now(), type, url, title: details.title ?? tab.title ?? url, domain: domainOf(url), windowId: tab.windowId, groupId: tab.groupId, transitionType: details.transitionType, transitionQualifiers: details.transitionQualifiers };
  await db.transaction('rw', db.events, db.logicalTabs, async () => {
    await db.events.add(event);
    await db.logicalTabs.update(tabId, { title: event.title ?? '', lastUrl: url ?? '', windowId: tab.windowId, ...(type === 'closed' ? { closedAt: event.timestamp } : {}) });
  });
}

export async function recordClosedTab(tabId: number, removeInfo: { windowId: number; isWindowClosing: boolean }) {
  const runId = await getRunId();
  const logical = await db.logicalTabs.where('[runId+runtimeTabId]').equals([runId, tabId]).first();
  if (!logical) return;
  const timestamp = Date.now();
  await db.transaction('rw', db.events, db.logicalTabs, async () => {
    await db.events.add({ id: crypto.randomUUID(), tabId: logical.id, timestamp, type: 'closed', url: logical.lastUrl, title: logical.title, domain: domainOf(logical.lastUrl), windowId: removeInfo.windowId });
    await db.logicalTabs.update(logical.id, { closedAt: timestamp });
  });
}

async function buildState(): Promise<SessionStateV1> {
  const windows = await chrome.windows.getAll({ populate: true, windowTypes: ['normal'] });
  const capturedWindows: WindowStateV1[] = [];
  for (const [windowIndex, window] of windows.entries()) {
    if (window.incognito || window.id == null) continue;
    const windowRef = `w-${windowIndex}`;
    const groups = await chrome.tabGroups.query({ windowId: window.id });
    const groupMap = new Map(groups.map((group, index) => [group.id, `g-${windowIndex}-${index}`]));
    const tabs: TabStateV1[] = [];
    for (const tab of window.tabs ?? []) {
      const url = tab.url ?? tab.pendingUrl ?? '';
      if (await shouldExclude(url, tab.incognito)) continue;
      tabs.push({ logicalId: await logicalIdFor(tab), runtimeId: tab.id, windowRef, groupRef: groupMap.get(tab.groupId), index: tab.index, url, title: tab.title ?? url, favIconUrl: tab.favIconUrl, pinned: tab.pinned, active: tab.active, discarded: tab.discarded, frozen: Boolean(tab.frozen), lastAccessed: tab.lastAccessed });
    }
    capturedWindows.push({ id: windowRef, runtimeId: window.id, focused: window.focused, top: window.top, left: window.left, width: window.width, height: window.height, tabs, groups: groups.map((group) => ({ id: groupMap.get(group.id)!, windowRef, title: group.title ?? 'Sans titre', color: group.color as TabGroupColor, collapsed: group.collapsed })) });
  }
  return { schemaVersion: 1, capturedAt: Date.now(), windows: capturedWindows };
}

export async function createSnapshot(reason: SnapshotReason, label?: string) {
  const state = await buildState();
  const comparable = { ...state, capturedAt: 0, windows: state.windows.map((window) => ({ ...window, runtimeId: undefined, tabs: window.tabs.map((tab) => ({ ...tab, runtimeId: undefined, lastAccessed: undefined })) })) };
  const stateHash = await hashState(comparable);
  const latest = await db.snapshots.orderBy('createdAt').last();
  if (reason === 'interval' && latest?.stateHash === stateHash) return latest;
  const tabs = state.windows.flatMap((window) => window.tabs);
  const snapshot: SessionSnapshotV1 = { id: crypto.randomUUID(), createdAt: state.capturedAt, reason, label, stateHash, tabCount: tabs.length, windowCount: state.windows.length, sleepingCount: tabs.filter((tab) => tab.discarded || tab.frozen).length, pinnedCount: tabs.filter((tab) => tab.pinned).length, groupedCount: tabs.filter((tab) => tab.groupRef).length };
  await db.transaction('rw', db.states, db.snapshots, async () => { await db.states.put({ hash: stateHash, state }); await db.snapshots.add(snapshot); });
  return snapshot;
}

export async function restoreSnapshot(snapshotId: string) {
  const snapshot = await db.snapshots.get(snapshotId);
  if (!snapshot) throw new Error('Version introuvable.');
  const state = (await db.states.get(snapshot.stateHash))?.state;
  if (!state) throw new Error('Données de la version introuvables.');
  let restored = 0;
  for (const sourceWindow of state.windows) {
    const restorable = sourceWindow.tabs.filter((tab) => isTrackableUrl(tab.url)).sort((a, b) => a.index - b.index);
    if (!restorable.length) continue;
    const createdWindow = await chrome.windows.create({ url: restorable[0].url, focused: false, top: sourceWindow.top, left: sourceWindow.left, width: sourceWindow.width, height: sourceWindow.height });
    if (!createdWindow?.id) continue;
    const createdTabs = createdWindow.tabs ?? [];
    const mapping = new Map<string, number>();
    if (createdTabs[0]?.id != null) { mapping.set(restorable[0].logicalId, createdTabs[0].id); await chrome.tabs.update(createdTabs[0].id, { pinned: restorable[0].pinned }); }
    for (const tab of restorable.slice(1)) {
      const created = await chrome.tabs.create({ windowId: createdWindow.id, url: tab.url, active: false, pinned: tab.pinned });
      if (created.id != null) mapping.set(tab.logicalId, created.id);
    }
    for (const group of sourceWindow.groups) {
      const tabIds = restorable.filter((tab) => tab.groupRef === group.id).map((tab) => mapping.get(tab.logicalId)).filter((id): id is number => id != null);
      if (tabIds.length) {
        const groupId = await new Promise<number>((resolve, reject) => chrome.tabs.group({ tabIds: tabIds as [number, ...number[]], createProperties: { windowId: createdWindow.id! } }, (id) => chrome.runtime.lastError ? reject(new Error(chrome.runtime.lastError.message)) : resolve(id)));
        await chrome.tabGroups.update(groupId, { title: group.title, color: group.color, collapsed: group.collapsed });
      }
    }
    const activeSource = restorable.find((tab) => tab.active);
    const activeId = activeSource ? mapping.get(activeSource.logicalId) : undefined;
    if (activeId != null) await chrome.tabs.update(activeId, { active: true });
    for (const tab of restorable.filter((item) => item.discarded || item.frozen)) { const id = mapping.get(tab.logicalId); if (id != null && id !== activeId) { try { await chrome.tabs.discard(id); } catch { /* Chrome may refuse while loading. */ } } }
    restored += restorable.length;
  }
  return restored;
}

export async function activateLogicalTab(logicalTabId: string, fallbackUrl?: string) {
  const logical = await db.logicalTabs.get(logicalTabId);
  if (logical && !logical.closedAt) {
    try {
      const tab = await chrome.tabs.get(logical.runtimeTabId);
      await chrome.tabs.update(logical.runtimeTabId, { active: true });
      await chrome.windows.update(tab.windowId, { focused: true });
      return { mode: 'activated' as const };
    } catch { /* The original tab no longer exists. */ }
  }
  const url = fallbackUrl ?? logical?.lastUrl;
  if (!isTrackableUrl(url)) throw new Error('Cet onglet est fermé et son URL ne peut pas être rouverte.');
  await chrome.tabs.create({ url });
  return { mode: 'reopened' as const };
}

export async function getOpenTabs() {
  const tabs = await chrome.tabs.query({});
  const result: TabStateV1[] = [];
  for (const tab of tabs) {
    const url = tab.url ?? tab.pendingUrl ?? '';
    if (await shouldExclude(url, tab.incognito)) continue;
    result.push({ logicalId: await logicalIdFor(tab), runtimeId: tab.id, windowRef: String(tab.windowId), groupRef: tab.groupId >= 0 ? String(tab.groupId) : undefined, index: tab.index, url, title: tab.title ?? url, favIconUrl: tab.favIconUrl, pinned: tab.pinned, active: tab.active, discarded: tab.discarded, frozen: Boolean(tab.frozen), lastAccessed: tab.lastAccessed });
  }
  return result;
}

export async function importChromeHistory() {
  const granted = await chrome.permissions.request({ permissions: ['history'] });
  if (!granted) throw new Error('Permission d’historique refusée.');
  const items = await chrome.history.search({ text: '', startTime: 0, maxResults: 10000 });
  let count = 0;
  const eligible = items.filter((item) => isTrackableUrl(item.url));
  for (let index = 0; index < eligible.length; index += 40) {
    const batch = eligible.slice(index, index + 40);
    const rows = (await Promise.all(batch.map(async (item) => {
      const visits = await chrome.history.getVisits({ url: item.url! });
      return visits.map((visit) => ({ id: `history-${visit.id}`, timestamp: visit.visitTime ?? 0, url: item.url!, title: item.title || item.url!, domain: domainOf(item.url) }));
    }))).flat();
    await db.archive.bulkPut(rows);
    count += rows.length;
  }
  await db.settings.put({ ...(await getSettings()), importLegacyHistory: true });
  return count;
}
