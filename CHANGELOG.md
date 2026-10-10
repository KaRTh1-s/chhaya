# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.2] - 2026-10-10

### Added
- Static hosting simulation and Content Security Policy verification server in `scripts/serve-dist-with-csp.mjs`.
- Automated CSP validation script in `scripts/test-csp.mjs`.
- Plans-page keyboard audit in `scripts/test-plans-keyboard.mjs`.
- Optional heat and air attribution fields in the frontend API types.
- Attribution UI tests in `web/src/__tests__/attribution.test.tsx`.
- Mobile tap-target and keyboard-accessibility improvements.

### Changed
- Updated `scripts/deploy_web.ps1` to require `-ApiUrl`, derive the API origin, and pass it to the hosting stack.
- Regenerated mock data using the project's engine and template advisor, where supported by the available Python environment.
- Updated frontend vocabulary and replay scenario wording.
- Updated API contract types and UI handling for optional attribution fields.

## [0.5.1] - 2026-10-10

### Added
- AWS CloudFormation template for private S3 and CloudFront hosting in `infra/web-hosting.yaml`.
- Frontend deployment script in `scripts/deploy_web.ps1`.
- Frontend teardown script in `scripts/teardown_web.ps1`.
- Frontend environment variable documentation in `web/.env.example`.
- Web accessibility and visual QA runner in `scripts/qa-web.mjs`.
- Visible demo-data fallback banner.
- Keyboard accessibility improvements for data tables and SVG charts.
- Worker-first mobile layout on the Plans page.
- Dynamic audit event filtering and OpenAPI contract checks.

### Changed
- Removed unsupported scientific-standard claims from frontend wording.
- Replaced misleading real-time descriptions with modelled-data wording.
- Added environment-driven live-service flags, defaulting to no services claimed as live.

## [0.5.0] - 2026-10-10

### Added
- Eight application routes: Home, Plans, Board, Crews, Report, Analytics, Audit, and Safety.
- Route-level code splitting, loading states, error states, retry handling, and empty states.
- Plans experience with city and job selection, Live and Replay modes, shift configuration, hourly risk ribbon, charts, hydration guidance, mask guidance, advisory cards, evidence details, and share/copy actions.
- Risk Board with live and replay views, sorting, job filtering, and navigation to prefilled plans.
- Crew management UI with passcode-protected write controls.
- Printable daily report and client-side analytics visualizations.
- Audit event viewer and assumptions-based Safety page.
- Real-fixture mock-data generation script in `scripts/make-mock-data.py`.
- OpenAPI contract tests for the frontend API layer.
- Design tokens, typography, reusable components, responsive app shell, and `/design` styleguide.
- Keyboard shortcuts for application navigation.

### Changed
- Added visible demo-data indicators for mock mode.
- Added environment-driven application stack status.
- Added a responsive navigation and mobile-first Plans layout.

## [0.3.4] - 2026-10-10

### Fixed
- Corrected CPCB AQI sub-index calculations for intermediate pollutant concentrations.
- Improved heat-versus-air risk attribution in advisory generation.
- Prevented unsupported early-morning recommendations when no safe work window exists.
- Standardized recorded-scenario wording to "On this recorded day".
- Removed technical WBGT references from worker-facing advisory text where appropriate.
- Improved sanitization of secrets and authentication material in audit data.

### Added
- Candidate model benchmark script in `scripts/bench_models.py`.
- Local server verification script in `scripts/verify_local_server.py`.
- Automated API smoke-test tooling for the configured AWS region.

## [0.3.3] - 2026-10-10

### Added
- State and fixture verification scripts.
- WBGT sanity-check and decision-band analysis tooling.
- Hindi and Tamil city locative forms.
- Plain-language work-status descriptions.
- Validator checks for raw internal codes and enum names.
- Scenario ID, fixture date, and OpenAPI parity tests.

## [0.3.2] - 2026-10-10

### Added
- Backend deployment script in `scripts/deploy_backend.ps1`.
- API smoke-test and latency-measurement script in `scripts/smoke_api.ps1`.
- CloudWatch error alarms in the SAM template.
- Backend teardown script in `scripts/teardown_backend.ps1`.

## [0.3.1] - 2026-10-10

### Added
- Hindi and Tamil localization for advisory components.
- Evidence mapping for advisory numbers and times.
- Validator checks for evidence IDs and unsupported Latin-script text in localized advisories.
- Centralized translation catalog and native-review document.
- WBGT safety-margin analysis documentation.

## [0.3.0] - 2026-10-10

### Added
- `POST /advise` endpoint supporting English, Hindi, and Tamil.
- Deterministic TemplateAdvisor fallback.
- Amazon Bedrock Converse integration with prompt versioning, validation, retry, and fallback handling.
- Advisory validation for sentence count, evidence IDs, numbers, script, and prohibited medical claims.
- Separate Lambda architecture for API and advisory processing.
- Daily LLM call limit backed by DynamoDB.
- Advisor verification helper script.
- Parameterized tests across recorded fixtures, job types, and languages.

## [0.2.1] - 2026-10-10

### Added
- Structured hydration guidance derived from heat conditions.
- Recorded scenario discovery and replay support.
- Replay metadata in plan responses.
- Replay Risk Board mode.
- WBGT calibration tooling.
- Response-hygiene tests preventing DynamoDB storage keys from leaking into API responses.

### Changed
- Calibrated WBGT constants and documented the method.
- Improved recommended work-block selection.
- Ensured production statistics start at zero unless demo seeding is explicitly enabled.

## [0.2.0] - 2026-10-10

### Added
- AWS SAM backend using Lambda, API Gateway HTTP API, and DynamoDB.
- Single-table storage for reading caches, crews, statistics, and append-only audit events.
- API routes for health, cities, planning, board, statistics, audit, and crew operations.
- Local mock server and PowerShell development scripts.
- OpenAPI 3.0 API contract and parity tests.
- Backend packaging script.

## [0.1.1] - 2026-10-10

### Fixed
- Corrected dominant-reason selection for merged planning windows.
- Added workload-tier boundary tests.

### Added
- Recommended work blocks and no-safe-window guidance.
- Real weather and air-quality fixture recording script.
- Planner monotonicity, evidence-ID, and shift-clipping tests.

## [0.1.0] - 2026-10-10

### Added
- Core planning engine for WBGT, AQI, and work/rest recommendations.
- CPCB AQI rules and workload multipliers.
- Command-line planner.
- Initial fixtures and engine tests.

## [0.0.1] - 2026-10-09

### Added
- Initial project scaffold.
- Engine, backend, and web package structure.
- Initial CI configuration.

[Keep a Changelog]: https://keepachangelog.com/en/1.0.0/
[Semantic Versioning]: https://semver.org/spec/v2.0.0.html