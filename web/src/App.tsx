import React, { useState } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { CursorGlow } from './components/CursorGlow';
import { Footer } from './components/Footer';
import { HelpButton } from './components/HelpButton';
import { NavPill } from './components/NavPill';
import { TopBanner } from './components/TopBanner';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { DesignPage } from './pages/Design';
import { Home } from './pages/Home';
import {
  AnalyticsPage,
  AuditPage,
  CrewsPage,
  PlansPage,
  ReportPage,
  RiskBoardPage,
  SafetyPage,
} from './pages/Placeholders';

const AppContent: React.FC = () => {
  const [helpOpen, setHelpOpen] = useState(false);

  useKeyboardShortcuts({
    onOpenHelp: () => setHelpOpen((prev) => !prev),
    onCloseModal: () => setHelpOpen(false),
  });

  return (
    <div className="app-layout">
      <TopBanner />
      <NavPill />
      <CursorGlow />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/board" element={<RiskBoardPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/plans" element={<PlansPage />} />
        <Route path="/crews" element={<CrewsPage />} />
        <Route path="/audit" element={<AuditPage />} />
        <Route path="/report" element={<ReportPage />} />
        <Route path="/safety" element={<SafetyPage />} />
        <Route path="/design" element={<DesignPage />} />
      </Routes>

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
