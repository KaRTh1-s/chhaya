import pytest
from chhaya_engine.cities import get_city, CITIES

def test_get_city():
    city = get_city("delhi")
    assert city is not None
    assert city.name == "Delhi"
    
    city2 = get_city("DELHI ")
    assert city2 is not None
    
    city3 = get_city("unknown")
    assert city3 is None
