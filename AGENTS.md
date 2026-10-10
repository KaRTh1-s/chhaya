# Chhaya AGENTS

**Do Not List**:
- Do not use Python 3.12-only features (PEP 695 type parameter syntax, `type` statements, nested same-quote f-strings). Python target is 3.11.
- Never put numbers or thresholds in LLM prompts without computing them in code.
- Never commit secrets.
- Never claim outcomes we cannot measure (e.g. 'avoided'); say 'flagged' or 'advised'.
- No performance, accuracy or cost claims without a measurement we ran; cite the measurement.
- Reporting rule: a report may say a command succeeded only if it ran in THIS session. Paste the RAW terminal output (unedited, trimmed only by "...") for every verification item. If something could not run, write "NOT RUN" plus the reason. Never write "Unfinished items: None" without listing skipped preconditions. Never state a number you did not print.

**Instructions**:
- Read docs/PROJECT_BRIEF.md, docs/DESIGN_BRIEF.md, and docs/ROADMAP.md first before working.
- Keep commits small and logical.
- Run `make test` (or `.\scripts\dev.ps1 test` on Windows) before declaring a phase done.
- Update docs/ROADMAP.md checkboxes and CHANGELOG.md at the end of every phase.

