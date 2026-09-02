import { captureThumbnail, captureVersion, recordClosed, recordVisit, restoreVersion } from '@/engine';
import { isTrackableUrl, type RuntimeRequest } from '@/model';
import { defineBackground } from 'wxt/utils/define-background';

const SNAPSHOT_ALARM = 'pk-session-version';
const CHANGE_ALARM = 'pk-session-change';
const scheduleCapture = () => void chrome.alarms.create(CHANGE_ALARM, { delayInMinutes: 0.25 });

async function updateBadge() {
  const tabs = await chrome.tabs.query({});
  const count = tabs.filter((tab) => !tab.incognito && isTrackableUrl(tab.url ?? tab.pendingUrl)).length;
  await chrome.action.setBadgeBackgroundColor({ color: '#1858d8' });
  await chrome.action.setBadgeText({ text: String(count) });
}

export default defineBackground(() => {
  chrome.action.onClicked.addListener(async () => {
    await captureVersion('manual');
    await updateBadge();
    const url = chrome.runtime.getURL('/app.html');
    const open = (await chrome.tabs.query({ url: `${url}*` }))[0];
    if (open?.id != null) { await chrome.tabs.update(open.id, { active: true }); return; }
    await chrome.tabs.create({ url, pinned: true });
  });
  chrome.runtime.onInstalled.addListener(() => { void captureVersion('startup'); void updateBadge(); });
  chrome.runtime.onStartup.addListener(() => { void captureVersion('startup'); void updateBadge(); });
  chrome.tabs.onCreated.addListener((tab) => { void recordVisit(tab, 'created'); void updateBadge(); scheduleCapture(); });
  chrome.tabs.onActivated.addListener(({ tabId }) => { void captureThumbnail(tabId).catch(() => undefined); });
  chrome.tabs.onRemoved.addListener((tabId) => { void recordClosed(tabId); void updateBadge(); scheduleCapture(); });
  chrome.tabs.onMoved.addListener(scheduleCapture);
  chrome.tabs.onUpdated.addListener((_id, change, tab) => { if (change.pinned != null || change.discarded != null || change.groupId != null) scheduleCapture(); });
  chrome.tabGroups.onCreated.addListener(scheduleCapture);
  chrome.tabGroups.onUpdated.addListener(scheduleCapture);
  chrome.tabGroups.onRemoved.addListener(scheduleCapture);
  chrome.webNavigation.onCommitted.addListener(async (details) => {
    if (details.frameId !== 0 || details.tabId < 0) return;
    try { await recordVisit(await chrome.tabs.get(details.tabId), 'navigated', details.url); await updateBadge(); scheduleCapture(); } catch { /* The tab closed during navigation. */ }
  });
  chrome.alarms.onAlarm.addListener((alarm) => { if (alarm.name === SNAPSHOT_ALARM || alarm.name === CHANGE_ALARM) void captureVersion(); });
  chrome.runtime.onMessage.addListener((request: RuntimeRequest, _sender, sendResponse) => {
    const action = request.type === 'CAPTURE_VERSION' ? captureVersion(request.reason ?? 'manual')
      : request.type === 'RESTORE_VERSION' ? restoreVersion(request.versionId)
      : request.type === 'CLOSE_TAB' ? chrome.tabs.remove(request.runtimeId)
      : dbOpen(request.tabId, request.url);
    void action.then((value) => sendResponse({ ok: true, value })).catch((error: Error) => sendResponse({ ok: false, error: error.message }));
    return true;
  });
  void chrome.alarms.create(SNAPSHOT_ALARM, { periodInMinutes: 15 });
  void updateBadge();
});

async function dbOpen(tabId: string, url: string) {
  await chrome.tabs.create({ url });
  return tabId;
}
