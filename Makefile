.PHONY: setup test lint local build clean

setup:
	python -m venv .venv
	.venv\Scripts\pip install -e ./engine[dev]
	.venv\Scripts\pip install -e ./backend[dev]
	cd web && npm install && npm install -D vitest

test:
	.venv\Scripts\pytest engine/tests backend/tests
	cd web && npx vitest run

lint:
	.venv\Scripts\ruff check .
	cd web && npm run lint

local:
	@echo "Local mode not implemented yet"

build:
	cd web && npm run build

clean:
	if exist .venv rmdir /s /q .venv
	if exist web\node_modules rmdir /s /q web\node_modules
	if exist web\dist rmdir /s /q web\dist
