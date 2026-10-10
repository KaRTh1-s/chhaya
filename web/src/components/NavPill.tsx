import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { subscribeToMockStatus } from '../api/client';
import { APP_VERSION } from '../config/stack';

interface NavPillProps {
  region?: string;
}

export const NavPill: React.FC<NavPillProps> = ({ region = 'ap-south-1' }) => {
  const [isMock, setIsMock] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const unsub = subscribeToMockStatus((mockActive) => {
      setIsMock(mockActive);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-US', {
          hour12: true,
          hour: 'numeric',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const navItems = [
    { label: 'Home', path: '/' },
    { label: 'Analytics', path: '/analytics' },
    { label: 'Plans', path: '/plans' },
    { label: 'Crews', path: '/crews' },
    { label: 'Audit', path: '/audit' },
    { label: 'Safety', path: '/safety' },
  ];

  return (
    <div className="nav-pill-wrapper">
      <header className="nav-pill" role="banner">
        <div className="nav-top-row">
          <NavLink to="/" className="nav-brand" aria-label="Chhaya Home">
            <span className="nav-brand-dot" aria-hidden="true" />
            <span>Chhaya</span>
            <span className="nav-brand-tag">Heat & Air</span>
          </NavLink>
        </div>

        <nav className="nav-tabs" aria-label="Main Navigation">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="nav-status-line" aria-label="System status">
          <span className="nav-status-dot" aria-hidden="true" />
          <span>{region}</span>
          <span>&middot;</span>
          <span>v{APP_VERSION}</span>
          <span>&middot;</span>
          <span>{currentTime || '00:00:00'}</span>
          {isMock && (
            <span className="badge-demo" title="API running in mock / fixture replay mode" data-testid="mock-badge">
              demo data
            </span>
          )}
        </div>
      </header>
    </div>
  );
};
