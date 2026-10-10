import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  parseLiveServices,
  buildStackServices,
  getBannerText,
  SERVICE_DEFINITIONS,
} from '../config/stack';
import { TopBanner } from '../components/TopBanner';

describe('Stack Configuration & TopBanner / Ticker truthfulness', () => {
  it('handles none live configuration truthfully', () => {
    const liveSet = parseLiveServices('');
    expect(liveSet.size).toBe(0);

    const services = buildStackServices(liveSet);
    expect(services.every((s) => !s.live)).toBe(true);

    const { stackText, deploymentText } = getBannerText(services);
    expect(stackText).toContain('Runs on your laptop');
    expect(deploymentText).toBe('Local / Demo Mode.');

    render(<TopBanner services={services} />);
    expect(screen.getByText(/Local \/ Demo Mode\./i)).toBeInTheDocument();
  });

  it('handles only lambda, apigateway, dynamodb live configuration truthfully', () => {
    const liveSet = parseLiveServices('lambda,apigateway,dynamodb');
    expect(liveSet.size).toBe(3);

    const services = buildStackServices(liveSet);
    const liveServices = services.filter((s) => s.live);
    expect(liveServices.map((s) => s.id).sort()).toEqual(['apigateway', 'dynamodb', 'lambda']);

    const { stackText, deploymentText } = getBannerText(services);
    expect(stackText).toContain('AWS backend live (API Gateway + Lambda + DynamoDB)');
    expect(deploymentText).toBe('Live Backend Mode.');

    render(<TopBanner services={services} />);
    expect(screen.getByText(/Live Backend Mode\./i)).toBeInTheDocument();
  });

  it('handles all live services configuration truthfully', () => {
    const allIds = SERVICE_DEFINITIONS.map((s) => s.id).join(',');
    const liveSet = parseLiveServices(allIds);
    expect(liveSet.size).toBe(SERVICE_DEFINITIONS.length);

    const services = buildStackServices(liveSet);
    expect(services.every((s) => s.live)).toBe(true);

    const { stackText, deploymentText } = getBannerText(services);
    expect(stackText).toContain('Fully deployed on AWS');
    expect(deploymentText).toBe('Live Production Mode.');

    render(<TopBanner services={services} />);
    expect(screen.getByText(/Live Production Mode\./i)).toBeInTheDocument();
  });
});
