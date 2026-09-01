import { activateLogicalTab, createSnapshot, getOpenTabs, importChromeHistory, recordClosedTab, recordTabEvent, restoreSnapshot } from '@/background/session-engine';
import type { RuntimeRequest } from '@/lib/types';
import { defineBackground } from 'wxt/utils/define-background';

const ALARM_NAME = 'pk-session-snapshot';
const CHANGE_ALARM_NAME = 'pk-session-change';

function scheduleStructuralSnapshot() {
  void chrome.alarms.create(CHANGE_ALARM_NAME, { delayInMinutes: 0.5 });
}

async function ensureAlarm() {
  if (!(await chrome.alarms.get(ALARM_NAME))) await chrome.alarms.create(ALARM_NAME, { periodInMinutes: 15 });
}

async function openApp() {
  const url = chrome.runtime.getURL('/app.html');
  const existing = (await chrome.tabs.query({ url: `${url}*` }))[0];
  if (existing?.id != null) { await chrome.tabs.update(existing.id, { active: true, pinned: true }); if (existing.windowId != null) await chrome.windows.update(existing.windowId, { focused: true }); return; }
  await chrome.tabs.create({ url, pinned: true });
}

export default defineBackground(() => {
  chrome.action.onClicked.addListener(openApp);
  chrome.runtime.onInstalled.addListener(() => { void ensureAlarm(); void createSnapshot('startup'); });
  chrome.runtime.onStartup.addListener(() => { void ensureAlarm(); void createSnapshot('startup'); });
  chrome.alarms.onAlarm.addListener((alarm) => { if (alarm.name === ALARM_NAME || alarm.name === CHANGE_ALARM_NAME) void createSnapshot('interval'); });
  chrome.tabs.onCreated.addListener((tab) => { void recordTabEvent(tab, 'created'); scheduleStructuralSnapshot(); });
  chrome.tabs.onActivated.addListener(async ({ tabId }) => { try { void recordTabEvent(await chrome.tabs.get(tabId), 'activated'); } catch { /* Tab disappeared. */ } });
  chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => { if (changeInfo.pinned != null || changeInfo.discarded != null || changeInfo.frozen != null || changeInfo.groupId != null) { void recordTabEvent(tab, 'updated'); scheduleStructuralSnapshot(); } });
  chrome.tabs.onRemoved.addListener((tabId, info) => { void recordClosedTab(tabId, info); scheduleStructuralSnapshot(); });
  chrome.tabs.onMoved.addListener(scheduleStructuralSnapshot);
  chrome.tabs.onAttached.addListener(scheduleStructuralSnapshot);
  chrome.tabs.onDetached.addListener(scheduleStructuralSnapshot);
  chrome.tabGroups.onCreated.addListener(scheduleStructuralSnapshot);
  chrome.tabGroups.onUpdated.addListener(scheduleStructuralSnapshot);
  chrome.tabGroups.onMoved.addListener(scheduleStructuralSnapshot);
  chrome.tabGroups.onRemoved.addListener(scheduleStructuralSnapshot);
  chrome.webNavigation.onCommitted.addListener(async (details) => { if (details.frameId !== 0 || details.tabId < 0) return; try { const tab = await chrome.tabs.get(details.tabId); void recordTabEvent(tab, 'navigated', { url: details.url, timestamp: details.timeStamp, transitionType: details.transitionType, transitionQualifiers: details.transitionQualifiers }); scheduleStructuralSnapshot(); } catch { /* Tab disappeared. */ } });
  chrome.runtime.onMessage.addListener((request: RuntimeRequest, _sender, sendResponse) => {
    const handle = async () => {
      switch (request.type) {
        case 'CREATE_SNAPSHOT': return createSnapshot('manual', request.label);
        case 'RESTORE_SNAPSHOT': return { restored: await restoreSnapshot(request.snapshotId) };
        case 'ACTIVATE_TAB': await chrome.tabs.update(request.runtimeTabId, { active: true }); if (request.windowId != null) await chrome.windows.update(request.windowId, { focused: true }); return { ok: true };
        case 'ACTIVATE_LOGICAL_TAB': return activateLogicalTab(request.logicalTabId, request.fallbackUrl);
        case 'GET_OPEN_TABS': return getOpenTabs();
        case 'CLOSE_TAB': await chrome.tabs.remove(request.runtimeTabId); return { ok: true };
        case 'OPEN_URL': await chrome.tabs.create({ url: request.url }); return { ok: true };
        case 'IMPORT_HISTORY': return { imported: await importChromeHistory() };
      }
    };
    void handle().then((value) => sendResponse({ ok: true, value })).catch((error: Error) => sendResponse({ ok: false, error: error.message }));
    return true;
  });
  void ensureAlarm();
});
