export interface StackService {
  id: string;
  name: string;
  category: 'agent' | 'compute' | 'storage' | 'event' | 'infra';
  description: string;
  live: boolean;
}

export const APP_VERSION = '0.5.1';

export const SERVICE_DEFINITIONS: Array<Omit<StackService, 'live'>> = [
  {
    id: 'strands',
    name: 'Strands Agents SDK',
    category: 'agent',
    description: 'Autonomous multi-step reasoning with deterministic schema validation',
  },
  {
    id: 'bedrock',
    name: 'Amazon Bedrock',
    category: 'agent',
    description: 'Multilingual phrasing in Hindi, Tamil and English pinned to evidence cards',
  },
  {
    id: 'lambda',
    name: 'AWS Lambda',
    category: 'compute',
    description: 'Serverless execution of deterministic heat index & planner engine',
  },
  {
    id: 'apigateway',
    name: 'Amazon API Gateway',
    category: 'compute',
    description: 'HTTP API with rate-limiting, CORS, and passcode security',
  },
  {
    id: 'dynamodb',
    name: 'Amazon DynamoDB',
    category: 'storage',
    description: 'Single-table design for crews, audit logs and forecast cache',
  },
  {
    id: 'eventbridge',
    name: 'Amazon EventBridge',
    category: 'event',
    description: 'Cron scheduler dispatching hourly forecast scans and risk alerts',
  },
  {
    id: 'sns',
    name: 'Amazon SNS',
    category: 'event',
    description: 'SMS/Email broadcast notifications for high-risk heat windows',
  },
  {
    id: 'sam',
    name: 'AWS SAM',
    category: 'infra',
    description: 'Infrastructure as Code template and local testing runtime',
  },
  {
    id: 'cloudwatch',
    name: 'Amazon CloudWatch',
    category: 'infra',
    description: 'Operational metrics, structured audit logs and alarm triggers',
  },
  {
    id: 'cloudfront',
    name: 'Amazon CloudFront',
    category: 'infra',
    description: 'Global CDN distribution with Origin Access Control and HSTS/CSP',
  },
  {
    id: 's3',
    name: 'Amazon S3',
    category: 'storage',
    description: 'Private immutable SPA object storage',
  },
];

export function parseLiveServices(envString?: string): Set<string> {
  if (!envString) return new Set();
  return new Set(
    envString
      .toLowerCase()
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  );
}

export function buildStackServices(liveSet?: Set<string>): StackService[] {
  const activeLiveSet =
    liveSet ?? parseLiveServices((typeof import.meta !== 'undefined' && import.meta.env?.VITE_STACK_LIVE) || '');
  return SERVICE_DEFINITIONS.map((def) => ({
    ...def,
    live: activeLiveSet.has(def.id.toLowerCase()),
  }));
}

export function getBannerText(services: StackService[]): { stackText: string; deploymentText: string } {
  const liveServices = services.filter((s) => s.live);
  const liveIds = new Set(liveServices.map((s) => s.id));

  if (liveServices.length === 0) {
    return {
      stackText: 'Open source heat & air copilot. Runs on your laptop (AWS deployment in progress).',
      deploymentText: 'Local / Demo Mode.',
    };
  }

  const allLive = liveServices.length === services.length;
  if (allLive) {
    return {
      stackText: 'Fully deployed on AWS (CloudFront, API Gateway, Lambda, DynamoDB, Bedrock).',
      deploymentText: 'Live Production Mode.',
    };
  }

  // Check specific combinations
  const hasBedrock = liveIds.has('bedrock');
  const hasCoreBackend = liveIds.has('lambda') && liveIds.has('apigateway') && liveIds.has('dynamodb');

  if (hasBedrock && hasCoreBackend) {
    return {
      stackText: 'Built on AWS Strands Agents + Amazon Bedrock.',
      deploymentText: 'Live on AWS.',
    };
  }

  if (hasCoreBackend) {
    return {
      stackText: 'AWS backend live (API Gateway + Lambda + DynamoDB). Bedrock advisory in progress.',
      deploymentText: 'Live Backend Mode.',
    };
  }

  const liveNames = liveServices.map((s) => s.name).join(', ');
  return {
    stackText: `AWS services live: ${liveNames}.`,
    deploymentText: 'Partial Live Mode.',
  };
}

export const STACK_SERVICES: StackService[] = buildStackServices();
export const isLiveDeployment = STACK_SERVICES.some((s) => s.live);
