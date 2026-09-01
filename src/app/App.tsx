import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import { AppShell } from './AppShell';
import { SessionsPage } from '@/features/sessions/SessionsPage';

const JourneyPage = lazy(() => import('@/features/journey/JourneyPage').then((module) => ({ default: module.JourneyPage })));
const SearchPage = lazy(() => import('@/features/search/SearchPage').then((module) => ({ default: module.SearchPage })));
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage').then((module) => ({ default: module.SettingsPage })));

export function App() {
  return <TooltipProvider delayDuration={250}><Suspense fallback={<div className="route-loading">Chargement…</div>}><Routes><Route element={<AppShell />}><Route index element={<Navigate to="/sessions" replace />} /><Route path="/sessions" element={<SessionsPage />} /><Route path="/journey" element={<JourneyPage />} /><Route path="/search" element={<SearchPage />} /><Route path="/settings" element={<SettingsPage />} /></Route></Routes></Suspense><Toaster /></TooltipProvider>;
}
