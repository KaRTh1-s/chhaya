# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
