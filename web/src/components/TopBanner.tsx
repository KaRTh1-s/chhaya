import React from 'react';
import { APP_VERSION, getBannerText, STACK_SERVICES } from '../config/stack';
import { LINKS } from '../config/links';

export const TopBanner: React.FC<{ services?: typeof STACK_SERVICES }> = ({ services = STACK_SERVICES }) => {
  const { stackText, deploymentText } = getBannerText(services);

  return (
    <aside className="top-banner" aria-label="Announcement banner">
      <span>
        {stackText} {deploymentText} v{APP_VERSION}.{' '}
        <a href={LINKS.github} target="_blank" rel="noopener noreferrer">
          Judge access in the submission &rarr;
        </a>
      </span>
    </aside>
  );
};
