import sys
import json
import pytest
from unittest.mock import patch
from io import StringIO
from chhaya_engine.cli import main

def test_cli_json(monkeypatch):
    test_args = ["cli", "--city", "delhi", "--job", "rider", "--fixture", "engine/tests/fixtures/delhi_summer_heat.json", "--json", "--now", "2026-05-01T12:00:00Z"]
    monkeypatch.setattr(sys, 'argv', test_args)
    
    captured_output = StringIO()
    monkeypatch.setattr(sys, 'stdout', captured_output)
    
    main()
    
    output = captured_output.getvalue()
    data = json.loads(output)
    assert data["city_label"] == "Delhi"

def test_cli_human(monkeypatch):
    test_args = ["cli", "--city", "delhi", "--job", "rider", "--fixture", "engine/tests/fixtures/delhi_summer_heat.json", "--now", "2026-05-01T12:00:00Z"]
    monkeypatch.setattr(sys, 'argv', test_args)
    
    captured_output = StringIO()
    monkeypatch.setattr(sys, 'stdout', captured_output)
    
    main()
    
    output = captured_output.getvalue()
    assert "Plan for Delhi | RIDER" in output
    assert "Windows:" in output

def test_cli_unknown_city(monkeypatch):
    test_args = ["cli", "--city", "unknown", "--job", "rider"]
    monkeypatch.setattr(sys, 'argv', test_args)
    
    with pytest.raises(SystemExit):
        main()
