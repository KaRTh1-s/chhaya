"""Strict grounding and safety validator for Chhaya Advisory Agent."""
import json
import re
from dataclasses import dataclass
from typing import Any

from chhaya_backend.agent.facts import Facts

DEVANAGARI_DIGITS = str.maketrans("०१२३४५६७८९", "0123456789")
TAMIL_DIGITS = str.maketrans("௦௧௨௩௪௫௬௭௮௯", "0123456789")

MEDICAL_BLOCKLIST = {
    "en": [
        "cure", "diagnose", "prescription", "antibiotic", "medicine", "pill", 
        "tablet", "inject", "disease", "treatment", "therapy", "physician", "drug"
    ],
    "hi": [
        "उपचार", "दवा", "चिकित्सा", "गोली", "इंजेक्शन", "इलाज", "दवाई", "रोग निदान"
    ],
    "ta": [
        "மருந்து", "சிகிச்சை", "குணப்படுத்தும்", "மாத்திரை", "ஊசி", "மருத்துவ சிகிச்சை"
    ],
}

@dataclass(frozen=True)
class ValidationResult:
    is_valid: bool
    sentences: list[dict[str, Any]]
    error: str | None = None

def normalize_digits(text: str) -> str:
    return text.translate(DEVANAGARI_DIGITS).translate(TAMIL_DIGITS)

def extract_numbers_from_text(text: str) -> list[str]:
    normalized = normalize_digits(text)
    # Match numbers (integers or decimals) and time ranges (e.g. 13:00, 13-17)
    tokens = []
    for m in re.finditer(r"\b\d+(?:\.\d+)?(?::\d{2})?\b", normalized):
        tokens.append(m.group(0))
    return tokens

def is_valid_script(text: str, language: str) -> bool:
    if language == "en":
        # Check that there are Latin characters
        return bool(re.search(r"[a-zA-Z]", text))
    elif language == "hi":
        # Must contain Devanagari characters (\u0900-\u097F)
        devanagari_count = len(re.findall(r"[\u0900-\u097F]", text))
        return devanagari_count >= 5
    elif language == "ta":
        # Must contain Tamil characters (\u0B80-\u0BFF)
        tamil_count = len(re.findall(r"[\u0B80-\u0BFF]", text))
        return tamil_count >= 5
    return True

def validate_advisory_json(
    raw_response: str | dict[str, Any],
    facts: Facts,
    language: str = "en"
) -> ValidationResult:
    # 1. Parse JSON
    if isinstance(raw_response, dict):
        data = raw_response
    else:
        try:
            # Strip markdown code blocks if present
            cleaned = raw_response.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:]
            elif cleaned.startswith("```"):
                cleaned = cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            data = json.loads(cleaned.strip())
        except (json.JSONDecodeError, TypeError, ValueError) as e:
            return ValidationResult(False, [], f"Malformed JSON: {e}")

    if not isinstance(data, dict) or "sentences" not in data:
        return ValidationResult(False, [], "Missing 'sentences' key in root JSON object")

    raw_sentences = data.get("sentences")
    if not isinstance(raw_sentences, list):
        return ValidationResult(False, [], "'sentences' must be a JSON array")

    # 2. Count limit: 1-5 sentences
    num_sentences = len(raw_sentences)
    if not (1 <= num_sentences <= 5):
        return ValidationResult(False, [], f"Expected 1 to 5 sentences, got {num_sentences}")

    valid_evidence_ids = facts.get_evidence_ids()
    allowed_numbers = facts.allowed_numbers
    blocklist = MEDICAL_BLOCKLIST.get(language, [])

    validated_sentences = []
    total_length = 0

    for idx, s in enumerate(raw_sentences):
        if not isinstance(s, dict):
            return ValidationResult(False, [], f"Sentence {idx+1} is not a JSON object")

        text = str(s.get("text", "")).strip()
        ev_ids = s.get("evidence_ids")

        # 5. Length limits
        if not (5 <= len(text) <= 300):
            return ValidationResult(False, [], f"Sentence {idx+1} length ({len(text)}) outside limits [5, 300]")
        total_length += len(text)

        # 3. Evidence ID verification
        if not isinstance(ev_ids, list) or len(ev_ids) == 0:
            return ValidationResult(False, [], f"Sentence {idx+1} has no evidence_ids cited")

        for eid in ev_ids:
            if eid not in valid_evidence_ids:
                return ValidationResult(False, [], f"Sentence {idx+1} cited unknown evidence_id '{eid}'")

        # 4. Number grounding (No hallucinated numbers)
        extracted_nums = extract_numbers_from_text(text)
        for num in extracted_nums:
            # Check direct match or int match
            num_clean = num
            int_equiv = str(int(float(num))) if num.replace(".", "", 1).isdigit() else None
            
            is_allowed = (
                num_clean in allowed_numbers 
                or (int_equiv and int_equiv in allowed_numbers)
                or any(num_clean in an for an in allowed_numbers)
            )
            if not is_allowed:
                return ValidationResult(False, [], f"Sentence {idx+1} contains ungrounded number '{num}'")

        # 6. Script validation
        if not is_valid_script(text, language):
            return ValidationResult(False, [], f"Sentence {idx+1} is not written in the expected script for language '{language}'")

        # 7. Medical blocklist check
        lower_text = text.lower()
        for phrase in blocklist:
            if phrase.lower() in lower_text:
                return ValidationResult(False, [], f"Sentence {idx+1} contains prohibited medical claim phrase '{phrase}'")

        validated_sentences.append({
            "text": text,
            "evidence_ids": [str(x) for x in ev_ids],
        })

    if total_length > 1200:
        return ValidationResult(False, [], f"Total advisory text length ({total_length}) exceeds 1200 characters")

    return ValidationResult(True, validated_sentences, None)
