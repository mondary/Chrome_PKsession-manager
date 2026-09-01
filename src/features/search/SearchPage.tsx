import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Archive, ExternalLink, GitBranch, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { db } from '@/lib/db';
import { useEvents } from '@/hooks/use-session-data';
import { sendRuntime } from '@/lib/runtime';

export function SearchPage() {
  const [query, setQuery] = useState('');
  const events = useEvents();
  const archive = useLiveQuery(() => db.archive.orderBy('timestamp').reverse().limit(500).toArray(), []) ?? [];
  const results = useMemo(() => events.filter((event) => !query || `${event.title} ${event.url} ${event.domain}`.toLowerCase().includes(query.toLowerCase())).slice(-100).reverse(), [events, query]);
  const archiveResults = useMemo(() => archive.filter((visit) => !query || `${visit.title} ${visit.url} ${visit.domain}`.toLowerCase().includes(query.toLowerCase())).slice(0, 100), [archive, query]);
  return <div className="page standard-page"><header className="page-header"><div><h1>Recherche</h1><p>Retrouvez une page, un onglet ou une ancienne visite</p></div></header><div className="search-hero"><Search /><Input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Titre, URL ou domaine…" /></div><section className="results-section"><h2><GitBranch />Parcours capturé <span>{results.length}</span></h2><div className="results-list">{results.map((event) => <button key={event.id} onClick={() => event.url && sendRuntime({ type: 'OPEN_URL', url: event.url })}><span className="result-icon">{event.domain?.slice(0, 1).toUpperCase()}</span><span><strong>{event.title}</strong><small>{event.url}</small></span><time>{format(event.timestamp, 'd MMM · HH:mm', { locale: fr })}</time><ExternalLink /></button>)}</div></section>{archiveResults.length ? <section className="results-section archive-results"><h2><Archive />Archive Chrome <span>sans lignée d’onglet</span></h2><div className="results-list">{archiveResults.map((visit) => <button key={visit.id} onClick={() => sendRuntime({ type: 'OPEN_URL', url: visit.url })}><span className="result-icon"><Archive /></span><span><strong>{visit.title}</strong><small>{visit.url}</small></span><time>{format(visit.timestamp, 'd MMM · HH:mm', { locale: fr })}</time><ExternalLink /></button>)}</div></section> : null}</div>;
}
