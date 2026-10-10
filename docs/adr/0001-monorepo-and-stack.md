# ADR 0001: Monorepo and Stack

## Status
Accepted

## Context
We are building Chhaya in a 2-day hackathon. We need a setup that optimizes for correctness, reproducibility, and local development.

## Decision
- We will use a monorepo structure containing `engine`, `backend`, and `web`.
- Python 3.11 target. Python 3.11 chosen to match local dev environment and AWS Lambda python3.11 runtime; no 3.12-only syntax allowed.
- AWS SAM for infrastructure.
- Vite + React + TS for the web frontend.
- `moto` for local mocked AWS testing.

## Consequences
- Single Makefile can coordinate testing and setup.
- Easy to share types and engine logic with backend endpoints.
