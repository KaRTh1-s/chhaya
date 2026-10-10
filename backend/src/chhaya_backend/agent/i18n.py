"""Internationalisation (i18n) module for Chhaya Advisory Agent.
Contains translations, city scripts, risk descriptors, and localized text for English, Hindi, and Tamil.
All non-English strings are machine-translated and flagged for native speaker review in docs/i18n_review.md.
"""
from typing import Any

# City name mappings in each native script
CITY_NAMES = {
    "delhi": {"en": "Delhi", "hi": "दिल्ली", "ta": "டெல்லி"},
    "mumbai": {"en": "Mumbai", "hi": "मुंबई", "ta": "மும்பை"},
    "chennai": {"en": "Chennai", "hi": "चेन्नई", "ta": "சென்னை"},
    "coimbatore": {"en": "Coimbatore", "hi": "कोयंबटूर", "ta": "கோயம்புத்தூர்"},
    "bengaluru": {"en": "Bengaluru", "hi": "बेंगलुरु", "ta": "பெங்களூரு"},
    "hyderabad": {"en": "Hyderabad", "hi": "हैदराबाद", "ta": "ஹைதராபாத்"},
    "kolkata": {"en": "Kolkata", "hi": "कोलकाता", "ta": "கொல்கத்தா"},
    "ahmedabad": {"en": "Ahmedabad", "hi": "अहमदाबाद", "ta": "அகமதாபாத்"},
    "pune": {"en": "Pune", "hi": "पुणे", "ta": "புனே"},
    "jaipur": {"en": "Jaipur", "hi": "जयपुर", "ta": "ஜெய்ப்பூர்"},
    "lucknow": {"en": "Lucknow", "hi": "लखनऊ", "ta": "லக்னோ"},
    "nagpur": {"en": "Nagpur", "hi": "नागपुर", "ta": "நாக்பூர்"},
}

# Plain-language risk levels
RISK_TERMS = {
    "LOW": {"en": "low", "hi": "कम", "ta": "குறைவு"},
    "MODERATE": {"en": "moderate", "hi": "मध्यम", "ta": "மிதமான"},
    "HIGH": {"en": "high", "hi": "अधिक", "ta": "அதிகம்"},
    "EXTREME": {"en": "extreme", "hi": "अत्यधिक", "ta": "மிகத் தீவிரம்"},
}

# Standard seek-help lines localized
SEEK_HELP_CATALOG = {
    "SEEK_HELP_HEAT_ILLNESS": {
        "en": "Stop work, move to shade, and call emergency services if you experience confusion, fainting, or stop sweating.",
        "hi": "यदि आपको चक्कर आए, बेहोशी महसूस हो या पसीना आना बंद हो जाए, तो काम तुरंत रोकें, छाया में जाएं और आपातकालीन सहायता लें।",
        "ta": "மயக்கம், குழப்பம் அல்லது வியர்வை வெளியேறாமல் இருப்பது போன்ற அறிகுறிகள் தோன்றினால், உடனடியாக வேலையை நிறுத்தி, நிழலுக்குச் சென்று அவசர உதவிக்கு அழைக்கவும்.",
    },
    "SEEK_HELP_AIR_RESPIRATORY": {
        "en": "Seek medical care immediately if you experience severe shortness of breath, chest tightness, or persistent coughing.",
        "hi": "यदि सांस लेने में गंभीर तकलीफ, सीने में जकड़न या लगातार खांसी हो, तो तुरंत चिकित्सा सहायता लें।",
        "ta": "கடுமையான மூச்சுத்திணறல், நெஞ்சு இறுக்கம் அல்லது தொடர் இருமல் ஏற்பட்டால் உடனடியாக மருத்துவ உதவியை நாடவும்.",
    },
}

# Allowed technical acronyms in non-Latin scripts
ALLOWED_LATIN_TOKENS = {
    "N95", "FFP2", "WBGT", "AQI", "ML", "C", "PM2.5", "PM10", "PM", "O3", "NO2", "SO2", "CO"
}

def get_city_name(city_id: str, lang: str = "en") -> str:
    lang_key = lang.lower() if lang in ("en", "hi", "ta") else "en"
    clean_id = city_id.lower().replace(" ", "").split("-")[0].split("(")[0].strip()
    if clean_id in CITY_NAMES:
        return CITY_NAMES[clean_id].get(lang_key, CITY_NAMES[clean_id]["en"])
    
    # Fallback to scanning city names
    for cid, names in CITY_NAMES.items():
        if cid in city_id.lower():
            return names.get(lang_key, names["en"])
    return city_id


def get_risk_term(risk_level: str, lang: str = "en") -> str:
    lang_key = lang.lower() if lang in ("en", "hi", "ta") else "en"
    risk_upper = str(risk_level).upper()
    return RISK_TERMS.get(risk_upper, {}).get(lang_key, str(risk_level).lower())


def get_seek_help_lines(codes: list[str] | None = None, lang: str = "en") -> list[str]:
    lang_key = lang.lower() if lang in ("en", "hi", "ta") else "en"
    if not codes:
        codes = ["SEEK_HELP_HEAT_ILLNESS"]
    
    lines = []
    for code in codes:
        if code in SEEK_HELP_CATALOG:
            lines.append(SEEK_HELP_CATALOG[code].get(lang_key, SEEK_HELP_CATALOG[code]["en"]))
        else:
            # If already a full sentence, try to match
            matched = False
            for k, cat in SEEK_HELP_CATALOG.items():
                if cat["en"].lower() in code.lower() or code.lower() in cat["en"].lower():
                    lines.append(cat.get(lang_key, cat["en"]))
                    matched = True
                    break
            if not matched:
                lines.append(code)
    return lines
