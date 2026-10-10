# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.4] - 2026-10-10
### Fixed
- **Chennai AQI Bug**: Fixed CPCB sub-index calculation in `aqi.py` to handle intermediate float concentrations between discrete breakpoint boundaries without erroneous spikes to AQI 500.
- **Air vs. Heat Risk Attribution**: Fixed advisory sentence generation to separate air pollution warnings (`AIR_SEVERE_AVOID`) from heat stress warnings (`HEAT_WBGT_OVER_LIMIT`), ensuring air avoidance windows cite AQI cards and do not claim heat as the cause.
- **No Safe Window Guidance**: Prevented misleading recommendations of "cooler early morning hours" when morning hours are hazardous (e.g. morning winter smog); plain language advice now directs workers to suspend non-essential exposure.
- **Replay Scenario Wording**: Standardized replay advisory text to "On this recorded day" across English, Hindi, and Tamil.
- **Technical Acronym Elimination**: Replaced technical acronyms (such as "WBGT") with natural plain-language descriptions in worker-facing advisory sentences.
- **Secrets & Audit Hygiene**: Added strict sanitization of auth passcodes, API keys, and session tokens from audit events and responses.
- **Packaged Fixtures on AWS Lambda**: Bundled canonical scenario fixtures into `chhaya_engine` package and build scripts to ensure `POST /plan` and `POST /advise` replay scenarios work seamlessly on AWS Lambda.

### Added
- Bedrock candidate model benchmark script `scripts/bench_models.py`.
- Local standalone server verification script `scripts/verify_local_server.py`.
- Automated smoke test with live deployed API in `ap-south-1` (`https://09mp10pdca.execute-api.ap-south-1.amazonaws.com`).

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
