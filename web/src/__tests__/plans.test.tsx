import { describe, expect, it } from 'vitest';
import type { DayPlan, Advisory } from '../api/types';
import { formatWhatsAppText } from '../utils/formatters';
import delhiHeatwavePlan from '../api/mock-data/delhi-heatwave-2025-06-09.json';

describe('WhatsApp Text Formatter', () => {
  const plan = delhiHeatwavePlan as unknown as DayPlan;
  const mockAdvisory: Advisory = {
    language: 'en',
    sentences: [
      { text: 'Extreme heat stress projected in Delhi.', evidence_ids: ['ev1'] },
    ],
    seek_help: ['Call 108 in emergency.'],
    used_fallback: false,
  };

  it('formats English WhatsApp text cleanly with safe blocks and emergency line', () => {
    const text = formatWhatsAppText(plan, mockAdvisory, 'en');
    expect(text).toContain('*Chhaya Shift Safety Plan*');
    expect(text).toContain('Location: Delhi');
    expect(text).toContain('Extreme heat stress projected in Delhi.');
    expect(text.toLowerCase()).toContain('108');
  });

  it('formats Hindi WhatsApp text with Devanagari headers', () => {
    const text = formatWhatsAppText(plan, mockAdvisory, 'hi');
    expect(text).toContain('*छाया (Chhaya) कार्य सुरक्षा योजना*');
    expect(text).toContain('स्थान: Delhi');
  });

  it('formats Tamil WhatsApp text with Tamil headers', () => {
    const text = formatWhatsAppText(plan, mockAdvisory, 'ta');
    expect(text).toContain('*சாயா (Chhaya) பணி பாதுகாப்பு திட்டம்*');
  });
});
