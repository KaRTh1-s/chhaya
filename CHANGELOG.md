# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0] - 2026-10-10
### Added
- Complete editorial Web Design System with design tokens (`tokens.css`, `base.css`, `components.css`), fluid typography scales (`EB Garamond`, `Inter Variable`, `JetBrains Mono`), and tactile hard offset CTA drop shadows.
- Interactive App Shell with `TopBanner` (truthful stack flags), `NavPill` (with live clock and mock indicator), `CursorGlow`, floating `HelpButton`, and comprehensive `Footer`.
- Home Page featuring headline hero, tilted product preview with Delhi heatwave plan, 3-language advisory switcher (EN / हिन्दी / தமிழ்), dark forest live telemetry stats band, weather vs Chhaya comparison cards, 4-step workflow, 6 feature cards, AWS architecture ticker, and 2-panel FAQ widget.
- Living styleguide and component catalog at `/design` route and `docs/design/DESIGN_SYSTEM.md`.
- Hand-written TypeScript API layer (`src/api/types.ts`, `src/api/client.ts`, `src/api/mock.ts`) with transparent fallback to real fixture-derived JSON data (`scripts/make-mock-data.py`).
- Global keyboard shortcuts navigation hook (`g` then `h/b/a/p/c/u/r/s/d`, `/` focus plan, `?` help, `Esc` dismiss).
- Unit and integration test suite (14 passing tests) covering components, mock fallback, ARIA accessibility labels, and honest counter handling.

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
