import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import YAML from 'yaml';

describe('OpenAPI Spec Contract Verification', () => {
  const specPath = path.resolve(__dirname, '../../../docs/openapi.yaml');
  const fileContent = fs.readFileSync(specPath, 'utf8');
  const spec = YAML.parse(fileContent);

  it('contains all essential paths used by the web client', () => {
    const paths = spec.paths;
    expect(paths['/health']?.get).toBeDefined();
    expect(paths['/cities']?.get).toBeDefined();
    expect(paths['/scenarios']?.get).toBeDefined();
    expect(paths['/plan']?.post).toBeDefined();
    expect(paths['/advise']?.post).toBeDefined();
    expect(paths['/board']?.get).toBeDefined();
    expect(paths['/stats']?.get).toBeDefined();
    expect(paths['/audit']?.get).toBeDefined();
    expect(paths['/crews']?.get).toBeDefined();
    expect(paths['/crews']?.post).toBeDefined();
    expect(paths['/crews/{id}']?.delete).toBeDefined();
  });

  it('defines required fields in key schemas', () => {
    const schemas = spec.components?.schemas;
    expect(schemas).toBeDefined();

    // DayPlan schema
    const dayPlan = schemas.DayPlan;
    expect(dayPlan.properties.city_label).toBeDefined();
    expect(dayPlan.properties.hours).toBeDefined();
    expect(dayPlan.properties.windows).toBeDefined();
    expect(dayPlan.properties.dangerous_windows).toBeDefined();
    expect(dayPlan.properties.recommended_blocks).toBeDefined();
    expect(dayPlan.properties.overall_risk).toBeDefined();
    expect(dayPlan.properties.hydration).toBeDefined();
    expect(dayPlan.properties.mask).toBeDefined();
    expect(dayPlan.properties.seek_help_lines).toBeDefined();

    // Advisory schema
    const advisory = schemas.Advisory;
    expect(advisory.properties.language).toBeDefined();
    expect(advisory.properties.sentences).toBeDefined();
    expect(advisory.properties.used_fallback).toBeDefined();

    // GlobalStats schema
    const stats = schemas.GlobalStats;
    expect(stats.properties.plans_generated).toBeDefined();
    expect(stats.properties.cities_covered).toBeDefined();
    expect(stats.properties.hours_flagged).toBeDefined();
    expect(stats.properties.advisories_generated).toBeDefined();
    expect(stats.properties.seeded).toBeDefined();

    // Scenario schema
    const scenario = schemas.Scenario;
    expect(scenario.properties.id).toBeDefined();
    expect(scenario.properties.label).toBeDefined();
    expect(scenario.properties.city_id).toBeDefined();
    expect(scenario.properties.max_temp_c).toBeDefined();
    expect(scenario.properties.max_pm2_5).toBeDefined();

    // AuditEvent schema
    const auditEvent = schemas.AuditEvent;
    expect(auditEvent.properties.id).toBeDefined();
    expect(auditEvent.properties.event_type).toBeDefined();
    expect(auditEvent.properties.timestamp).toBeDefined();
    expect(auditEvent.properties.details).toBeDefined();
  });

  it('documents whether openapi.yaml defines an enum for AuditEvent.event_type', () => {
    const schemas = spec.components?.schemas;
    const auditEventType = schemas?.AuditEvent?.properties?.event_type;
    // OpenAPI currently defines event_type as generic string; UI derives options dynamically
    expect(auditEventType.type).toBe('string');
  });
});
