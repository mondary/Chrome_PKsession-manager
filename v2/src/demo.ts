import type { SessionVersion, TabGroup, TabState, TabVisit, Workspace } from './model';

const now = Date.now();
const minute = 60_000;
const groups: TabGroup[] = [
  { id: 'build', title: 'Build', color: 'blue', collapsed: false },
  { id: 'research', title: 'Research', color: 'purple', collapsed: false },
  { id: 'admin', title: 'Admin', color: 'orange', collapsed: false },
];
const makeTab = (id: string, title: string, url: string, index: number, extra: Partial<TabState> = {}): TabState => ({ id, title, url, index, pinned: false, sleeping: false, active: false, ...extra });
const catalog = [
  makeTab('roadmap', 'Product roadmap', 'https://notion.so/product-roadmap', 0, { groupId: 'build', pinned: true }),
  makeTab('repo', 'PK Session Manager', 'https://github.com/pk/session-manager', 1, { groupId: 'build', active: true, parentId: 'roadmap' }),
  makeTab('issues', 'Issues · PK Session', 'https://github.com/pk/session-manager/issues', 2, { groupId: 'build', parentId: 'repo' }),
  makeTab('chrome', 'Chrome Extensions docs', 'https://developer.chrome.com/docs/extensions', 3, { groupId: 'research', parentId: 'repo' }),
  makeTab('storage', 'Storage and cookies', 'https://developer.chrome.com/docs/extensions/storage', 4, { groupId: 'research', parentId: 'chrome' }),
  makeTab('dexie', 'Dexie.js documentation', 'https://dexie.org/docs', 5, { groupId: 'research', parentId: 'storage', sleeping: true }),
  makeTab('figma', 'Session timeline · Figma', 'https://figma.com/file/session-timeline', 6, { groupId: 'build', parentId: 'roadmap' }),
  makeTab('linear', 'V2 launch · Linear', 'https://linear.app/pk/project/v2-launch', 7, { groupId: 'build', parentId: 'roadmap' }),
  makeTab('mail', 'Inbox (4)', 'https://mail.google.com', 8, { groupId: 'admin', pinned: true }),
  makeTab('calendar', 'September 2026', 'https://calendar.google.com', 9, { groupId: 'admin' }),
  makeTab('workona', 'Workona product notes', 'https://workona.com', 10, { groupId: 'research', parentId: 'roadmap', sleeping: true }),
  makeTab('tablerone', 'Tablerone comparison', 'https://tabler.one', 11, { groupId: 'research', parentId: 'workona', sleeping: true }),
  makeTab('store', 'Chrome Web Store dashboard', 'https://chrome.google.com/webstore/devconsole', 12, { groupId: 'admin', parentId: 'repo' }),
];

const counts = [10, 11, 12, 13, 9];
export const versions: SessionVersion[] = counts.map((count, index) => {
  const tabs = index === 4 ? catalog.filter((tab) => !['issues', 'dexie', 'workona', 'tablerone'].includes(tab.id)) : catalog.slice(0, count);
  return {
    id: `v${index + 18}`,
    number: index + 18,
    createdAt: now - (counts.length - 1 - index) * 17 * minute,
    reason: index === counts.length - 1 ? 'manual' : 'change',
    stateHash: `state-${index}`,
    state: { groups, tabs: tabs.map((tab, tabIndex) => ({ ...tab, index: tabIndex })) },
  };
});

const visit = (tabId: string, offset: number, title: string, url: string, kind: TabVisit['kind'] = 'navigated'): TabVisit => ({ id: `${tabId}-${offset}`, tabId, at: now - offset * minute, title, url, kind });
export const visits: TabVisit[] = [
  visit('roadmap', 112, 'Product brief', 'https://notion.so/product-brief', 'created'),
  visit('roadmap', 94, 'User stories', 'https://notion.so/user-stories'),
  visit('roadmap', 51, 'Product roadmap', 'https://notion.so/product-roadmap'),
  visit('repo', 88, 'PK Session Manager', 'https://github.com/pk/session-manager', 'created'),
  visit('repo', 62, 'Background engine', 'https://github.com/pk/session-manager/blob/main/background.ts'),
  visit('repo', 8, 'PK Session Manager', 'https://github.com/pk/session-manager'),
  visit('chrome', 76, 'Extension architecture', 'https://developer.chrome.com/docs/extensions/develop/concepts', 'created'),
  visit('chrome', 58, 'Chrome tabs API', 'https://developer.chrome.com/docs/extensions/reference/api/tabs'),
  visit('chrome', 32, 'Chrome tabGroups API', 'https://developer.chrome.com/docs/extensions/reference/api/tabGroups'),
  visit('workona', 43, 'Workona Spaces', 'https://workona.com/spaces', 'created'),
  visit('workona', 19, 'Workona product notes', 'https://workona.com'),
  visit('workona', 4, 'Workona closed', 'https://workona.com', 'closed'),
  visit('figma', 67, 'Session map', 'https://figma.com/file/session-map', 'created'),
  visit('figma', 22, 'Session timeline', 'https://figma.com/file/session-timeline'),
].sort((a, b) => a.at - b.at);

export const workspace: Workspace = { id: 'default', name: 'PK Session · V2', createdAt: now - 12 * 24 * 60 * minute };
