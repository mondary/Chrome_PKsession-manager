import type { ActivityEventV1, SessionSnapshotV1, SessionStateV1 } from './types';

const now = Date.now();
const hour = 3_600_000;
const tab = (logicalId: string, title: string, url: string, index: number, extras: Partial<SessionStateV1['windows'][number]['tabs'][number]> = {}) => ({ logicalId, runtimeId: 100 + index, windowRef: 'w-0', index, title, url, favIconUrl: '', pinned: false, active: false, discarded: false, frozen: false, lastAccessed: now - index * 180_000, ...extras });
const extraDomains = ['medium.com', 'github.com', 'notion.so', 'developer.chrome.com', 'linear.app', 'figma.com'];
const demoExtraTabs = Array.from({ length: 66 }, (_, offset) => {
  const index = offset + 12;
  const domain = extraDomains[offset % extraDomains.length];
  return tab(`extra-${offset}`, `Onglet de travail ${String(offset + 1).padStart(2, '0')}`, `https://${domain}/pk-session/${offset + 1}`, index, { discarded: offset < 25, pinned: offset < 4, groupRef: offset < 34 ? (offset < 17 ? 'g-pk' : 'g-search') : undefined });
});

export const demoState: SessionStateV1 = {
  schemaVersion: 1,
  capturedAt: now,
  windows: [{
    id: 'w-0', runtimeId: 1, focused: true,
    groups: [
      { id: 'g-pk', windowRef: 'w-0', title: 'Projet PK', color: 'green', collapsed: false },
      { id: 'g-search', windowRef: 'w-0', title: 'Recherche', color: 'blue', collapsed: true },
    ],
    tabs: [
      tab('pk', 'PK — Roadmap produit', 'https://notion.so/PK-roadmap-produit', 0, { active: true, pinned: true, groupRef: 'g-pk' }),
      tab('figma', 'PK — Design système — Figma', 'https://figma.com/file/pk-session', 1, { pinned: true, groupRef: 'g-pk' }),
      tab('github', 'pk/session-manager', 'https://github.com/pk/session-manager', 2, { groupRef: 'g-pk' }),
      tab('store', 'Chrome Web Store — PK Session', 'https://chrome.google.com/webstore', 3, { groupRef: 'g-pk', discarded: true }),
      tab('docs', 'Spécifications MVP', 'https://docs.google.com/document/pk-session', 4, { groupRef: 'g-pk' }),
      tab('calendar', 'Planning — Semaine 26', 'https://calendar.google.com', 5, { groupRef: 'g-pk', discarded: true }),
      tab('react', 'React — useTransition', 'https://react.dev/reference/react/useTransition', 6, { groupRef: 'g-search' }),
      tab('shadcn', 'Shadcn UI Data Table', 'https://ui.shadcn.com/docs/components/data-table', 7, { groupRef: 'g-search' }),
      tab('mdn', 'MDN Web Docs — Reference', 'https://developer.mozilla.org', 8),
      tab('stackoverflow', 'Stack Overflow — Web Developers', 'https://stackoverflow.com', 9, { discarded: true }),
      tab('youtube', 'YouTube — Product Management', 'https://youtube.com/watch?v=pk', 10, { discarded: true }),
      tab('linear', 'Linear — Roadmap', 'https://linear.app', 11),
      ...demoExtraTabs,
    ],
  }],
};

export const demoSnapshots: SessionSnapshotV1[] = [
  { id: 'yesterday', createdAt: now - 24 * hour, reason: 'interval', stateHash: 'demo', tabCount: 123, windowCount: 7, sleepingCount: 54, pinnedCount: 8, groupedCount: 70 },
  { id: 'hour', createdAt: now - hour, reason: 'interval', stateHash: 'demo', tabCount: 34, windowCount: 3, sleepingCount: 12, pinnedCount: 4, groupedCount: 22 },
  { id: 'now', createdAt: now, reason: 'manual', label: 'Maintenant', stateHash: 'demo', tabCount: 78, windowCount: 5, sleepingCount: 29, pinnedCount: 6, groupedCount: 42 },
];

const base = new Date(); base.setHours(8, 0, 0, 0);
const at = (hours: number, minutes = 0) => base.getTime() + (hours - 8) * hour + minutes * 60_000;
const ev = (tabId: string, timestamp: number, title: string, url: string, type: ActivityEventV1['type'] = 'navigated'): ActivityEventV1 => ({ id: `${tabId}-${timestamp}`, tabId, timestamp, type, title, url, domain: new URL(url).hostname.replace('www.', ''), windowId: 1 });
export const demoEvents: ActivityEventV1[] = [
  ev('pk', at(8, 14), 'PK — Brief produit', 'https://notion.so/pk-brief', 'activated'),
  ev('pk', at(8, 15), 'PK — Brief produit', 'https://notion.so/pk-brief'), ev('pk', at(9, 2), 'Spécifications v1', 'https://notion.so/pk-specs'), ev('pk', at(10, 11), 'Roadmap produit', 'https://notion.so/pk-roadmap'),
  ev('search', at(10, 46), 'Recherche', 'https://google.com', 'activated'),
  ev('search', at(10, 47), 'React Server Components', 'https://google.com/search?q=react+server'), ev('search', at(11, 21), 'useTransition hook', 'https://google.com/search?q=useTransition'), ev('search', at(12, 3), 'Shadcn UI Data Table', 'https://google.com/search?q=shadcn+table'), ev('search', at(13, 2), 'Recherche fermée', 'https://google.com', 'closed'),
  ev('docs', at(13, 9), 'Documentation', 'https://react.dev', 'activated'),
  ev('docs', at(9, 35), 'useTransition — React Docs', 'https://react.dev/reference/react/useTransition'), ev('docs', at(11, 45), 'TanStack Table Docs', 'https://tanstack.com/table'), ev('docs', at(13, 10), 'Radix UI Primitives', 'https://radix-ui.com/primitives'),
  ev('youtube', at(13, 34), 'YouTube', 'https://youtube.com', 'activated'),
  ev('youtube', at(13, 35), 'Build a SaaS Roadmap', 'https://youtube.com/watch?v=roadmap'), ev('youtube', at(14, 8), 'Product Roadmap Tips', 'https://youtube.com/watch?v=tips'), ev('youtube', at(14, 55), 'Nouvel onglet', 'https://youtube.com', 'created'),
  ev('mail', at(8, 42), 'Boîte de réception (12)', 'https://mail.google.com'), ev('mail', at(9, 18), 'Re: Kickoff projet PK', 'https://mail.google.com/thread/kickoff'), ev('mail', at(9, 54), 'Newsletter — Produit', 'https://mail.google.com/thread/news'), ev('mail', at(10, 47), 'Emails fermé', 'https://mail.google.com', 'closed'),
  ev('pk', at(15, 11), 'PK — Brief produit', 'https://notion.so/pk-brief', 'activated'), ev('pk', at(15, 12), 'PK — Brief produit', 'https://notion.so/pk-brief'), ev('pk', at(16, 3), 'Tâches à faire', 'https://notion.so/pk-tasks'), ev('pk', at(17, 22), 'Décisions', 'https://notion.so/pk-decisions'), ev('pk', at(18, 42), 'PK — Roadmap produit', 'https://notion.so/pk-roadmap'),
].sort((a, b) => a.timestamp - b.timestamp);
