import { useDeferredValue, useEffect, useState } from 'react';
import {
  ArrowLeft, ArrowRight, Blocks, Box, Check, ChevronDown, CircleDot, Clock3,
  Command, ExternalLink, GitBranch, History, Layers3, Network, PanelRightClose,
  Pin, Plus, RotateCcw, Search, Settings2, Sparkles, X,
} from 'lucide-react';
import { versions as demoVersions, visits as demoVisits, workspace } from './demo';
import { db } from './db';
import { diffVersions, domainOf, type RuntimeRequest, type SessionVersion, type TabState, type TabVisit } from './model';

type View = 'workspace' | 'lifelines' | 'map';

const formatTime = (date: number) => new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(date);
const relativeDate = (date: number) => {
  const minutes = Math.round((Date.now() - date) / 60_000);
  return minutes < 60 ? `il y a ${minutes} min` : `il y a ${Math.round(minutes / 60)} h`;
};

function Favicon({ tab }: { tab: TabState }) {
  const letter = domainOf(tab.url).charAt(0).toUpperCase();
  return <span className="favicon" aria-hidden="true">{letter}</span>;
}

function VersionRail({ versions, selected, onSelect, onCreate }: { versions: SessionVersion[]; selected: SessionVersion; onSelect: (version: SessionVersion) => void; onCreate: () => void }) {
  return (
    <aside className="version-rail">
      <div className="rail-label"><History size={13} /> Versions</div>
      <div className="version-list">
        {[...versions].reverse().map((version, index) => {
          const previous = versions[versions.indexOf(version) - 1];
          const diff = diffVersions(previous, version);
          return (
            <button className={`version-card ${version.id === selected.id ? 'selected' : ''}`} key={version.id} onClick={() => onSelect(version)}>
              <span className="version-line"><i /><b>v{version.number}</b><time>{formatTime(version.createdAt)}</time></span>
              <strong>{version.state.tabs.length} onglets</strong>
              <small>{index === 0 ? 'État actuel' : `${diff.added.length} ajoutés · ${diff.removed.length} fermés`}</small>
            </button>
          );
        })}
      </div>
      <button className="new-version" onClick={onCreate}><Plus size={14} /> Marquer cette version</button>
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
        <div><dt>Origine</dt><dd>{tab.parentId ?? 'Session'}</dd></div>
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

function WorkspaceView({ version, previous, query, selectedTab, onSelectTab }: { version: SessionVersion; previous?: SessionVersion; query: string; selectedTab?: TabState; onSelectTab: (tab: TabState) => void }) {
  const normalized = query.toLowerCase();
  const tabs = version.state.tabs.filter((tab) => `${tab.title} ${tab.url}`.toLowerCase().includes(normalized));
  const diff = diffVersions(previous, version);
  const changedIds = new Set([...diff.added, ...diff.changed].map((tab) => tab.id));
  const sections = [
    ...version.state.groups.map((group) => ({ id: group.id, title: group.title, color: group.color, tabs: tabs.filter((tab) => tab.groupId === group.id) })),
    { id: 'loose', title: 'Sans groupe', color: 'grey', tabs: tabs.filter((tab) => !tab.groupId) },
  ].filter((section) => section.tabs.length);
  return (
    <div className="workspace-view">
      <div className="version-summary">
        <div><span>Version v{version.number}</span><h1>{version.state.tabs.length} onglets, exactement à {formatTime(version.createdAt)}</h1><p>{relativeDate(version.createdAt)} · composition, ordre et groupes conservés</p></div>
        <div className="delta-strip">
          <span className="delta added">+{diff.added.length}<small>ouverts</small></span>
          <span className="delta changed">~{diff.changed.length}<small>modifiés</small></span>
          <span className="delta removed">−{diff.removed.length}<small>fermés</small></span>
        </div>
      </div>
      <div className="group-grid">
        {sections.map((section) => (
          <section className="group" key={section.id}>
            <header><span className={`group-dot ${section.color}`} /><strong>{section.title}</strong><b>{section.tabs.length}</b><ChevronDown size={14} /></header>
            <div className="group-tabs">
              {section.tabs.map((tab) => (
                <button className={`tab-card ${selectedTab?.id === tab.id ? 'selected' : ''}`} key={tab.id} onClick={() => onSelectTab(tab)}>
                  <Favicon tab={tab} />
                  <span className="tab-copy"><strong>{tab.title}</strong><small>{domainOf(tab.url)}</small></span>
                  <span className="tab-status">{changedIds.has(tab.id) && <i title="Modifié depuis la version précédente" />}{tab.pinned && <Pin size={12} />}{tab.sleeping && <span className="sleep">veille</span>}</span>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function LifelinesView({ version, visits, onSelectTab }: { version: SessionVersion; visits: TabVisit[]; onSelectTab: (tab: TabState) => void }) {
  const lanes = version.state.tabs.map((tab) => ({ tab, events: visits.filter((visit) => visit.tabId === tab.id) })).filter((lane) => lane.events.length);
  const allTimes = visits.map((visit) => visit.at);
  const min = Math.min(...allTimes);
  const max = Math.max(...allTimes);
  const position = (at: number) => 12 + ((at - min) / (max - min || 1)) * 82;
  return (
    <div className="lifelines-view">
      <div className="view-intro"><span><GitBranch size={15} /> Lignes de vie</span><h1>Un onglet garde son identité, même quand son adresse change.</h1><p>Chaque point est une navigation réelle. Sélectionnez une ligne pour parcourir son histoire.</p></div>
      <div className="time-ruler"><span>plus tôt</span><i /><span>maintenant</span></div>
      <div className="lanes">
        {lanes.map(({ tab, events }, laneIndex) => (
          <button className="lane" key={tab.id} onClick={() => onSelectTab(tab)}>
            <span className="lane-name"><Favicon tab={tab} /><span><strong>{tab.title}</strong><small>{events.length} étapes</small></span></span>
            <span className="lane-track" style={{ '--lane': laneIndex } as React.CSSProperties}>
              {events.map((event) => <i className={`event ${event.kind}`} key={event.id} style={{ left: `${position(event.at)}%` }} title={`${event.title} · ${formatTime(event.at)}`} />)}
            </span>
            <span className="lane-end">{domainOf(events.at(-1)!.url)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function MapView({ version, onSelectTab }: { version: SessionVersion; onSelectTab: (tab: TabState) => void }) {
  const tabs = version.state.tabs;
  const positions = new Map(tabs.map((tab, index) => [tab.id, { x: 330 + (index % 3) * 220, y: 84 + Math.floor(index / 3) * 150 }]));
  return (
    <div className="map-view">
      <div className="map-copy"><span><Network size={15} /> Origines</span><strong>Qui a ouvert quoi ?</strong><small>Les liens décrivent les branches parent/enfant, pas une catégorie artificielle.</small></div>
      <svg className="edges" aria-hidden="true">
        {tabs.map((tab) => {
          const from = tab.parentId ? positions.get(tab.parentId) : { x: 70, y: 285 };
          const to = positions.get(tab.id)!;
          if (!from) return null;
          return <path key={tab.id} d={`M ${from.x + 120} ${from.y + 28} C ${from.x + 170} ${from.y + 28}, ${to.x - 50} ${to.y + 28}, ${to.x} ${to.y + 28}`} />;
        })}
      </svg>
      <div className="session-origin"><Layers3 size={18} /><span><strong>{workspace.name}</strong><small>session vivante</small></span></div>
      {tabs.map((tab) => {
        const point = positions.get(tab.id)!;
        return <button className="map-node" key={tab.id} style={{ left: point.x, top: point.y }} onClick={() => onSelectTab(tab)}><Favicon tab={tab} /><span><strong>{tab.title}</strong><small>{domainOf(tab.url)}</small></span></button>;
      })}
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
  const deferredQuery = useDeferredValue(query);
  const versionIndex = versions.findIndex((item) => item.id === version.id);
  const previous = versions[versionIndex - 1];
  const hasRuntime = typeof chrome !== 'undefined' && Boolean(chrome.runtime?.id);
  const send = async <T,>(request: RuntimeRequest) => {
    if (!hasRuntime) return undefined;
    const response = await chrome.runtime.sendMessage(request);
    if (!response?.ok) throw new Error(response?.error ?? 'Action impossible.');
    return response.value as T;
  };
  const reloadData = async () => {
    const [storedVersions, storedVisits] = await Promise.all([db.versions.orderBy('number').toArray(), db.visits.orderBy('at').toArray()]);
    if (!storedVersions.length) return;
    setVersions(storedVersions);
    setVisitData(storedVisits);
    setVersion((current) => storedVersions.find((item) => item.id === current.id) ?? storedVersions.at(-1)!);
  };
  useEffect(() => {
    const reload = () => void reloadData();
    reload();
    window.addEventListener('focus', reload);
    document.addEventListener('visibilitychange', reload);
    return () => { window.removeEventListener('focus', reload); document.removeEventListener('visibilitychange', reload); };
  }, []);
  const moveVersion = (direction: number) => {
    const next = versions[Math.max(0, Math.min(versions.length - 1, versionIndex + direction))];
    setVersion(next);
    setSelectedTab(undefined);
  };
  const restore = async () => {
    const restored = await send<number>({ type: 'RESTORE_VERSION', versionId: version.id });
    setNotice(restored == null ? `Version v${version.number} prête à restaurer dans une nouvelle fenêtre.` : `${restored} onglets restaurés depuis v${version.number}.`);
    window.setTimeout(() => setNotice(''), 3200);
  };
  const capture = async () => { await send({ type: 'CAPTURE_VERSION', reason: 'manual' }); await reloadData(); };
  const openTab = async (tab: TabState) => { await send({ type: 'OPEN_TAB', tabId: tab.id, url: tab.url }); };
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark"><Blocks size={17} /></span><span><strong>PK Session</strong><small>living workspace</small></span></div>
        <div className="workspace-switch"><span className="live-dot" />{workspace.name}<ChevronDown size={14} /></div>
        <nav aria-label="Vues principales">
          <button className={view === 'workspace' ? 'active' : ''} onClick={() => { setView('workspace'); setSelectedTab(undefined); }}><Box size={15} /> Espace</button>
          <button className={view === 'lifelines' ? 'active' : ''} onClick={() => { setView('lifelines'); setSelectedTab(undefined); }}><GitBranch size={15} /> Parcours</button>
          <button className={view === 'map' ? 'active' : ''} onClick={() => { setView('map'); setSelectedTab(undefined); }}><Network size={15} /> Origines</button>
        </nav>
        <div className="top-actions">
          <label className="search"><Search size={14} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Onglet, domaine…" /><kbd>⌘ K</kbd></label>
          <button className="icon-button" aria-label="Réglages"><Settings2 size={16} /></button>
        </div>
      </header>
      <div className="body-grid">
        <VersionRail versions={versions} selected={version} onCreate={() => void capture()} onSelect={(next) => { setVersion(next); setSelectedTab(undefined); }} />
        <main>
          <div className="context-bar">
            <div className="version-nav"><button onClick={() => moveVersion(-1)} disabled={!previous} aria-label="Version précédente"><ArrowLeft size={15} /></button><span><b>v{version.number}</b><small>{formatTime(version.createdAt)}</small></span><button onClick={() => moveVersion(1)} disabled={versionIndex === versions.length - 1} aria-label="Version suivante"><ArrowRight size={15} /></button></div>
            <span className="saved"><Check size={13} /> Version immuable · enregistrée localement</span>
            <button className="restore" onClick={() => void restore()}><RotateCcw size={14} /> Restaurer cette version</button>
          </div>
          <div className={`content-grid ${selectedTab ? 'with-inspector' : ''}`}>
            <div className="content-canvas">
              {view === 'workspace' && <WorkspaceView version={version} previous={previous} query={deferredQuery} selectedTab={selectedTab} onSelectTab={setSelectedTab} />}
              {view === 'lifelines' && <LifelinesView version={version} visits={visitData} onSelectTab={setSelectedTab} />}
              {view === 'map' && <MapView version={version} onSelectTab={setSelectedTab} />}
            </div>
            {selectedTab && <Inspector tab={selectedTab} visits={visitData} onOpen={() => void openTab(selectedTab)} onClose={() => setSelectedTab(undefined)} />}
          </div>
        </main>
      </div>
      {notice && <div className="notice"><Sparkles size={15} />{notice}</div>}
      <button className="command-button" aria-label="Ouvrir la palette de commandes"><Command size={15} /></button>
    </div>
  );
}
