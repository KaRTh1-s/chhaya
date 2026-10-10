import React, { Suspense, lazy, useState } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { CursorGlow } from './components/CursorGlow';
import { LoadingSkeleton, OfflineBanner, DemoFallbackBanner } from './components/Feedback';
import { Footer } from './components/Footer';
import { HelpButton } from './components/HelpButton';
import { NavPill } from './components/NavPill';
import { TopBanner } from './components/TopBanner';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

// Lazy loaded page components
const HomePage = lazy(() => import('./pages/Home').then((m) => ({ default: m.Home })));
const PlansPage = lazy(() => import('./pages/Plans').then((m) => ({ default: m.PlansPage })));
const BoardPage = lazy(() => import('./pages/Board').then((m) => ({ default: m.BoardPage })));
const CrewsPage = lazy(() => import('./pages/Crews').then((m) => ({ default: m.CrewsPage })));
const DesignPage = lazy(() => import('./pages/Design').then((m) => ({ default: m.DesignPage })));

// Placeholders for remaining pages (will be swapped as each page is built)
const ReportPage = lazy(() => import('./pages/Report').then((m) => ({ default: m.Report })));
const AnalyticsPage = lazy(() => import('./pages/Analytics').then((m) => ({ default: m.Analytics })));
const AuditPage = lazy(() => import('./pages/Audit').then((m) => ({ default: m.Audit })));
const SafetyPage = lazy(() => import('./pages/Safety').then((m) => ({ default: m.Safety })));

const AppContent: React.FC = () => {
  const [helpOpen, setHelpOpen] = useState(false);

  useKeyboardShortcuts({
    onOpenHelp: () => setHelpOpen((prev) => !prev),
    onCloseModal: () => setHelpOpen(false),
  });

  return (
    <div className="app-layout">
      <OfflineBanner />
      <DemoFallbackBanner />
      <TopBanner />
      <NavPill />
      <CursorGlow />

      <main style={{ minHeight: '70vh' }}>
        <Suspense fallback={<div className="container" style={{ padding: 'var(--space-8)' }}><LoadingSkeleton rows={4} height="32px" /></div>}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/board" element={<BoardPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/plans" element={<PlansPage />} />
            <Route path="/crews" element={<CrewsPage />} />
            <Route path="/audit" element={<AuditPage />} />
            <Route path="/report" element={<ReportPage />} />
            <Route path="/safety" element={<SafetyPage />} />
            <Route path="/design" element={<DesignPage />} />
          </Routes>
        </Suspense>
      </main>

      <HelpButton isOpen={helpOpen} onToggle={() => setHelpOpen(!helpOpen)} />
      <Footer />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  );
};

export default App;
