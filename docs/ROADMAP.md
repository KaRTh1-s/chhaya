# Chhaya Roadmap

## Completed

- [x] Phase 0: Scaffold project
- [x] Phase 1: Core Engine (Weather/AQI logic)
- [x] Phase 1.1: Planner Fidelity & Real Fixtures (dominant reasons, boundary tests, recommended blocks)
- [x] Phase 2: Backend API (AWS SAM, DynamoDB, API Gateway, local mock server)
- [x] Phase 2.1: Honesty, Scenarios & Calibration (heat-only hydration, scenario replays, WBGT calibration, response hygiene)
- [x] Phase 3: Strands Agent & LLM Fallback (Bedrock Converse, TemplateAdvisor, strict validator)
- [x] Phase 3.1: Advisory Quality & Localization (Hindi/Tamil translation, evidence mapping)
- [x] Phase 3.3: Reconcile, Verify & Quality Polish (WBGT sanity checks, locatives, raw-code elimination)
- [x] Phase 4: Web UI & Design System Foundation
- [x] Phase 5: Web UI Real Pages & Integration
- [x] Phase 5.1: Web UI Hardening, Accessibility & Hosting Infrastructure Preparation
- [x] Phase 5.2: Integration, CSP Validation, Tap-Target Compliance & Gap Closing
- [x] Phase 7a: Backend Deployment & Smoke Automation
- [x] Phase 7b: Backend Deployment Verification & Correctness Fixes

## Remaining

- [ ] Verify the final merged frontend and backend together
- [ ] Verify the public backend API and frontend website using live HTTP requests
- [ ] Complete frontend AWS hosting and confirm the CloudFront URL, if not already deployed
- [ ] Verify Amazon Bedrock model access and real-model advisory generation
- [ ] Complete final integrated regression tests
- [ ] Phase 5: Proactive Alerts (EventBridge and SNS)
- [ ] Phase 6: Final Polish & Full Production Cutover
- [ ] Update deployment documentation with verified URLs, commands, and test results

## Release readiness

The project should be considered ready for final release only after the merged application builds successfully, the automated tests pass, and the required local or deployed API checks have been run. Any unavailable AWS or Bedrock functionality must be documented explicitly.