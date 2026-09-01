import { useEffect, useMemo, useState } from 'react';
import { CornerDownLeft, Moon, Pin, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { demoState } from '@/lib/demo';
import { domainOf } from '@/lib/domain';
import { hasExtensionRuntime, sendRuntime } from '@/lib/runtime';
import type { TabStateV1 } from '@/lib/types';
import { cn } from '@/lib/utils';

export function TabCommandPalette() {
  const [open, setOpen] = useState(false);
  const [tabs, setTabs] = useState<TabStateV1[]>([]);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, []);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setSelectedIndex(0);
    if (hasExtensionRuntime()) {
      void sendRuntime<TabStateV1[]>({ type: 'GET_OPEN_TABS' }).then(setTabs).catch((error: Error) => toast.error(error.message));
    } else {
      setTabs(demoState.windows.flatMap((window) => window.tabs));
    }
  }, [open]);

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return tabs.filter((tab) => !normalized || `${tab.title} ${tab.url} ${domainOf(tab.url)}`.toLowerCase().includes(normalized)).slice(0, 15);
  }, [query, tabs]);

  async function activate(tab?: TabStateV1) {
    if (!tab) return;
    try {
      const result = await sendRuntime<{ mode: 'activated' | 'reopened' }>({ type: 'ACTIVATE_LOGICAL_TAB', logicalTabId: tab.logicalId, fallbackUrl: tab.url });
      setOpen(false);
      if (result.mode === 'reopened') toast.info('Cet onglet était fermé : la page a été rouverte.');
    } catch (error) { toast.error((error as Error).message); }
  }

  return <Dialog open={open} onOpenChange={setOpen}><DialogContent className="command-dialog"><DialogTitle className="sr-only">Rechercher dans les onglets</DialogTitle><DialogDescription className="sr-only">Saisissez un titre, une URL ou un domaine, puis appuyez sur Entrée.</DialogDescription><div className="command-search"><Search /><Input autoFocus value={query} onChange={(event) => { setQuery(event.target.value); setSelectedIndex(0); }} onKeyDown={(event) => { if (event.key === 'ArrowDown' && results.length) { event.preventDefault(); setSelectedIndex((index) => Math.min(results.length - 1, index + 1)); } if (event.key === 'ArrowUp' && results.length) { event.preventDefault(); setSelectedIndex((index) => Math.max(0, index - 1)); } if (event.key === 'Enter') { event.preventDefault(); void activate(results[selectedIndex]); } }} placeholder="Rechercher un onglet par titre, URL ou domaine…" aria-label="Rechercher dans les onglets" /><kbd>⌘K</kbd></div><div className="command-results" role="listbox">{results.length ? results.map((tab, index) => <button key={tab.logicalId} className={cn('command-result', index === selectedIndex && 'selected')} onMouseEnter={() => setSelectedIndex(index)} onClick={() => void activate(tab)} role="option" aria-selected={index === selectedIndex}><span className="command-favicon">{domainOf(tab.url).slice(0, 1).toUpperCase()}</span><span className="command-result-copy"><strong>{tab.title}</strong><small>{tab.url}</small></span><span className="command-meta">{tab.pinned ? <Pin /> : null}{tab.discarded || tab.frozen ? <Moon /> : null}<span>{domainOf(tab.url)}</span></span>{index === selectedIndex ? <CornerDownLeft /> : null}</button>) : <div className="command-empty">Aucun onglet ouvert ne correspond à « {query} ».</div>}</div><footer className="command-footer"><span><kbd>↑</kbd><kbd>↓</kbd> naviguer</span><span><kbd>↵</kbd> ouvrir</span><span><kbd>esc</kbd> fermer</span></footer></DialogContent></Dialog>;
}
