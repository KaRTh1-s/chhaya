import React from 'react';
import { NavLink } from 'react-router-dom';
import { LINKS } from '../config/links';
import { APP_VERSION } from '../config/stack';

export const Footer: React.FC = () => {
  return (
    <footer className="footer-container" role="contentinfo">
      <div className="container">
        <div className="footer-wordmark">Chhaya</div>

        <div className="footer-columns">
          <div>
            <div className="footer-col-title">Product</div>
            <ul className="footer-col-list">
              <li><NavLink to="/plans">Daily Exposure Plans</NavLink></li>
              <li><NavLink to="/analytics">Regional Analytics</NavLink></li>
              <li><NavLink to="/crews">Crew Dashboard</NavLink></li>
            </ul>
          </div>

          <div>
            <div className="footer-col-title">Run it</div>
            <ul className="footer-col-list">
              <li><a href={LINKS.github} target="_blank" rel="noopener noreferrer">GitHub Repository</a></li>
              <li><a href={LINKS.docs} target="_blank" rel="noopener noreferrer">Architecture Docs</a></li>
              <li><NavLink to="/design">Design System &amp; Tokens</NavLink></li>
              <li><a href="http://localhost:8787/docs" target="_blank" rel="noopener noreferrer">Local OpenAPI Specs</a></li>
            </ul>
          </div>

          <div>
            <div className="footer-col-title">Trust &amp; Safety</div>
            <ul className="footer-col-list">
              <li><NavLink to="/safety">Assumptions Ledger</NavLink></li>
              <li><NavLink to="/audit">Anonymized Audit Log</NavLink></li>
              <li><a href={LINKS.openMeteo} target="_blank" rel="noopener noreferrer">Open-Meteo Weather API</a></li>
              <li><a href={LINKS.strands} target="_blank" rel="noopener noreferrer">AWS Strands Agents SDK</a></li>
            </ul>
          </div>

          <div>
            <div className="footer-col-title">Project</div>
            <ul className="footer-col-list">
              <li><NavLink to="/safety">Health &amp; Medical Disclaimer</NavLink></li>
              <li><a href={LINKS.github} target="_blank" rel="noopener noreferrer">Open Source MIT License</a></li>
              <li><span>v{APP_VERSION} (Phase 4 UI)</span></li>
              <li><span>Target: India Urban Outdoor</span></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom-row">
          <div>
            Heat &amp; Air Exposure Copilot for Outdoor Workers. Advisories are operational guidance, not medical advice.
          </div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <span>Press <kbd style={{ padding: '1px 5px', border: '1px solid #999', borderRadius: '3px' }}>?</kbd> for shortcuts</span>
            <span>&middot;</span>
            <span><kbd style={{ padding: '1px 5px', border: '1px solid #999', borderRadius: '3px' }}>g</kbd> <kbd style={{ padding: '1px 5px', border: '1px solid #999', borderRadius: '3px' }}>p</kbd> for Plans</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
