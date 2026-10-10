# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.2] - 2026-10-10
### Added
- Static hosting simulation and exact CloudFront CSP verification server (`scripts/serve-dist-with-csp.mjs`).
- Full Playwright CSP automated validation across all 8 production routes (`scripts/test-csp.mjs`) confirming 0 CSP violations, 0 console errors, and 0 uncaught exceptions against local backend.
- Full keyboard focus audit script on `/plans` (`scripts/test-plans-keyboard.mjs`) verifying 65 interactive controls in logical sequence, Enter key form submission, modal dialog opening, and Escape key focus return to `EvidenceChip`.
- Attribution UI preparation: added optional `HourPlan.heat_status`, `HourPlan.air_status`, and `Window.driver` (`HEAT` | `AIR` | `BOTH`) to `types.ts`, displaying driver badges and ribbon tooltip statuses when present and cleanly omitted when absent.
- Attribution unit test suite (`web/src/__tests__/attribution.test.tsx`).
- Mobile tap target compliance: elevated nav tabs, brand link, buttons, chips, range inputs, and hour cells to minimum $44 \times 44$ CSS px on mobile viewports with horizontal scroll support.

### Changed
- Merged `main` (`v0.3.3`) into frontend branch with ordered CHANGELOG and ROADMAP preservation.
- Updated `scripts/deploy_web.ps1` to require `-ApiUrl`, automatically derive origin (scheme + authority, no path), and pass it to CloudFormation stack parameter `ApiBaseUrl`.
- Re-generated mock fixtures with `scripts/make-mock-data.py` using main repository Python virtual environment (`..\chhaya\.venv\Scripts\python.exe`), verifying non-empty datasets, zero raw `SEEK_HELP_` codes, zero bare enum words in sentences, replay advisories referencing "On this recorded day", and uniform `VENDOR` job types.
- Corrected scientific vocabulary across `web/src` and `docs`, resolving all ungrounded terms.

## [0.5.1] - 2026-10-10
### Added
- AWS CloudFormation static web hosting infrastructure template (`infra/web-hosting.yaml`) with private S3 bucket, CloudFront Origin Access Control (OAC), custom response security headers (HSTS, CSP, X-Frame-Options DENY, Permissions-Policy), and SPA routing rewrites.
- Automated deployment script (`scripts/deploy_web.ps1`) supporting environment parameterization, S3 asset syncing with optimal HTTP caching (1-year immutable for `/assets/*`, immediate revalidation for `index.html`), CloudFront cache invalidation, and live smoke checks.
- Automated teardown script (`scripts/teardown_web.ps1`) for clean environment deletion.
- Frontend environment variable documentation and CORS guidelines in `web/.env.example`.
- Automated Web Accessibility & Visual QA runner (`scripts/qa-web.mjs`) using Playwright and `@axe-core/playwright` with 18 automated screenshots across mobile and desktop viewport profiles.
- Resilient `DemoFallbackBanner` rendered when API service is unreachable with `data-testid="mock-badge"`.
- Keyboard accessibility fixes across all scrollable data tables and inline SVG chart containers (`tabIndex={0}`, `role="region"`, `aria-label`).
- Worker-first mobile layout reordering on `/plans` placing actionable advisory, emergency guidance, and dangerous window alerts above raw metrics and curves.
- Dynamic audit trail event type derivation and OpenAPI schema verification.

### Changed
- Wording tightened across UI to ensure total scientific transparency: removed unvalidated ISO claims, replaced "real-time" with "hourly modelled", and referenced National 112 / 108 emergency guidelines.
- Dynamic live subsystem flag parsing (`VITE_STACK_LIVE`) defaulting cleanly to mock/laptop mode.

## [0.5.0] - 2026-10-10
### Added
- Complete implementation of all 8 production application pages with code splitting (`React.lazy`), shared loading skeletons, error states with retry, empty states, and offline banner:
  - `/plans`: Hero shift safety planner with 12 Indian cities, GPS geolocation bounding box resolution, 4 job profiles, 3-language selector, Live vs Replay modes, 24-hour interactive ribbon, inline-SVG WBGT & AQI curves with workload limits, hydration schedule, mask recommendations, plain-language advisory cards with modal EvidenceChips, WhatsApp text formatter, Web Share API, and URL query synchronization.
  - `/board`: National Heat & Air Quality operational grid with Live and Replay tabs, sorting by thermal risk, job filtering, and quick navigation prefill.
  - `/crews`: Workforce roster management with passcode-protected write unlock (`sessionStorage`), crew creation, deletion with modal confirmation, and crew shift plan detail drawer.
  - `/report`: Printable one-page daily occupational brief with ranked city comparisons, flagged window schedules, hydration & PPE directives, print-optimized stylesheet, and plain-text clipboard exporter.
  - `/analytics`: Truthful system telemetry counters (`seeded` demo tag), LLM first-pass validation rate with sample size denominator, and deterministic client-side handmade inline-SVG charts across 4 benchmark historical weather scenarios.
  - `/audit`: Immutable operational event trail with event type filters, relative time formatters, expandable JSON detail payloads, and prominent PII-free privacy notice.
  - `/safety`: Scientific basis and transparency hub rendering dynamic assumptions matrix (`assumptions.json`), deterministic 4-step calculation pipeline, plain-words model validator rules, zero-LLM template fallbacks, meteorological limitations, and National 108 emergency heat stroke protocols.
  - Home polish: Honest data wording across product previews, calibrated threshold citations, and dynamic architecture ticker.
- Real mock data generation script (`scripts/make-mock-data.py`) running `chhaya_engine` and `TemplateAdvisor` in-process from real historical fixtures to produce deterministic plans, multilingual advisories, and `assumptions.json`.
- OpenAPI Contract testing suite (`openapiContract.test.ts`) validating API client endpoint signatures and response schema fidelity against `docs/openapi.yaml`.
- Comprehensive Vitest unit & integration test suite (34 tests across 16 files).

- Complete editorial Web Design System with design tokens (`tokens.css`, `base.css`, `components.css`), fluid typography scales (`EB Garamond`, `Inter Variable`, `JetBrains Mono`), and tactile hard offset CTA drop shadows.
- Interactive App Shell with `TopBanner` (truthful stack flags), `NavPill` (with live clock and mock indicator), `CursorGlow`, floating `HelpButton`, and comprehensive `Footer`.
- Home Page featuring headline hero, tilted product preview with Delhi heatwave plan, 3-language advisory switcher (EN / हिन्दी / தமிழ்), dark forest live telemetry stats band, weather vs Chhaya comparison cards, 4-step workflow, 6 feature cards, AWS architecture ticker, and 2-panel FAQ widget.
- Living styleguide and component catalog at `/design` route and `docs/design/DESIGN_SYSTEM.md`.
- Hand-written TypeScript API layer (`src/api/types.ts`, `src/api/client.ts`, `src/api/mock.ts`) with transparent fallback to real fixture-derived JSON data (`scripts/make-mock-data.py`).
- Global keyboard shortcuts navigation hook (`g` then `h/b/a/p/c/u/r/s/d`, `/` focus plan, `?` help, `Esc` dismiss).
- Unit and integration test suite (14 passing tests) covering components, mock fallback, ARIA accessibility labels, and honest counter handling.

## [0.3.3] - 2026-10-10
### Added
- State verification and fixtures audit automation `scripts/verify_state.ps1` and `scripts/verify_fixtures.py`.
- WBGT physical sanity check and decision-band margin analysis (`scripts/verify_wbgt.py`) comparing calibrated WBGT against independent Liljegren outdoor reference model.
- Locative city forms (`get_city_locative`) in `i18n.py` for natural Hindi (दिल्ली में) and Tamil (டெல்லியில், சென்னையில்) grammar.
- Plain-language status descriptions (`get_status_description`) expressing work/rest schedules without raw enum names.
- Strict validator rejection of raw system codes (e.g. `SEEK_HELP_*`, `HEAT_*`) and uppercase enum words in worker-facing advisories.
- Parity tests verifying scenario IDs, fixture metadata dates, and OpenAPI specification alignment.

## [0.3.2] - 2026-10-10
### Added
- Automated deployment script `scripts/deploy_backend.ps1` with test enforcement, build packaging, SAM linting, and secret validation.
- End-to-end smoke test and benchmark runner `scripts/smoke_api.ps1` measuring cold starts, p50/p95 warm latencies, and response hygiene.
- CloudWatch error alarms for `ApiFunction` and `AdvisorFunction` in SAM template (`backend/template.yaml`).
- Decommissioning script `scripts/teardown_backend.ps1` for clean stack deletion.

## [0.3.1] - 2026-10-10
### Added
- Full Hindi (`hi`) and Tamil (`ta`) localization across all advisor components (cities, risk terms, window guidance, hydration, and seek-help lines).
- Driving evidence card mapping in `facts.py` ensuring every stated number/time cites the exact matching evidence card.
- Strict validator enforcement: rejects mismatched evidence citations and runs of 3+ Latin words in Hindi/Tamil.
- Centralized translation catalog in `backend/src/chhaya_backend/agent/i18n.py` and native review list in `docs/i18n_review.md`.
- Honesty policy in `AGENTS.md` and measured WBGT safety margin audit in `docs/ASSUMPTIONS.md`.

## [0.3.0] - 2026-10-10
### Added
- Plain-language worker Advisory Agent endpoint `POST /advise` with multilingual support in English (`en`), Hindi (`hi`), and Tamil (`ta`).
- Grounded `TemplateAdvisor` generating deterministic, verifiable shift advice with zero network dependencies.
- `BedrockConverseAdvisor` supporting Amazon Bedrock Converse API with prompt versioning (`1.0.0`), 1-retry with error feedback, and graceful fallback to templates.
- Strict `validate_advisory_json` grounding pipeline verifying 1-5 sentence count, valid evidence card citations, absence of hallucinated numbers (`allowed_numbers` set matching), Devanagari/Tamil script compliance, and medical claim blocklist.
- Split Lambda architecture in SAM template (`ApiFunction` for fast sub-20ms cold starts, `AdvisorFunction` for Bedrock / AI SDK execution).
- Daily LLM call cost limiter via atomic DynamoDB counter (`MAX_LLM_CALLS_PER_DAY=300`) with automatic `daily_cap` fallback.
- PowerShell helper `scripts/try_advisor.ps1` for local and live advisor verification.
- 48 parameter matrix test suite covering all fixtures $\times$ job types $\times$ languages.

## [0.2.1] - 2026-10-10
### Added
- Structured hydration guidance in `DayPlan` and `HourPlan.hydration` ("NORMAL" | "FREQUENT") derived strictly from heat stress without air-pollution false triggers.
- Replay scenarios endpoint `GET /scenarios` returning 4 historical high-impact Indian weather days.
- `POST /plan` scenario replay mode anchoring evaluation date and returning source tracking metadata (`data_source`, `scenario_id`, `recorded_date`).
- `GET /board?mode=replay` matrix evaluation over all 4 recorded scenarios.
- Dev-only calibration script `scripts/calibrate_wbgt.py` against Liljegren outdoor reference model (`thermofeel`).
- Automated response hygiene tests asserting no DynamoDB storage keys (`pk`, `sk`, `ttl`) leak to callers.

### Changed
- Calibrated WBGT model with `SOLAR_ADJ_C_PER_KW_M2 = 2.0` and `CALIBRATION_OFFSET_C = -4.5`, reducing hot-dry mean bias from +4.76°C to +0.06°C.
- `recommended_blocks` algorithm selects up to 2 non-overlapping blocks minimizing combined risk (WORK > CAUTION > REDUCED, never AVOID) with block status reflecting worst hour inside.
- `/stats` honesty: counters start at 0 in production and demo seeding is gated strictly on `CHHAYA_SEED_DEMO=1`.

## [0.2.0] - 2026-10-10
### Added
- AWS SAM Backend infrastructure on Lambda (`python3.11`, `arm64`), HTTP API Gateway v2, and DynamoDB.
- Single-table DynamoDB storage engine for reading caches (30-min TTL), crew management, atomic global stats counters, and 30-day append-only audit trail without PII.
- Hand-written lightweight router supporting `/health`, `/cities`, `/plan`, `/board`, `/stats`, `/audit`, and `/crews` CRUD with constant-time `X-Chhaya-Passcode` validation.
- Local mock server runner (`scripts/dev.ps1 serve`) with in-process `moto` DynamoDB and pre-seeded demo fleets.
- OpenAPI 3.0 contract specification at `docs/openapi.yaml` with automated parity tests.
- Backend build script `scripts/build_backend.ps1` packaging `chhaya_engine` alongside Lambda handlers.

## [0.1.1] - 2026-10-10
### Fixed
- Window `summary_code` now computes dominant reason across the merged block based on severity hierarchy and non-safe frequency.
- Heat tier boundaries strictly validated against spec and covered with table-driven tests.

### Added
- `DayPlan.recommended_blocks` and `DayPlan.no_safe_window` with CLI representation.
- `scripts/record_fixture.py` recording real hourly weather and AQI archive data for Delhi, Chennai, and Coimbatore.
- Monotonicity, evidence ID, and shift clipping audit tests.

## [0.1.0] - 2026-10-10
### Added
- Core planner engine logic (WBGT, AQI, Work/Rest schedules).
- CPCB AQI rules and Workload multipliers.
- CLI application to run plans locally (`chhaya_engine.cli`).
- Fixtures and test suite for the engine.

## [0.0.1] - 2026-10-09
### Added
- Initial project scaffolding for Phase 0.
- Monorepo structure with engine, backend, and web packages.
- CI workflows and Makefile setup.
