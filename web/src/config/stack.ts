export interface StackService {
  name: string;
  category: 'agent' | 'compute' | 'storage' | 'event' | 'infra';
  description: string;
  live: boolean;
}

export const APP_VERSION = '0.5.0';

/**
 * Honest AWS stack configuration.
 * Items default to live: false until deployed on AWS.
 * Home TopBanner and Ticker read this directly.
 */
export const STACK_SERVICES: StackService[] = [
  {
    name: 'Strands Agents SDK',
    category: 'agent',
    description: 'Autonomous multi-step reasoning with deterministic schema validation',
    live: false,
  },
  {
    name: 'Amazon Bedrock',
    category: 'agent',
    description: 'Multilingual phrasing in Hindi, Tamil and English pinned to evidence cards',
    live: false,
  },
  {
    name: 'AWS Lambda',
    category: 'compute',
    description: 'Serverless execution of deterministic heat index & planner engine',
    live: false,
  },
  {
    name: 'Amazon API Gateway',
    category: 'compute',
    description: 'HTTP API with rate-limiting, CORS, and passcode security',
    live: false,
  },
  {
    name: 'Amazon DynamoDB',
    category: 'storage',
    description: 'Single-table design for crews, audit logs and forecast cache',
    live: false,
  },
  {
    name: 'Amazon EventBridge',
    category: 'event',
    description: 'Cron scheduler dispatching hourly forecast scans and risk alerts',
    live: false,
  },
  {
    name: 'Amazon SNS',
    category: 'event',
    description: 'SMS/Email broadcast notifications for high-risk heat windows',
    live: false,
  },
  {
    name: 'AWS SAM',
    category: 'infra',
    description: 'Infrastructure as Code template and local testing runtime',
    live: false,
  },
  {
    name: 'Amazon CloudWatch',
    category: 'infra',
    description: 'Operational metrics, structured audit logs and alarm triggers',
    live: false,
  },
  {
    name: 'AWS Amplify / CloudFront',
    category: 'infra',
    description: 'Global CDN distribution for React client SPA',
    live: false,
  },
];

export const isLiveDeployment = STACK_SERVICES.some((s) => s.live);
