import { useDeferredValue, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, ArrowRight, Blocks, Box, Check, ChevronDown,
  Command, Download, ExternalLink, GitBranch, History, Monitor,
  Pin, Plus, RotateCcw, Search, Settings2, Sparkles, Upload, X,
} from 'lucide-react';
import { versions as demoVersions, visits as demoVisits, workspace } from './demo';
import { db } from './db';
import { compactVersions, diffVersions, domainOf, isSessionBackup, relatedTabIds, type RuntimeRequest, type SessionBackup, type SessionVersion, type TabState, type TabVisit } from './model';

type View = 'workspace' | 'timeline';

const formatTime = (date: number) => new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(date);
const relativeDate = (date: number) => {
  const minutes = Math.round((Date.now() - date) / 60_000);
  return minutes < 60 ? `il y a ${minutes} min` : `il y a ${Math.round(minutes / 60)} h`;
};

function Favicon({ tab }: { tab: TabState }) {
  const letter = domainOf(tab.url).charAt(0).toUpperCase();
  return <span className="favicon" aria-hidden="true">{letter}{tab.favicon && <img src={tab.favicon} alt="" onError={(event) => event.currentTarget.remove()} />}</span>;
}

function VersionRail({ versions, selected, onSelect, onCreate }: { versions: SessionVersion[]; selected: SessionVersion; onSelect: (version: SessionVersion) => void; onCreate: () => void }) {
  return (
    <aside className="version-rail">
      <div className="rail-label"><History size={13} /> Versions</div>
      <div className="version-list">
        {[...versions].reverse().map((version, index) => {
          const previous = versions[versions.indexOf(version) - 1];
          const diff = diffVersions(previous, version);
          const windowCount = new Set(version.state.tabs.map((tab) => tab.windowId ?? 0)).size;
          return (
            <button className={`version-card ${version.id === selected.id ? 'selected' : ''}`} key={version.id} onClick={() => onSelect(version)}>
              <span className="version-line"><i /><b>état {version.number}</b><time>{formatTime(version.createdAt)}</time></span>
              <strong>{windowCount} fenêtre{windowCount > 1 ? 's' : ''} · {version.state.tabs.length} onglets</strong>
              <small>{index === 0 ? `État actuel${version.reason === 'manual' ? ' · point marqué' : ''}` : version.reason === 'manual' ? 'Point de restauration' : `${diff.added.length} ajoutés · ${diff.removed.length} fermés`}</small>
            </button>
          );
        })}
      </div>
      <button className="new-version" onClick={onCreate}><Plus size={14} /> Créer un point de restauration</button>
    </aside>
  );
}

function Inspector({ tab, visits, onClose, onOpen }: { tab: TabState; visits: TabVisit[]; onClose: () => void; onOpen: () => void }) {
  const trail = visits.filter((visit) => visit.tabId === tab.id).sort((a, b) => b.at - a.at);
  return (
    <aside className="inspector">
      <div className="inspector-title"><span>Identité de l’onglet</span><button aria-label="Fermer l’inspecteur" onClick={onClose}><X size={15} /></button></div>
      <div className="identity">
        <Favicon tab={tab} />
        <div><strong>{tab.title}</strong><span>{domainOf(tab.url)}</span></div>
      </div>
      <dl className="tab-facts">
        <div><dt>Identifiant</dt><dd>{tab.id}</dd></div>
        <div><dt>État</dt><dd>{tab.sleeping ? 'En veille' : 'Actif'}</dd></div>
        <div><dt>Origine</dt><dd>{tab.openedFromUrl ? domainOf(tab.openedFromUrl) : tab.parentId ? 'Onglet parent' : 'Session'}</dd></div>
      </dl>
      <section className="trail">
        <header><span>Parcours complet</span><b>{trail.length}</b></header>
        {trail.length ? trail.map((visit, index) => (
          <div className="trail-event" key={visit.id}>
            <span className={`trail-dot ${visit.kind}`} />
            <div><strong>{visit.title}</strong><small>{domainOf(visit.url)} · {formatTime(visit.at)}</small></div>
            {index < trail.length - 1 && <i />}
          </div>
        )) : <p className="empty-copy">Aucune navigation enregistrée pour cet onglet.</p>}
      </section>
      <div className="inspector-actions">
        <button className="primary" onClick={onOpen}><ExternalLink size={14} /> Ouvrir</button>
        <button><RotateCcw size={14} /> Restaurer la branche</button>
      </div>
    </aside>
  );
}

function WorkspaceView({ version, previous, query, isCurrent, onActivateTab, onCloseTab }: { version: SessionVersion; previous?: SessionVersion; query: string; isCurrent: boolean; onActivateTab: (tab: TabState) => void; onCloseTab: (tab: TabState) => void }) {
  const [hoveredId, setHoveredId] = useState<string>();
  const normalized = query.toLowerCase();
  const tabs = version.state.tabs.filter((tab) => `${tab.title} ${tab.url}`.toLowerCase().includes(normalized));
  const preview = tabs.find((tab) => tab.id === hoveredId) ?? tabs[0];
  const diff = diffVersions(previous, version);
  const changedIds = new Set([...diff.added, ...diff.changed].map((tab) => tab.id));
  const windows = [...new Set(tabs.map((tab) => tab.windowId ?? 0))].map((windowId, index) => {
    const windowTabs = tabs.filter((tab) => (tab.windowId ?? 0) === windowId);
    return { id: windowId, number: index + 1, tabs: windowTabs, sections: [
      ...version.state.groups.map((group) => ({ id: group.id, title: group.title, color: group.color, tabs: windowTabs.filter((tab) => tab.groupId === group.id) })),
      { id: 'loose', title: 'Sans groupe', color: 'grey', tabs: windowTabs.filter((tab) => !tab.groupId) },
    ].filter((section) => section.tabs.length) };
  });
  return (
    <div className="workspace-view">
      <div className="version-summary">
        <div><span>État {version.number}</span><h1>{windows.length} fenêtre{windows.length > 1 ? 's' : ''}, {version.state.tabs.length} onglets à {formatTime(version.createdAt)}</h1><p>{relativeDate(version.createdAt)} · fenêtres, ordre et groupes conservés</p></div>
        <div className="delta-strip">
          <span className="delta added">+{diff.added.length}<small>ouverts</small></span>
          <span className="delta changed">~{diff.changed.length}<small>modifiés</small></span>
          <span className="delta removed">−{diff.removed.length}<small>fermés</small></span>
        </div>
      </div>
      <div className="session-stage">
        <aside className="tab-preview" aria-live="polite">
          <div className="thumbnail">
            {preview?.thumbnail ? <img src={preview.thumbnail} alt={`Aperçu de ${preview.title}`} /> : preview ? <span className="thumbnail-fallback"><Favicon tab={preview} /><strong>{domainOf(preview.url)}</strong><small>{preview.title}</small><em>Visitez l’onglet pour générer son aperçu</em></span> : <span><Monitor size={24} /><small>Aucun onglet dans cet état</small></span>}
          </div>
          {preview && <div className="preview-copy"><Favicon tab={preview} /><span><strong>{preview.title}</strong><small>{preview.url}</small></span></div>}
        </aside>
        <div className="session-list">
          {windows.map((window) => (
            <section className="window-section" key={window.id}>
              <header className="window-title"><Monitor size={14} /><strong>Fenêtre {window.number}</strong><span>{window.tabs.length} onglets</span></header>
              {window.sections.map((section) => (
                <section className={`tab-group ${section.id === 'loose' ? 'loose' : ''}`} key={`${window.id}-${section.id}`}>
                  <header><span className={`group-dot ${section.color}`} /><strong>{section.title}</strong><b>{section.tabs.length}</b><ChevronDown size={14} /></header>
                  <div>
                    {section.tabs.map((tab) => (
                      <article className="tab-row" key={tab.id} onMouseEnter={() => setHoveredId(tab.id)} onFocus={() => setHoveredId(tab.id)}>
                        <button className="tab-open" onClick={() => onActivateTab(tab)}>
                          <Favicon tab={tab} />
                          <span className="tab-copy"><strong>{tab.title}</strong><small>{tab.url}</small></span>
                        </button>
                        <span className="tab-domain">{domainOf(tab.url)}</span>
                        <span className="tab-status">{changedIds.has(tab.id) && <i title="Modifié depuis la version précédente" />}{tab.pinned && <Pin size={12} />}{tab.sleeping && <span className="sleep">veille</span>}</span>
                        {isCurrent && tab.runtimeId != null && <button className="tab-close" aria-label={`Fermer ${tab.title}`} onClick={() => onCloseTab(tab)}><X size={14} /></button>}
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

function TimelineView({ versions, selected, visits, focusedId, onSelectTab, onSelectVersion, onActivateTab }: { versions: SessionVersion[]; selected: SessionVersion; visits: TabVisit[]; focusedId?: string; onSelectTab: (tab: TabState) => void; onSelectVersion: (version: SessionVersion) => void; onActivateTab: (tab: TabState) => void }) {
  const current = versions.at(-1)!;
  const catalog = new Map<string, TabState>();
  for (const item of versions) for (const tab of item.state.tabs) catalog.set(tab.id, tab);
  for (const tab of current.state.tabs) catalog.set(tab.id, tab);
  const allTabs = [...catalog.values()];
  const currentIds = new Set(current.state.tabs.map((tab) => tab.id));
  const related = relatedTabIds(allTabs, focusedId);
  const times = [...visits.map((visit) => visit.at), ...versions.map((item) => item.createdAt)];
  const min = Math.min(...times);
  const max = Math.max(...times);
  const position = (at: number) => 4 + ((at - min) / (max - min || 1)) * 92;
  const windows = [...new Set(current.state.tabs.map((tab) => tab.windowId ?? 0))].map((windowId, index) => {
    const windowTabs = current.state.tabs.filter((tab) => (tab.windowId ?? 0) === windowId);
    const groups = [
      ...current.state.groups.map((group) => ({ id: group.id, title: group.title, color: group.color, tabs: windowTabs.filter((tab) => tab.groupId === group.id) })),
      { id: 'loose', title: 'Sans groupe', color: 'grey', tabs: windowTabs.filter((tab) => !tab.groupId) },
    ].filter((group) => group.tabs.length);
    return { id: windowId, number: index + 1, groups };
  });
  const closed = allTabs.filter((tab) => !currentIds.has(tab.id));
  const renderLane = (tab: TabState) => {
    const events = visits.filter((visit) => visit.tabId === tab.id).sort((a, b) => a.at - b.at);
    const parent = tab.parentId ? catalog.get(tab.parentId) : undefined;
    const dimmed = focusedId && !related.has(tab.id);
    return <div className={`timeline-lane ${dimmed ? 'dimmed' : ''}`} key={tab.id}>
      <button className="timeline-identity" onClick={() => onSelectTab(tab)}><Favicon tab={tab} /><span><strong>{tab.title}</strong><small>{parent ? `↳ depuis ${domainOf(tab.openedFromUrl ?? parent.url)}` : events.length ? `${events.length} événements` : 'origine de session'}</small></span></button>
      <div className="timeline-track">
        <i className="checkpoint-line" style={{ left: `${position(selected.createdAt)}%` }} />
        {events.map((event) => <button className={`timeline-event ${event.kind}`} key={event.id} style={{ left: `${position(event.at)}%` }} aria-label={`${event.kind} : ${event.title}, ${formatTime(event.at)}`} title={`${event.title} · ${formatTime(event.at)}`} onClick={() => onSelectTab(tab)} />)}
      </div>
      {currentIds.has(tab.id) ? <button className="current-tab" onClick={() => onActivateTab(tab)}><Favicon tab={tab} /><span><strong>{tab.title}</strong><small>{domainOf(tab.url)}</small></span></button> : <span className="closed-tab"><X size={13} /> fermé</span>}
    </div>;
  };
  return (
    <div className="timeline-view">
      <div className="view-intro"><span><GitBranch size={15} /> Chronologie vivante</span><h1>Le passé mène aux onglets ouverts maintenant.</h1><p>Les navigations avancent de gauche à droite. Sélectionnez un onglet pour isoler toute sa branche.</p></div>
      <div className="timeline-head"><span>Filiation</span><div className="timeline-ruler"><small>plus tôt</small>{versions.map((item) => <button className={item.id === selected.id ? 'selected' : ''} key={item.id} style={{ left: `${position(item.createdAt)}%` }} aria-label={`Afficher l’état ${item.number}`} onClick={() => onSelectVersion(item)} />)}<small>maintenant</small></div><strong>État actuel</strong></div>
      <div className="timeline-board">
        {windows.map((window) => <section className="timeline-window" key={window.id}><header><Monitor size={14} /><strong>Fenêtre {window.number}</strong></header>{window.groups.map((group) => <section className="timeline-group" key={`${window.id}-${group.id}`}><h2><i className={`group-dot ${group.color}`} />{group.title}<small>{group.tabs.length}</small></h2>{group.tabs.map(renderLane)}</section>)}</section>)}
        {closed.length > 0 && <section className="timeline-window archived"><header><History size={14} /><strong>Onglets fermés</strong></header><section className="timeline-group">{closed.map(renderLane)}</section></section>}
      </div>
    </div>
  );
}

export function App() {
  const [versions, setVersions] = useState(demoVersions);
  const [visitData, setVisitData] = useState(demoVisits);
  const [view, setView] = useState<View>('workspace');
  const [version, setVersion] = useState(demoVersions.at(-1)!);
  const [selectedTab, setSelectedTab] = useState<TabState>();
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const settingsRef = useRef<HTMLDialogElement>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const deferredQuery = useDeferredValue(query);
  const versionIndex = versions.findIndex((item) => item.id === version.id);
  const previous = versions[versionIndex - 1];
  const hasRuntime = typeof chrome !== 'undefined' && Boolean(chrome.runtime?.id);
  const selectedVersionRef = useRef(version.id);
  const latestVersionRef = useRef(versions.at(-1)?.id);
  selectedVersionRef.current = version.id;
  latestVersionRef.current = versions.at(-1)?.id;
  const send = async <T,>(request: RuntimeRequest) => {
    if (!hasRuntime) return undefined;
    const response = await chrome.runtime.sendMessage(request);
    if (!response?.ok) throw new Error(response?.error ?? 'Action impossible.');
    return response.value as T;
  };
  const reloadData = async (selectLatest = false) => {
    const followLatest = selectLatest || selectedVersionRef.current === latestVersionRef.current;
    const [storedVersions, storedVisits, storedTabs] = await Promise.all([db.versions.orderBy('number').toArray(), db.visits.orderBy('at').toArray(), db.tabs.toArray()]);
    if (!storedVersions.length) return;
    const tabMetadata = new Map(storedTabs.map((tab) => [tab.id, tab]));
    const hydratedVersions = compactVersions(storedVersions).map((item) => ({ ...item, state: { ...item.state, tabs: item.state.tabs.map((tab) => ({ ...tab, thumbnail: tabMetadata.get(tab.id)?.thumbnail })) } }));
    setVersions(hydratedVersions);
    setVisitData(storedVisits);
    setVersion((current) => followLatest ? hydratedVersions.at(-1)! : hydratedVersions.find((item) => item.id === current.id) ?? hydratedVersions.at(-1)!);
  };
  useEffect(() => {
    const reload = async () => { await send({ type: 'CAPTURE_VERSION', reason: 'change' }); await reloadData(); };
    const onFocus = () => void reload();
    const onVisible = () => { if (!document.hidden) void reload(); };
    void reloadData(true);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);
    return () => { window.removeEventListener('focus', onFocus); document.removeEventListener('visibilitychange', onVisible); };
  }, []);
  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'k') return;
      event.preventDefault();
      if (settingsRef.current?.open) settingsRef.current.close();
      requestAnimationFrame(() => { searchRef.current?.focus(); searchRef.current?.select(); });
    };
    window.addEventListener('keydown', focusSearch);
    return () => window.removeEventListener('keydown', focusSearch);
  }, []);
  useEffect(() => {
    const dialog = settingsRef.current;
    if (settingsOpen && !dialog?.open) dialog?.showModal();
    if (!settingsOpen && dialog?.open) dialog.close();
  }, [settingsOpen]);
  const exportData = async () => {
    const [workspaces, storedVersions, tabs, visits] = await Promise.all([db.workspaces.toArray(), db.versions.toArray(), db.tabs.toArray(), db.visits.toArray()]);
    const backup: SessionBackup = { format: 'pk-session-v2', version: 1, exportedAt: Date.now(), workspaces, versions: storedVersions, tabs, visits };
    const url = URL.createObjectURL(new Blob([JSON.stringify(backup)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `pk-session-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };
  const importData = async (file: File) => {
    try {
      const backup: unknown = JSON.parse(await file.text());
      if (!isSessionBackup(backup)) throw new Error('Ce fichier n’est pas une sauvegarde PK Session valide.');
      if (!window.confirm('Remplacer toutes les données locales par cette sauvegarde ?')) return;
      await db.transaction('rw', db.workspaces, db.versions, db.tabs, db.visits, async () => {
        await Promise.all([db.workspaces.clear(), db.versions.clear(), db.tabs.clear(), db.visits.clear()]);
        await Promise.all([db.workspaces.bulkPut(backup.workspaces), db.versions.bulkPut(backup.versions), db.tabs.bulkPut(backup.tabs), db.visits.bulkPut(backup.visits)]);
      });
      await reloadData(true);
      setNotice('Sauvegarde importée.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Import impossible.');
    } finally {
      if (importRef.current) importRef.current.value = '';
      window.setTimeout(() => setNotice(''), 3200);
    }
  };
  const moveVersion = (direction: number) => {
    const next = versions[Math.max(0, Math.min(versions.length - 1, versionIndex + direction))];
    setVersion(next);
    setSelectedTab(undefined);
  };
  const restore = async () => {
    const restored = await send<number>({ type: 'RESTORE_VERSION', versionId: version.id });
    setNotice(restored == null ? `État ${version.number} prêt à restaurer dans une nouvelle fenêtre.` : `${restored} onglets restaurés depuis l’état ${version.number}.`);
    window.setTimeout(() => setNotice(''), 3200);
  };
  const capture = async () => {
    await send({ type: 'CAPTURE_VERSION', reason: 'manual' });
    await reloadData(true);
    setNotice('Point de restauration créé.');
    window.setTimeout(() => setNotice(''), 3200);
  };
  const openTab = async (tab: TabState) => { await send({ type: 'ACTIVATE_TAB', runtimeId: tab.runtimeId, windowId: tab.windowId, url: tab.url }); };
  const closeTab = async (tab: TabState) => {
    if (tab.runtimeId == null) return;
    await send({ type: 'CLOSE_TAB', runtimeId: tab.runtimeId });
    await send({ type: 'CAPTURE_VERSION', reason: 'change' });
    await reloadData(true);
  };
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark"><Blocks size={17} /></span><span><strong>PK Session</strong><small>living workspace</small></span></div>
        <div className="workspace-switch"><span className="live-dot" />{workspace.name}<ChevronDown size={14} /></div>
        <nav aria-label="Vues principales">
          <button className={view === 'workspace' ? 'active' : ''} onClick={() => { setView('workspace'); setSelectedTab(undefined); }}><Box size={15} /> Espace</button>
          <button className={view === 'timeline' ? 'active' : ''} onClick={() => { setView('timeline'); setSelectedTab(undefined); }}><GitBranch size={15} /> Chronologie</button>
        </nav>
        <div className="top-actions">
          <label className="search"><Search size={14} /><input ref={searchRef} aria-label="Rechercher un onglet ou un domaine" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Onglet, domaine…" /><kbd>⌘ K</kbd></label>
          <button ref={settingsButtonRef} className="icon-button" aria-label="Ouvrir les réglages" aria-haspopup="dialog" aria-expanded={settingsOpen} onClick={() => setSettingsOpen(true)}><Settings2 size={16} /></button>
        </div>
      </header>
      <div className="body-grid">
        <VersionRail versions={versions} selected={version} onCreate={() => void capture()} onSelect={(next) => { setVersion(next); setSelectedTab(undefined); }} />
        <main>
          <div className="context-bar">
            <div className="version-nav"><button onClick={() => moveVersion(-1)} disabled={!previous} aria-label="État précédent"><ArrowLeft size={15} /></button><span><b>état {version.number}</b><small>{formatTime(version.createdAt)}</small></span><button onClick={() => moveVersion(1)} disabled={versionIndex === versions.length - 1} aria-label="État suivant"><ArrowRight size={15} /></button></div>
            <span className="saved"><Check size={13} /> Version immuable · enregistrée localement</span>
            <button className="restore" onClick={() => void restore()}><RotateCcw size={14} /> Restaurer cette version</button>
          </div>
          <div className={`content-grid ${selectedTab ? 'with-inspector' : ''}`}>
            <div className="content-canvas">
              {view === 'workspace' && <WorkspaceView version={version} previous={previous} query={deferredQuery} isCurrent={versionIndex === versions.length - 1} onActivateTab={(tab) => void openTab(tab)} onCloseTab={(tab) => void closeTab(tab)} />}
              {view === 'timeline' && <TimelineView versions={versions} selected={version} visits={visitData} focusedId={selectedTab?.id} onSelectTab={setSelectedTab} onSelectVersion={setVersion} onActivateTab={(tab) => void openTab(tab)} />}
            </div>
            {selectedTab && <Inspector tab={selectedTab} visits={visitData} onOpen={() => void openTab(selectedTab)} onClose={() => setSelectedTab(undefined)} />}
          </div>
        </main>
      </div>
      {notice && <div className="notice"><Sparkles size={15} />{notice}</div>}
      <button className="command-button" aria-label="Ouvrir la palette de commandes"><Command size={15} /></button>
      <dialog ref={settingsRef} className="settings-drawer" aria-labelledby="settings-title" onClose={() => { setSettingsOpen(false); settingsButtonRef.current?.focus(); }} onClick={(event) => { if (event.clientX < event.currentTarget.getBoundingClientRect().left) event.currentTarget.close(); }}>
        <header><div><span>Préférences</span><h2 id="settings-title">Réglages</h2></div><form method="dialog"><button aria-label="Fermer les réglages"><X size={18} /></button></form></header>
        <section><History size={18} /><div><h3>Historique des états</h3><p>Une capture est enregistrée après un changement de la session et toutes les 15 minutes uniquement si son contenu a changé.</p></div></section>
        <section><Monitor size={18} /><div><h3>Données locales</h3><p>L’historique et les miniatures restent stockés dans ce navigateur. Aucun compte ni serveur externe.</p><div className="settings-actions"><button onClick={() => void exportData()}><Download size={15} /> Exporter</button><button onClick={() => importRef.current?.click()}><Upload size={15} /> Importer</button><input ref={importRef} type="file" accept="application/json,.json" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void importData(file); }} /></div></div></section>
      </dialog>
    </div>
  );
}
