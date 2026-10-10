"""Internationalisation (i18n) module for Chhaya Advisory Agent.
Contains translations, city scripts, locative grammar, risk descriptors, and localized text for English, Hindi, and Tamil.
All non-English strings are marked for native speaker review in docs/i18n_review.md.
"""
import re

# City name nominative forms in each native script
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

# Proper locative grammatical forms ("in <City>") in each script
CITY_LOCATIVES = {
    "delhi": {"en": "in Delhi", "hi": "दिल्ली में", "ta": "டெல்லியில்"},
    "mumbai": {"en": "in Mumbai", "hi": "मुंबई में", "ta": "மும்பையில்"},
    "chennai": {"en": "in Chennai", "hi": "चेन्नई में", "ta": "சென்னையில்"},
    "coimbatore": {"en": "in Coimbatore", "hi": "कोयंबटूर में", "ta": "கோயம்புத்தூரில்"},
    "bengaluru": {"en": "in Bengaluru", "hi": "बेंगलुरु में", "ta": "பெங்களூருவில்"},
    "hyderabad": {"en": "in Hyderabad", "hi": "हैदराबाद में", "ta": "ஹைதராபாத்தில்"},
    "kolkata": {"en": "in Kolkata", "hi": "कोलकाता में", "ta": "கொல்கத்தாவில்"},
    "ahmedabad": {"en": "in Ahmedabad", "hi": "अहमदाबाद में", "ta": "அகமதாபாத்தில்"},
    "pune": {"en": "in Pune", "hi": "पुणे में", "ta": "புனேவில்"},
    "jaipur": {"en": "in Jaipur", "hi": "जयपुर में", "ta": "ஜெய்ப்பூரில்"},
    "lucknow": {"en": "in Lucknow", "hi": "लखनऊ में", "ta": "லக்னோவில்"},
    "nagpur": {"en": "in Nagpur", "hi": "नागपुर में", "ta": "நாக்பூரில்"},
}

# Plain-language risk levels
RISK_TERMS = {
    "LOW": {"en": "low", "hi": "कम", "ta": "குறைவு"},
    "MODERATE": {"en": "moderate", "hi": "मध्यम", "ta": "மிதமான"},
    "HIGH": {"en": "high", "hi": "high", "ta": "அதிகம்"},
    "EXTREME": {"en": "extreme", "hi": "अत्यधिक", "ta": "மிகத் தீவிரம்"},
}

# Plain-language descriptions for work/rest schedules (no raw enums)
STATUS_DESCRIPTIONS = {
    "REDUCED_45_15": {
        "en": "about 45 minutes work, 15 minutes rest per hour",
        "hi": "प्रति घंटे लगभग 45 मिनट काम और 15 मिनट आराम",
        "ta": "ஒரு மணி நேரத்திற்கு சுமார் 45 நிமிடங்கள் வேலை மற்றும் 15 நிமிடங்கள் ஓய்வு",
    },
    "REDUCED_30_30": {
        "en": "about 30 minutes work, 30 minutes rest per hour",
        "hi": "प्रति घंटे लगभग 30 मिनट काम और 30 मिनट आराम",
        "ta": "ஒரு மணி நேரத்திற்கு சுமார் 30 நிமிடங்கள் வேலை மற்றும் 30 நிமிடங்கள் ஓய்வு",
    },
    "REDUCED_15_45": {
        "en": "short work spells: about 15 minutes work, 45 minutes rest per hour",
        "hi": "प्रति घंटे लगभग 15 मिनट काम और 45 मिनट आराम",
        "ta": "குறுகிய கால வேலை: சுமார் 15 நிமிடங்கள் வேலை மற்றும் 45 நிமிடங்கள் ஓய்வு",
    },
    "REDUCED": {
        "en": "reduced workload with frequent rest breaks",
        "hi": "कम काम और बार-बार आराम के साथ काम करें",
        "ta": "குறைக்கப்பட்ட வேலை மற்றும் சீரான ஓய்வு",
    },
    "AVOID": {
        "en": "avoid outdoor work",
        "hi": "बाहर खुले में काम करने से बचें",
        "ta": "வெளியில் வேலை செய்வதைத் தவிர்க்கவும்",
    },
    "CAUTION": {
        "en": "work with regular shade breaks",
        "hi": "नियमित रूप से छाया में विश्राम के साथ काम करें",
        "ta": "முறையான நிழல் இடைவேளையுடன் வேலை செய்யவும்",
    },
    "WORK": {
        "en": "work normally, drink water",
        "hi": "सामान्य रूप से काम करें और पानी पीते रहें",
        "ta": "வழக்கம் போல் வேலை செய்யவும் மற்றும் தண்ணீர் குடிக்கவும்",
    },
}

# Standard seek-help lines localized without raw code prefixes
SEEK_HELP_CATALOG = {
    "SEEK_HELP_HEAT_ILLNESS": {
        "en": "Stop work immediately, move to shade, and seek medical care if you experience dizziness, confusion, stop sweating, or vomiting.",
        "hi": "चक्कर आने, भ्रम होने, पसीना रुकने या उल्टी होने पर तुरंत काम रोकें, छाया में जाएं और चिकित्सा सहायता लें।",
        "ta": "தலைச்சுற்றல், குழப்பம், வியர்வை நிற்பது அல்லது வாந்தி ஏற்பட்டால் உடனடியாக வேலையை நிறுத்தி, நிழலில் ஒதுங்கி மருத்துவ உதவி பெறவும்.",
    },
    "SEEK_HELP_AIR_RESPIRATORY": {
        "en": "Seek medical attention or clean indoor air immediately if you experience shortness of breath, severe coughing, or chest tightness.",
        "hi": "सांस लेने में तकलीफ, गंभीर खांसी या सीने में जकड़न होने पर तुरंत चिकित्सा सहायता लें या स्वच्छ हवा वाले कमरे में जाएं।",
        "ta": "மூச்சுத்திணறல், கடுமையான இருமல் அல்லது நெஞ்சு இறுக்கம் ஏற்பட்டால் உடனடியாக மருத்துவ உதவி பெறவும்.",
    },
    "SEEK_HELP_AIR_POLLUTION": {
        "en": "Seek medical attention or clean indoor air immediately if you experience shortness of breath, severe coughing, or chest tightness.",
        "hi": "सांस लेने में तकलीफ, गंभीर खांसी या सीने में जकड़न होने पर तुरंत चिकित्सा सहायता लें या स्वच्छ हवा वाले कमरे में जाएं।",
        "ta": "மூச்சுத்திணறல், கடுமையான இருமல் அல்லது நெஞ்சு இறுக்கம் ஏற்பட்டால் உடனடியாக மருத்துவ உதவி பெறவும்.",
    },
}

# Allowed technical acronyms in non-Latin scripts
ALLOWED_LATIN_TOKENS = {
    "N95", "FFP2", "WBGT", "AQI", "ML", "C", "PM2.5", "PM10", "PM", "O3", "NO2", "SO2", "CO"
}

def clean_city_id(city_id: str) -> str:
    return city_id.lower().replace(" ", "").split("-")[0].split("(")[0].strip()

def get_city_name(city_id: str, lang: str = "en") -> str:
    lang_key = lang.lower() if lang in ("en", "hi", "ta") else "en"
    cid = clean_city_id(city_id)
    if cid in CITY_NAMES:
        return CITY_NAMES[cid].get(lang_key, CITY_NAMES[cid]["en"])
    
    for k, names in CITY_NAMES.items():
        if k in city_id.lower():
            return names.get(lang_key, names["en"])
    return city_id

def get_city_locative(city_id: str, lang: str = "en") -> str:
    lang_key = lang.lower() if lang in ("en", "hi", "ta") else "en"
    cid = clean_city_id(city_id)
    if cid in CITY_LOCATIVES:
        return CITY_LOCATIVES[cid].get(lang_key, CITY_LOCATIVES[cid]["en"])
    
    for k, locs in CITY_LOCATIVES.items():
        if k in city_id.lower():
            return locs.get(lang_key, locs["en"])
    
    # Fallback
    cname = get_city_name(city_id, lang=lang)
    if lang_key == "hi":
        return f"{cname} में"
    elif lang_key == "ta":
        return f"{cname} நகரில்"
    return f"in {cname}"

def get_risk_term(risk_level: str, lang: str = "en") -> str:
    lang_key = lang.lower() if lang in ("en", "hi", "ta") else "en"
    risk_upper = str(risk_level).upper()
    return RISK_TERMS.get(risk_upper, {}).get(lang_key, str(risk_level).lower())

def get_status_description(status: str, lang: str = "en") -> str:
    lang_key = lang.lower() if lang in ("en", "hi", "ta") else "en"
    st_upper = str(status).upper()
    if st_upper in STATUS_DESCRIPTIONS:
        return STATUS_DESCRIPTIONS[st_upper].get(lang_key, STATUS_DESCRIPTIONS[st_upper]["en"])
    for k, desc in STATUS_DESCRIPTIONS.items():
        if k in st_upper:
            return desc.get(lang_key, desc["en"])
    return status.lower()

def strip_code_prefix(text: str) -> str:
    """Strip code prefixes like 'SEEK_HELP_HEAT_ILLNESS: ' from strings."""
    if not text:
        return ""
    # Strip any uppercase code followed by colon
    cleaned = re.sub(r"^[A-Z0-9_]+:\s*", "", str(text).strip())
    return cleaned

def get_seek_help_lines(codes: list[str] | None = None, lang: str = "en") -> list[str]:
    lang_key = lang.lower() if lang in ("en", "hi", "ta") else "en"
    if not codes:
        codes = ["SEEK_HELP_HEAT_ILLNESS"]
    
    lines = []
    for code_raw in codes:
        code = str(code_raw).strip()
        # Check direct code match
        code_key = code.split(":")[0].strip()
        if code_key in SEEK_HELP_CATALOG:
            lines.append(SEEK_HELP_CATALOG[code_key].get(lang_key, SEEK_HELP_CATALOG[code_key]["en"]))
        elif code in SEEK_HELP_CATALOG:
            lines.append(SEEK_HELP_CATALOG[code].get(lang_key, SEEK_HELP_CATALOG[code]["en"]))
        else:
            # Check substring match against catalog values
            matched = False
            for cat in SEEK_HELP_CATALOG.values():
                if cat["en"].lower() in code.lower() or code.lower() in cat["en"].lower():
                    lines.append(cat.get(lang_key, cat["en"]))
                    matched = True
                    break
            if not matched:
                lines.append(strip_code_prefix(code))
    return lines
