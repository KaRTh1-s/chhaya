import React, { useState } from 'react';

export interface FaqItem {
  id: string;
  question: string;
  answer: React.ReactNode;
}

const DEFAULT_FAQS: FaqItem[] = [
  {
    id: 'is-it-safe',
    question: 'Is it safe?',
    answer: (
      <>
        <p style={{ marginBottom: '12px' }}>
          <strong>Evidence before the model:</strong> All temperature thresholds, WBGT heat-stress estimates, AQI exposure calculations, and work/rest tiers are computed strictly by deterministic Python/TypeScript code before any LLM is called.
        </p>
        <p>
          Advisories are operational risk guidance and never medical advice. Every plan generated includes mandatory heat illness warning signs and a direct instruction on when to seek medical help (such as calling 108).
        </p>
      </>
    ),
  },
  {
    id: 'what-can-it-change',
    question: 'What can it change?',
    answer: (
      <>
        <p style={{ marginBottom: '12px' }}>
          Chhaya produces shift schedule recommendations (safe morning/evening blocks, midday rest periods, hydration intervals, and mask recommendations).
        </p>
        <p>
          Reads and plans are completely public and free. Mutating crew profiles or registering new worker groups requires a secure constant-time passcode (<code>X-Chhaya-Passcode</code>).
        </p>
      </>
    ),
  },
  {
    id: 'what-if-bedrock-down',
    question: 'What if Bedrock is down?',
    answer: (
      <>
        <p style={{ marginBottom: '12px' }}>
          <strong>Zero-LLM fallback:</strong> The entire product functions without an LLM. If Amazon Bedrock is unreachable or if the model output fails schema validation, Chhaya immediately falls back to deterministic template text.
        </p>
        <p>
          The safety schedules, window calculations, and hydration intervals are 100% computed in code, so workers and contractors never experience an outage.
        </p>
      </>
    ),
  },
  {
    id: 'model-vs-code',
    question: 'Which parts are the model, and which are code?',
    answer: (
      <>
        <p style={{ marginBottom: '12px' }}>
          <strong>Code:</strong> Open-Meteo API ingestion, WBGT calculation (ambient temp + humidity + solar radiation + wind), 24h AQI break-point mapping, work/rest tier allocation, and safe window finding.
        </p>
        <p>
          <strong>Model (Bedrock):</strong> Phrasing the already-computed numbers into natural, culturally respectful Hindi, Tamil, and English sentences, where every single sentence is pinned to an evidence card.
        </p>
      </>
    ),
  },
  {
    id: 'run-without-aws',
    question: 'Can I run it without an AWS account?',
    answer: (
      <>
        <p style={{ marginBottom: '12px' }}>
          Yes. The repository includes an in-process local mock server (<code>scripts/dev.ps1 serve</code>) and fixture replay mode that runs on any laptop without credentials.
        </p>
        <p>
          The web application automatically detects local mock mode, marks numbers with a visible "demo data" badge, and replays real recorded weather days from Delhi, Chennai, and Coimbatore.
        </p>
      </>
    ),
  },
  {
    id: 'what-did-it-cost',
    question: 'What did it cost?',
    answer: (
      <>
        <p style={{ marginBottom: '12px' }}>
          Open-Meteo weather and air quality APIs are open and free (zero key cost). Lambda and API Gateway operate comfortably inside the AWS Free Tier during normal contractor usage.
        </p>
        <p>
          Amazon Bedrock prompt tokens are strictly constrained because we only pass structured numbers to phrase short advisories rather than unbounded conversational context.
        </p>
      </>
    ),
  },
];

interface FaqPanelProps {
  items?: FaqItem[];
  className?: string;
}

export const FaqPanel: React.FC<FaqPanelProps> = ({ items = DEFAULT_FAQS, className = '' }) => {
  const [selectedId, setSelectedId] = useState<string>(items[0]?.id || '');
  const activeFaq = items.find((item) => item.id === selectedId) || items[0];

  return (
    <div className={`faq-two-panel ${className}`.trim()}>
      <div className="faq-questions-panel">
        <div className="faq-questions-title">Questions</div>
        {items.map((item) => {
          const isActive = item.id === activeFaq?.id;
          return (
            <button
              key={item.id}
              type="button"
              className={`faq-question-btn ${isActive ? 'active' : ''}`}
              onClick={() => setSelectedId(item.id)}
              aria-pressed={isActive}
            >
              {item.question}
            </button>
          );
        })}
      </div>

      <div className="faq-answers-panel">
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--color-forest)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Answer
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-ink-muted)' }}>
              {activeFaq?.question}
            </span>
          </div>

          <h3 className="faq-answer-heading">{activeFaq?.question}</h3>
          <div className="faq-answer-body">{activeFaq?.answer}</div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '24px' }}>
          <span
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-forest)',
              color: '#FFFFFF',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
            }}
          >
            &#10003;
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-ink-muted)' }}>
            Verified against docs/ASSUMPTIONS.md
          </span>
        </div>
      </div>
    </div>
  );
};
