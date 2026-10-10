import pytest

from chhaya_engine.models import HourStatus, Workload
from chhaya_engine.planner import get_base_heat_status
from chhaya_engine.thresholds import WBGT_LIMITS

TEST_DELTAS = [
    (-2.0, HourStatus.WORK, "HEAT_SAFE"),
    (-0.01, HourStatus.CAUTION, "HEAT_CAUTION"),
    (0.0, HourStatus.CAUTION, "HEAT_CAUTION"),
    (0.01, HourStatus.REDUCED, "HEAT_REDUCED_45_15"),
    (2.0, HourStatus.REDUCED, "HEAT_REDUCED_45_15"),
    (2.01, HourStatus.REDUCED, "HEAT_REDUCED_30_30"),
    (4.0, HourStatus.REDUCED, "HEAT_REDUCED_30_30"),
    (4.01, HourStatus.REDUCED, "HEAT_REDUCED_15_45"),
    (6.0, HourStatus.REDUCED, "HEAT_REDUCED_15_45"),
    (6.01, HourStatus.AVOID, "HEAT_WBGT_OVER_LIMIT"),
]

@pytest.mark.parametrize("workload", [Workload.LIGHT, Workload.MODERATE, Workload.HEAVY])
@pytest.mark.parametrize("delta, expected_status, expected_code", TEST_DELTAS)
def test_tier_boundaries_table_driven(workload, delta, expected_status, expected_code):
    limit = WBGT_LIMITS[workload]
    wbgt = round(limit + delta, 4)
    # If wbgt >= 35.0, spec says it overrides to AVOID HEAT_WBGT_OVER_35
    if wbgt >= 35.0:
        expected_status = HourStatus.AVOID
        expected_code = "HEAT_WBGT_OVER_35"

    status, reasons = get_base_heat_status(wbgt, limit)
    assert status == expected_status, f"Workload={workload.value}, Limit={limit}, WBGT={wbgt}, Delta={delta} -> Got status {status}, expected {expected_status}"
    assert expected_code in reasons, f"Workload={workload.value}, Limit={limit}, WBGT={wbgt}, Delta={delta} -> Got reasons {reasons}, expected {expected_code}"

@pytest.mark.parametrize("workload", [Workload.LIGHT, Workload.MODERATE, Workload.HEAVY])
def test_wbgt_35_boundary(workload):
    limit = WBGT_LIMITS[workload]
    
    # 34.99 WBGT
    wbgt_sub35 = 34.99
    delta = round(wbgt_sub35 - limit, 4)
    status_sub, reasons_sub = get_base_heat_status(wbgt_sub35, limit)
    if delta <= 6.0:
        assert status_sub == HourStatus.REDUCED
        assert "HEAT_WBGT_OVER_35" not in reasons_sub
    else:
        assert status_sub == HourStatus.AVOID
        assert "HEAT_WBGT_OVER_LIMIT" in reasons_sub

    # 35.00 WBGT
    status_35, reasons_35 = get_base_heat_status(35.0, limit)
    assert status_35 == HourStatus.AVOID
    assert "HEAT_WBGT_OVER_35" in reasons_35
