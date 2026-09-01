import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarDays, ChevronLeft, ChevronRight, ExternalLink, GitBranch, Minus, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useEvents } from '@/hooks/use-session-data';
import { sendRuntime } from '@/lib/runtime';
import type { ActivityEventV1 } from '@/lib/types';
import { cn } from '@/lib/utils';
import { positionEventLabels } from './layout';

const laneColors = ['#0b8f65', '#2563eb', '#8b5cf6', '#ef4444', '#e5a000', '#0891b2', '#db2777'];
const LANE_START = 94;
const LANE_WIDTH = 230;

export function JourneyPage() {
  const allEvents = useEvents();
  const [selected, setSelected] = useState<ActivityEventV1>();
  const [query, setQuery] = useState('');
  const [zoom, setZoom] = useState(1);
  const [dayOffset, setDayOffset] = useState(0);
  const date = useMemo(() => { const d = new Date(); d.setDate(d.getDate() + dayOffset); return d; }, [dayOffset]);
  const events = useMemo(() => allEvents.filter((event) => { const d = new Date(event.timestamp); return d.toDateString() === date.toDateString() && (!query || `${event.title} ${event.domain}`.toLowerCase().includes(query.toLowerCase())); }), [allEvents, date, query]);
  const laneIds = useMemo(() => [...new Set(events.map((event) => event.tabId))], [events]);
  const minHour = events.length ? Math.max(0, Math.min(...events.map((event) => new Date(event.timestamp).getHours())) - 1) : 8;
  const maxHour = events.length ? Math.min(24, Math.max(...events.map((event) => new Date(event.timestamp).getHours())) + 2) : 19;
  const height = Math.max(690, (maxHour - minHour) * 78 * zoom);
  const width = Math.max(900, laneIds.length * LANE_WIDTH + LANE_START);
  const yOf = (timestamp: number) => 58 + ((new Date(timestamp).getHours() + new Date(timestamp).getMinutes() / 60 - minHour) / (maxHour - minHour)) * (height - 90);
  const lanes = useMemo(() => laneIds.map((tabId, index) => {
    const laneEvents = events.filter((event) => event.tabId === tabId);
    const toY = (timestamp: number) => 58 + ((new Date(timestamp).getHours() + new Date(timestamp).getMinutes() / 60 - minHour) / (maxHour - minHour)) * (height - 90);
    return { tabId, index, events: laneEvents, positionedEvents: positionEventLabels(laneEvents, toY), color: laneColors[index % laneColors.length] };
  }), [events, height, laneIds, maxHour, minHour]);
  const activationEvents = events.filter((event) => event.type === 'activated');

  async function activateTab(event?: ActivityEventV1) { if (!event) return; try { const result = await sendRuntime<{ mode: 'activated' | 'reopened' }>({ type: 'ACTIVATE_LOGICAL_TAB', logicalTabId: event.tabId, fallbackUrl: event.url }); if (result.mode === 'reopened') toast.info('Cet onglet était fermé : la page a été rouverte.'); } catch (error) { toast.error((error as Error).message); } }

  return <div className="page journey-page">
    <header className="journey-header"><div><h1>Parcours</h1><p>Votre navigation, onglet par onglet</p></div><div className="journey-controls"><Button variant="outline" size="icon" onClick={() => setDayOffset((value) => value - 1)}><ChevronLeft /></Button><Button variant="outline"><CalendarDays data-icon="inline-start" />{dayOffset === 0 ? 'Aujourd’hui' : format(date, 'd MMMM', { locale: fr })}</Button><Button variant="outline" size="icon" disabled={dayOffset >= 0} onClick={() => setDayOffset((value) => value + 1)}><ChevronRight /></Button><label className="search-control wide"><Search /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher dans le parcours…" /></label><Button variant="outline" className="active-filter">Tout</Button><Button variant="outline">Fenêtre</Button><Button variant="outline">Domaine</Button></div></header>
    <div className="journey-workspace">
      <section className="graph-scroll"><svg className="journey-graph" width={width} height={height} role="img" aria-label="Graphe chronologique des onglets">
        <g className="time-grid">{Array.from({ length: maxHour - minHour + 1 }, (_, index) => minHour + index).map((hour) => { const y = 58 + ((hour - minHour) / (maxHour - minHour)) * (height - 90); return <g key={hour}><line x1="0" x2={width} y1={y} y2={y} /><text x="12" y={y + 5}>{String(hour).padStart(2, '0')}:00</text></g>; })}</g>
        <line className="milestone-line" x1="0" x2={width} y1={yOf(new Date(date).setHours(14, 30, 0, 0))} y2={yOf(new Date(date).setHours(14, 30, 0, 0))} /><g className="milestone-label" transform={`translate(64 ${yOf(new Date(date).setHours(14, 30, 0, 0)) - 12})`}><rect width="178" height="24" rx="12" /><text x="14" y="16">Version automatique · 14:30</text></g>
        {activationEvents.slice(1).map((event, index) => { const previous = activationEvents[index]; const fromLane = lanes.find((lane) => lane.tabId === previous.tabId); const toLane = lanes.find((lane) => lane.tabId === event.tabId); if (!fromLane || !toLane) return null; const x1 = LANE_START + fromLane.index * LANE_WIDTH; const x2 = LANE_START + toLane.index * LANE_WIDTH; const y1 = yOf(previous.timestamp); const y2 = yOf(event.timestamp); return <path key={`switch-${event.id}`} className="switch-link" d={`M ${x1} ${y1} C ${x1} ${(y1 + y2) / 2}, ${x2} ${(y1 + y2) / 2}, ${x2} ${y2}`} />; })}
        {lanes.map((lane) => { const x = LANE_START + lane.index * LANE_WIDTH; const first = lane.events[0]; const last = lane.events[lane.events.length - 1]; return <g key={lane.tabId} className="journey-lane"><g transform={`translate(${x - 12} 18)`}><circle cx="8" cy="8" r="8" fill={lane.color} opacity=".12" /><circle cx="8" cy="8" r="3" fill={lane.color} /><text x="24" y="12">{shortTitle(first?.title ?? 'Onglet', 22)}</text></g><line x1={x} x2={x} y1={yOf(first.timestamp)} y2={yOf(last.timestamp)} stroke={lane.color} />{lane.positionedEvents.map(({ event, actualY, labelY }) => { const closed = event.type === 'closed'; return <g key={event.id} className={cn('event-node', selected?.id === event.id && 'selected')} onClick={() => setSelected(event)} onDoubleClick={() => void activateTab(event)} role="button" tabIndex={0}>{Math.abs(labelY - actualY) > 2 ? <line className="event-leader" x1={x + 6} x2={x + 14} y1={actualY} y2={labelY} /> : null}<circle cx={x} cy={actualY} r={selected?.id === event.id ? 7 : 5} stroke={lane.color} fill="#fff" />{closed ? <path d={`M ${x - 4} ${actualY - 4} L ${x + 4} ${actualY + 4} M ${x + 4} ${actualY - 4} L ${x - 4} ${actualY + 4}`} stroke="#94a3b8" /> : null}<g className="event-label" transform={`translate(${x + 12} ${labelY - 17})`}><rect width="184" height="40" rx="5" /><text className="event-time" x="8" y="11">{format(event.timestamp, 'HH:mm')}</text><text className="event-title" x="8" y="24">{closed ? '×  ' : ''}{shortTitle(event.title ?? event.domain ?? 'Navigation', 27)}</text><text className="event-domain" x="8" y="35">{shortTitle(event.domain ?? '', 28)}</text></g></g>; })}</g>; })}
      </svg><div className="graph-zoom"><Button variant="outline" size="icon-sm" onClick={() => setZoom((value) => Math.min(1.5, value + .1))}><Plus /></Button><Button variant="outline" size="icon-sm" onClick={() => setZoom((value) => Math.max(.7, value - .1))}><Minus /></Button></div></section>
      <JourneyInspector event={selected ?? events[events.length - 1]} onActivate={activateTab} lanes={lanes.length} events={events.length} />
    </div>
  </div>;
}

function JourneyInspector({ event, onActivate, lanes, events }: { event?: ActivityEventV1; onActivate: (event?: ActivityEventV1) => Promise<void>; lanes: number; events: number }) { if (!event) return <aside className="journey-inspector empty-inspector"><GitBranch /><strong>Aucun parcours ce jour</strong><span>Les navigations capturées apparaîtront ici.</span></aside>; return <aside className="journey-inspector"><div className="journey-inspector-title"><strong>{format(event.timestamp, 'HH:mm')} · {event.title}</strong></div><div className="inspector-section"><span className="eyeless-label">Onglet</span><div className="tab-identity"><span className="favicon-large">{event.domain?.slice(0, 1).toUpperCase()}</span><strong>{shortTitle(event.title ?? 'Onglet')}</strong></div></div><div className="inspector-section"><span className="eyeless-label">URL</span><button className="journey-url-button" onClick={() => void onActivate(event)} title="Aller à cet onglet"><span>{event.url}</span><ExternalLink /></button></div><div className="inspector-section detail-grid"><span>Type</span><strong>{event.type === 'navigated' ? 'Navigation' : event.type}</strong><span>Fenêtre</span><strong>Fenêtre {event.windowId ?? 1}</strong><span>Enregistré</span><strong>{format(event.timestamp, 'HH:mm:ss')}</strong></div><div className="inspector-section inspector-actions"><Button onClick={() => void onActivate(event)}><ExternalLink data-icon="inline-start" />Aller à l’onglet</Button></div><div className="mini-map"><div className="mini-map-lines">{Array.from({ length: Math.min(lanes, 6) }, (_, index) => <span key={index} style={{ left: `${12 + index * 14}%`, height: `${35 + (index % 3) * 20}%`, background: laneColors[index] }} />)}</div><small>{lanes} onglets · {events} événements</small></div><footer>Données locales uniquement</footer></aside>; }
function shortTitle(value: string, length = 20) { return value.length > length ? `${value.slice(0, length - 1)}…` : value; }
