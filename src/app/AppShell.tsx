import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Boxes, GitBranch, Search, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TabCommandPalette } from '@/features/command/TabCommandPalette';

const navigation = [
  { to: '/sessions', label: 'Sessions', icon: Boxes },
  { to: '/journey', label: 'Parcours', icon: GitBranch },
  { to: '/search', label: 'Recherche', icon: Search, shortcut: '⌘K' },
  { to: '/settings', label: 'Réglages', icon: Settings },
];

export function AppShell() {
  const [storage, setStorage] = useState('Stockage local');
  useEffect(() => { void navigator.storage?.estimate().then(({ usage }) => setStorage(usage ? `${(usage / 1_048_576).toFixed(1)} Mo en local` : 'Stockage local')); }, []);
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">PK</div><span>PK Session</span></div>
      <nav className="sidebar-nav">{navigation.map(({ to, label, icon: Icon, shortcut }) => <NavLink key={to} to={to} className={({ isActive }) => cn('nav-item', isActive && 'active')}><Icon /><span>{label}</span>{shortcut ? <kbd>{shortcut}</kbd> : null}</NavLink>)}</nav>
      <div className="storage-status"><span className="status-dot" /><div><strong>Enregistrement local</strong><span>{storage}</span></div></div>
    </aside>
    <main className="app-content"><Outlet /></main><TabCommandPalette />
  </div>;
}
