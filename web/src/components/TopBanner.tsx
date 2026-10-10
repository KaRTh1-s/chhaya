import React from 'react';
import { APP_VERSION, isLiveDeployment, STACK_SERVICES } from '../config/stack';
import { LINKS } from '../config/links';

export const TopBanner: React.FC = () => {
  const bedrockService = STACK_SERVICES.find((s) => s.name === 'Amazon Bedrock');
  const bedrockLive = bedrockService?.live ?? false;

  const stackText = bedrockLive
    ? 'Built on AWS Strands Agents + Amazon Bedrock.'
    : 'Open source heat & air copilot. Runs on your laptop (AWS deployment in progress).';

  const deploymentText = isLiveDeployment ? 'Live on AWS.' : 'Local / Demo Mode.';

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
