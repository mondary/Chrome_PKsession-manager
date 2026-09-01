import { useMemo, useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ArchiveRestore, ChevronDown, ChevronLeft, ChevronRight, GitBranch, History, Moon, MoreHorizontal, Pin, Play, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useEvents, useSnapshots, useSnapshotState } from '@/hooks/use-session-data';
import { hasExtensionRuntime, sendRuntime } from '@/lib/runtime';
import type { ActivityEventV1, SessionSnapshotV1, TabStateV1 } from '@/lib/types';
import { cn } from '@/lib/utils';

type Filter = 'all' | 'active' | 'sleeping' | 'pinned' | 'grouped';

export function SessionsPage() {
  const snapshots = useSnapshots();
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const selectedSnapshot = snapshots[selectedIndex < 0 ? snapshots.length - 1 : Math.min(selectedIndex, snapshots.length - 1)];
  const state = useSnapshotState(selectedSnapshot?.stateHash);
  const events = useEvents();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState<TabStateV1>();
  const [snapshotToRestore, setSnapshotToRestore] = useState<SessionSnapshotV1>();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const allTabs = useMemo(() => state?.windows.flatMap((window) => window.tabs) ?? [], [state]);
  const visible = useMemo(() => allTabs.filter((tab) => {
    if (filter === 'active' && (tab.discarded || tab.frozen)) return false;
    if (filter === 'sleeping' && !tab.discarded && !tab.frozen) return false;
    if (filter === 'pinned' && !tab.pinned) return false;
    if (filter === 'grouped' && !tab.groupRef) return false;
    return !query || `${tab.title} ${tab.url}`.toLowerCase().includes(query.toLowerCase());
  }), [allTabs, filter, query]);
  const counts = { all: allTabs.length, active: allTabs.filter((tab) => !tab.discarded && !tab.frozen).length, sleeping: allTabs.filter((tab) => tab.discarded || tab.frozen).length, pinned: allTabs.filter((tab) => tab.pinned).length, grouped: allTabs.filter((tab) => tab.groupRef).length };

  async function activateTab(tab: TabStateV1) { try { const result = await sendRuntime<{ mode: 'activated' | 'reopened' }>({ type: 'ACTIVATE_LOGICAL_TAB', logicalTabId: tab.logicalId, fallbackUrl: tab.url }); if (result.mode === 'reopened') toast.info('L’onglet était fermé : la page a été rouverte.'); } catch (error) { toast.error((error as Error).message); } }
  async function restore() { if (!snapshotToRestore) return; try { const result = await sendRuntime<{ restored: number }>({ type: 'RESTORE_SNAPSHOT', snapshotId: snapshotToRestore.id }); toast.success(`${result.restored} onglets restaurés dans de nouvelles fenêtres`); setSnapshotToRestore(undefined); } catch (error) { toast.error((error as Error).message); } }
  const currentIndex = selectedIndex < 0 ? snapshots.length - 1 : selectedIndex;

  return <div className="page sessions-page">
    <header className="sessions-header"><div className="sessions-heading"><h1>Sessions</h1><p>{selectedSnapshot ? `${selectedSnapshot.tabCount} onglets · ${selectedSnapshot.windowCount} fenêtres` : 'Lecture des onglets…'}</p></div><div className="compact-history-controls"><Button variant="outline" size="icon-sm" disabled={currentIndex <= 0} onClick={() => setSelectedIndex(Math.max(0, currentIndex - 1))} aria-label="Session précédente"><ChevronLeft /></Button><div className="compact-version-summary"><span>{selectedSnapshot ? snapshotLabel(selectedSnapshot) : 'Aucune version'}</span><strong>{selectedSnapshot ? `${selectedSnapshot.tabCount} onglets · ${selectedSnapshot.windowCount} fenêtres` : '—'}</strong></div><Button variant="outline" size="icon-sm" disabled={currentIndex >= snapshots.length - 1} onClick={() => setSelectedIndex(Math.min(snapshots.length - 1, currentIndex + 1))} aria-label="Session suivante"><ChevronRight /></Button><Button variant="outline" size="sm" onClick={() => setHistoryOpen(true)}><History data-icon="inline-start" />Sessions enregistrées ({snapshots.length})</Button>{selectedSnapshot ? <Button size="sm" onClick={() => setSnapshotToRestore(selectedSnapshot)}><ArchiveRestore data-icon="inline-start" />Restaurer</Button> : null}</div></header>
    <div className={cn('session-workspace', !selectedTab && 'inspector-closed')}>
      <section className="tabs-panel">
        <div className="tab-toolbar"><div className="filter-group">{([['all', 'Tous'], ['active', 'Actifs'], ['sleeping', 'En veille'], ['pinned', 'Épinglés'], ['grouped', 'Groupés']] as [Filter, string][]).map(([key, label]) => <button key={key} className={cn(filter === key && 'selected')} onClick={() => setFilter(key)}>{label}<span>{counts[key]}</span></button>)}</div><label className="search-control"><Search /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un onglet…" /></label></div>
        <div className="tab-table-header"><Checkbox aria-label="Tout sélectionner" /><span>Titre</span><span>Domaine</span><span>Statut</span><span>Dernière activité</span><span /></div>
        <div className="tab-list">{state?.windows.map((window, windowIndex) => {
          const groups = [...window.groups, { id: `ungrouped-${window.id}`, windowRef: window.id, title: 'Onglets non groupés', color: 'grey' as const, collapsed: false }];
          return <div key={window.id}>{groups.map((group) => {
            const groupTabs = visible.filter((tab) => tab.windowRef === window.id && (group.id.startsWith('ungrouped') ? !tab.groupRef : tab.groupRef === group.id));
            if (!groupTabs.length) return null;
            const isCollapsed = collapsed.has(group.id) || group.collapsed;
            return <div className="tab-section" key={group.id}><button className="group-row" onClick={() => setCollapsed((previous) => { const next = new Set(previous); next.has(group.id) ? next.delete(group.id) : next.add(group.id); return next; })}>{isCollapsed ? <ChevronRight /> : <ChevronDown />}<span className={cn('group-color', `group-${group.color}`)} /><strong>{group.id.startsWith('ungrouped') ? group.title : `Fenêtre ${windowIndex + 1} · ${group.title}`}</strong><Badge>{groupTabs.length}</Badge></button>{!isCollapsed && groupTabs.map((tab) => <TabRow key={tab.logicalId} tab={tab} selected={selectedTab?.logicalId === tab.logicalId} onSelect={() => setSelectedTab(tab)} onActivate={() => activateTab(tab)} />)}</div>;
          })}</div>;
        })}</div>
      </section>
      {selectedTab ? <TabInspector tab={selectedTab} events={events.filter((event) => event.tabId === selectedTab.logicalId).slice(-4).reverse()} onClose={() => setSelectedTab(undefined)} /> : null}
    </div>
    <footer className="page-footer"><span><span className="status-dot" />Sauvegarde automatique · après chaque changement</span></footer>
    <Dialog open={historyOpen} onOpenChange={setHistoryOpen}><DialogContent className="history-dialog"><DialogHeader><DialogTitle>Toutes les sessions enregistrées</DialogTitle><DialogDescription>Chaque restauration crée de nouvelles fenêtres et conserve vos onglets actuels.</DialogDescription></DialogHeader><div className="history-list">{[...snapshots].reverse().map((snapshot) => <div className={cn('history-row', snapshot.id === selectedSnapshot?.id && 'selected')} key={snapshot.id}><div><strong>{format(snapshot.createdAt, 'EEEE d MMMM · HH:mm', { locale: fr })}</strong><span>{snapshot.tabCount} onglets · {snapshot.windowCount} fenêtres · {snapshot.sleepingCount} en veille</span></div><Button variant="ghost" size="sm" onClick={() => { setSelectedIndex(snapshots.indexOf(snapshot)); setHistoryOpen(false); }}>Afficher</Button><Button variant="outline" size="sm" onClick={() => { setHistoryOpen(false); setSnapshotToRestore(snapshot); }}><ArchiveRestore data-icon="inline-start" />Restaurer</Button></div>)}</div></DialogContent></Dialog>
    <Dialog open={Boolean(snapshotToRestore)} onOpenChange={(open) => { if (!open) setSnapshotToRestore(undefined); }}><DialogContent><DialogHeader><DialogTitle>Restaurer cette session ?</DialogTitle><DialogDescription>La session du {snapshotToRestore ? format(snapshotToRestore.createdAt, 'd MMMM à HH:mm', { locale: fr }) : ''} sera recréée dans de nouvelles fenêtres. Vos onglets actuels ne seront pas fermés.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setSnapshotToRestore(undefined)}>Annuler</Button><Button onClick={restore}><ArchiveRestore data-icon="inline-start" />Restaurer la session</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}

function snapshotLabel(snapshot: SessionSnapshotV1) { if (snapshot.label) return snapshot.label; const minutes = Math.max(0, Math.round((Date.now() - snapshot.createdAt) / 60_000)); if (minutes < 2) return 'Maintenant'; if (minutes < 120) return `Il y a ${Math.max(1, Math.round(minutes / 60))} h`; if (minutes < 2_880) return 'Hier'; return format(snapshot.createdAt, 'd MMM', { locale: fr }); }
function TabRow({ tab, selected, onSelect, onActivate }: { tab: TabStateV1; selected: boolean; onSelect: () => void; onActivate: () => void }) { const domain = (() => { try { return new URL(tab.url).hostname.replace('www.', ''); } catch { return tab.url; } })(); return <div className={cn('tab-row', selected && 'selected')} onClick={onSelect} onKeyDown={(event) => { if (event.key === 'Enter') onSelect(); }} role="button" tabIndex={0}><Checkbox checked={selected} aria-label={`Sélectionner ${tab.title}`} /><button className="tab-title tab-jump" onClick={(event) => { event.stopPropagation(); onActivate(); }} title="Aller à cet onglet"><img src={faviconFor(tab.url, tab.favIconUrl)} alt="" /><span><strong>{tab.title}</strong><small>{tab.url}</small></span></button><button className="domain domain-jump" onClick={(event) => { event.stopPropagation(); onActivate(); }} title="Aller à cet onglet">{domain}</button><span>{tab.discarded || tab.frozen ? <Badge variant="warning"><Moon />En veille</Badge> : <Badge variant="success"><span className="status-dot" />Actif</Badge>}</span><span className="last-active">{tab.lastAccessed ? formatDistanceToNow(tab.lastAccessed, { locale: fr, addSuffix: true }) : '—'}</span><span className="row-icons">{tab.pinned ? <Pin /> : null}<button className="details-button" onClick={(event) => { event.stopPropagation(); onSelect(); }} aria-label={`Afficher les détails de ${tab.title}`} title="Afficher les détails"><MoreHorizontal /></button></span></div>; }
function TabInspector({ tab, events, onClose }: { tab: TabStateV1; events: ActivityEventV1[]; onClose: () => void }) { const domain = (() => { try { return new URL(tab.url).hostname; } catch { return ''; } })(); const recentEvents = events.length ? events : [{ id: 'current', tabId: tab.logicalId, timestamp: tab.lastAccessed ?? Date.now(), type: 'updated' as const, title: tab.title, url: tab.url, domain }]; const action = async (request: Parameters<typeof sendRuntime>[0]) => { try { await sendRuntime(request); } catch (error) { toast.error((error as Error).message); } }; return <aside className="tab-inspector"><div className="inspector-kicker">Détails de l’onglet sélectionné</div><div className="inspector-head"><div className="favicon-large">{domain.slice(0, 1).toUpperCase()}</div><div><strong>{tab.title}</strong><span>{domain}</span></div><Button variant="ghost" size="icon-sm" onClick={onClose}><X /></Button></div><div className="inspector-section"><h3>État de cet onglet</h3>{tab.discarded || tab.frozen ? <Badge variant="warning"><Moon />En veille</Badge> : <Badge variant="success"><span className="status-dot" />Actif</Badge>}<p>Dernière activité : {tab.lastAccessed ? formatDistanceToNow(tab.lastAccessed, { locale: fr, addSuffix: true }) : 'inconnue'}</p></div><div className="inspector-section"><h3>Dernières pages dans cet onglet</h3><div className="mini-journey">{recentEvents.map((event, index) => <div className="mini-event" key={event.id}><span className={cn('mini-node', index === 0 && 'active')} /><div><strong>{event.title ?? event.domain ?? 'Navigation'}</strong><span>{format(event.timestamp, 'HH:mm')} · {event.domain}</span></div></div>)}</div></div><div className="inspector-section inspector-actions"><h3>Actions sur cet onglet</h3><Button variant="outline" onClick={() => action({ type: 'ACTIVATE_LOGICAL_TAB', logicalTabId: tab.logicalId, fallbackUrl: tab.url })}><Play data-icon="inline-start" />Aller à l’onglet</Button><Button variant="outline" onClick={() => tab.runtimeId != null && action({ type: 'CLOSE_TAB', runtimeTabId: tab.runtimeId })}><X data-icon="inline-start" />Fermer</Button><Button variant="ghost" onClick={() => { location.hash = `/journey?tab=${tab.logicalId}`; }}><GitBranch data-icon="inline-start" />Voir son parcours</Button></div></aside>; }
function faviconFor(url: string, fallback?: string) { if (hasExtensionRuntime()) return chrome.runtime.getURL(`/_favicon/?pageUrl=${encodeURIComponent(url)}&size=32`); if (fallback) return fallback; return `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" rx="7" fill="#edf7f4"/><circle cx="16" cy="16" r="4" fill="#087f5b"/></svg>')}`; }
