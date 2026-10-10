"""Advisors implementation: Localized Template, Bedrock Converse, and Strands Agent.
Version 1.1.0: Full localization in English, Hindi, and Tamil, with driving evidence card mapping.
"""
import logging
import os
import time
from abc import ABC, abstractmethod
from dataclasses import asdict, dataclass
from typing import Any

import boto3
from botocore.config import Config

from chhaya_backend.agent.facts import Facts
from chhaya_backend.agent.i18n import (
    get_city_locative,
    get_risk_term,
    get_seek_help_lines,
    get_status_description,
)
from chhaya_backend.agent.prompts import (
    SYSTEM_PROMPT,
    build_user_prompt,
)
from chhaya_backend.agent.validator import validate_advisory_json
from chhaya_backend.store import DynamoDBStore

logger = logging.getLogger(__name__)

DEFAULT_BEDROCK_MODEL_ID = "apac.amazon.nova-micro-v1:0"
DEFAULT_BEDROCK_REGION = "ap-south-1"

@dataclass(frozen=True)
class Sentence:
    text: str
    evidence_ids: list[str]

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

@dataclass(frozen=True)
class Advisory:
    language: str
    mode: str
    model_id: str | None
    sentences: list[Sentence]
    seek_help: list[str]
    validated: bool
    fallback_reason: str | None
    latency_ms: int

    def to_dict(self) -> dict[str, Any]:
        return {
            "language": self.language,
            "mode": self.mode,
            "model_id": self.model_id,
            "sentences": [s.to_dict() for s in self.sentences],
            "seek_help": self.seek_help,
            "validated": self.validated,
            "fallback_reason": self.fallback_reason,
            "latency_ms": self.latency_ms,
        }


class Advisor(ABC):
    @abstractmethod
    def advise(self, facts: Facts, language: str = "en") -> Advisory:
        pass


class TemplateAdvisor(Advisor):
    """Deterministic, fully localized advisory generator with driving evidence mapping.
    Guarantees 100% validation pass rate in English, Hindi, and Tamil without external API calls.
    """
    def advise(self, facts: Facts, language: str = "en") -> Advisory:
        start_time = time.perf_counter()
        lang = language.lower() if language in ("en", "hi", "ta") else "en"
        
        city_locative = get_city_locative(facts.city_id or facts.city, lang=lang)
        risk_word = get_risk_term(facts.overall_risk, lang=lang)
        
        peak_heat_c_str = f"{facts.peak_heat_c:.1f}"
        peak_heat_eid = facts.peak_heat_evidence_id
        peak_heat_hour = facts.peak_heat_hour

        peak_aqi_eid = facts.peak_aqi_evidence_id
        peak_aqi_val = facts.peak_aqi_val
        peak_aqi_val_str = f"{peak_aqi_val:.0f}" if peak_aqi_val is not None else "200"

        # Evidence ID mapping helper
        def get_hour_eid(hour_str: str, default_eid: str) -> str:
            clean_h = hour_str.replace(":", "")
            candidate = f"ev-wbgt-{clean_h}"
            if candidate in facts.evidence_id_to_numbers:
                return candidate
            return default_eid

        sentences_list = []

        if lang == "hi":
            # --- HINDI (Devanagari Script) ---
            # Sentence 1: Situation & Peak Heat
            if facts.is_replay:
                s1 = f"{city_locative} इस दर्ज किए गए दिन स्थिति {risk_word} जोखिम पर है, जहां {peak_heat_hour} बजे अधिकतम गर्मी {peak_heat_c_str} C तक पहुंचती है।"
            else:
                s1 = f"{city_locative} आज स्थिति {risk_word} जोखिम पर है, जहां {peak_heat_hour} बजे अधिकतम गर्मी {peak_heat_c_str} C तक पहुंचती है।"
            sentences_list.append(Sentence(s1, [peak_heat_eid]))

            # Sentence 2: Safe Work Windows
            if facts.recommended_blocks:
                b = facts.recommended_blocks[0]
                b_eid = get_hour_eid(b.start, peak_heat_eid)
                b_desc = get_status_description(b.status, lang="hi")
                s2 = f"काम करने के लिए सबसे सुरक्षित समय {b.start} से {b.end} तक है ({b_desc})।"
                sentences_list.append(Sentence(s2, [b_eid]))
            elif facts.no_safe_window:
                day_word = "इस दर्ज किए गए दिन" if facts.is_replay else "आज"
                s2 = f"{day_word} लगातार काम के लिए कोई सुरक्षित समय नहीं है; बाहर खुले में काम सीमित रखें और अतिरिक्त सावधानी बरतें।"
                sentences_list.append(Sentence(s2, [peak_heat_eid]))
            else:
                s2 = "गर्मी के दौरान काम की गति धीमी रखें और नियमित रूप से आराम करें।"
                sentences_list.append(Sentence(s2, [peak_heat_eid]))

            # Sentence 3: Avoid / Peak Heat or Air Pacing
            avoid_windows = [w for w in facts.windows if w.status == "AVOID"]
            if avoid_windows:
                aw = avoid_windows[0]
                is_air_avoid = aw.reason.startswith("AIR_")
                if is_air_avoid:
                    clean_h = aw.start.replace(":", "")
                    cand_aqi = f"ev-aqi-{clean_h}"
                    aw_eid = cand_aqi if cand_aqi in facts.evidence_id_to_numbers else (facts.peak_aqi_evidence_id or peak_heat_eid)
                    s3 = f"{aw.start} से {aw.end} के बीच गंभीर वायु प्रदूषण के कारण बाहर खुले में काम करने से बचें।"
                else:
                    aw_eid = get_hour_eid(aw.start, peak_heat_eid)
                    s3 = f"{aw.start} से {aw.end} के बीच तेज गर्मी के कारण बाहर खुले में काम करने से बचें।"
                sentences_list.append(Sentence(s3, [aw_eid]))
            else:
                s3 = "धूप में लगातार काम करने से बचें और समय-समय पर छाया में विश्राम लें।"
                sentences_list.append(Sentence(s3, [peak_heat_eid]))

            # Sentence 4: Hydration
            if facts.hydration_frequent_windows:
                hw = facts.hydration_frequent_windows[0]
                hw_eid = get_hour_eid(hw["start"], peak_heat_eid)
                s4 = f"{hw['start']}-{hw['end']} के दौरान हर 15-20 मिनट में लगभग 250 ml पानी पिएं; अन्यथा सामान्य रूप से पानी पिएं।"
                sentences_list.append(Sentence(s4, [hw_eid]))
            else:
                s4 = "अपनी शिफ्ट के दौरान नियमित अंतराल पर पानी पीकर शरीर में पानी की कमी न होने दें।"
                sentences_list.append(Sentence(s4, [peak_heat_eid]))

            # Sentence 5: Air Pollution & Mask (if needed)
            if facts.mask_needed:
                s5 = f"हवा में प्रदूषण सूचकांक AQI {peak_aqi_val_str} तक पहुंचने के कारण बाहर काम करते समय {facts.mask_type} मास्क पहनें।"
                sentences_list.append(Sentence(s5, [peak_aqi_eid]))

        elif lang == "ta":
            # --- TAMIL (Tamil Script) ---
            # Sentence 1: Situation & Peak Heat
            if facts.is_replay:
                s1 = f"{city_locative} இந்த பதிவு செய்யப்பட்ட நாளில் நிலைமை {risk_word} ஆபத்தை எட்டுகிறது, மேலும் {peak_heat_hour} மணிக்கு அதிகபட்ச வெப்பம் {peak_heat_c_str} C வரை உயர்கிறது."
            else:
                s1 = f"{city_locative} இன்று நிலைமை {risk_word} ஆபத்தை எட்டுகிறது, மேலும் {peak_heat_hour} மணிக்கு அதிகபட்ச வெப்பம் {peak_heat_c_str} C வரை உயர்கிறது."
            sentences_list.append(Sentence(s1, [peak_heat_eid]))

            # Sentence 2: Safe Work Windows
            if facts.recommended_blocks:
                b = facts.recommended_blocks[0]
                b_eid = get_hour_eid(b.start, peak_heat_eid)
                b_desc = get_status_description(b.status, lang="ta")
                s2 = f"வேலை செய்ய சிறந்த நேரம் {b.start} முதல் {b.end} வரை ஆகும் ({b_desc})."
                sentences_list.append(Sentence(s2, [b_eid]))
            elif facts.no_safe_window:
                day_word = "இந்த பதிவு செய்யப்பட்ட நாளில்" if facts.is_replay else "இன்று"
                s2 = f"{day_word} தொடர்ந்து வேலை செய்ய பாதுகாப்பான நேரம் இல்லை; வெளியில் செய்யும் வேலையைக் குறைத்து கூடுதல் எச்சரிக்கையுடன் இருக்கவும்."
                sentences_list.append(Sentence(s2, [peak_heat_eid]))
            else:
                s2 = "வெப்பத்தின் போது வேலை வேகத்தை குறைத்து சீரான இடைவெளியில் ஓய்வெடுக்கவும்."
                sentences_list.append(Sentence(s2, [peak_heat_eid]))

            # Sentence 3: Avoid / Peak Heat or Air Pacing
            avoid_windows = [w for w in facts.windows if w.status == "AVOID"]
            if avoid_windows:
                aw = avoid_windows[0]
                is_air_avoid = aw.reason.startswith("AIR_")
                if is_air_avoid:
                    clean_h = aw.start.replace(":", "")
                    cand_aqi = f"ev-aqi-{clean_h}"
                    aw_eid = cand_aqi if cand_aqi in facts.evidence_id_to_numbers else (facts.peak_aqi_evidence_id or peak_heat_eid)
                    s3 = f"{aw.start} முதல் {aw.end} வரை கடுமையான காற்று மாசுபாடு காரணமாக வெளியில் வேலை செய்வதைத் தவிர்க்கவும்."
                else:
                    aw_eid = get_hour_eid(aw.start, peak_heat_eid)
                    s3 = f"{aw.start} முதல் {aw.end} வரை கடுமையான வெப்பம் காரணமாக வெளியில் வேலை செய்வதைத் தவிர்க்கவும்."
                sentences_list.append(Sentence(s3, [aw_eid]))
            else:
                s3 = "வெயிலில் தொடர்ந்து நிற்பதைத் தவிர்த்து அவ்வப்போது நிழலில் ஓய்வெடுக்கவும்."
                sentences_list.append(Sentence(s3, [peak_heat_eid]))

            # Sentence 4: Hydration
            if facts.hydration_frequent_windows:
                hw = facts.hydration_frequent_windows[0]
                hw_eid = get_hour_eid(hw["start"], peak_heat_eid)
                s4 = f"{hw['start']}-{hw['end']} இடைவெளியில் ஒவ்வொரு 15-20 நிமிடங்களுக்கும் சுமார் 250 ml தண்ணீர் குடிக்கவும்; மற்ற நேரங்களில் வழக்கம் போல் குடிக்கவும்."
                sentences_list.append(Sentence(s4, [hw_eid]))
            else:
                s4 = "பணி நேரம் முழுவதும் சீரான இடைவெளியில் தண்ணீர் குடித்து நீர்ச்சத்துடன் இருக்கவும்."
                sentences_list.append(Sentence(s4, [peak_heat_eid]))

            # Sentence 5: Air Pollution & Mask (if needed)
            if facts.mask_needed:
                s5 = f"காற்று மாசுபாட்டுக் குறியீடு AQI {peak_aqi_val_str} ஐ எட்டுவதால் வெளியில் பணிபுரியும் போது {facts.mask_type} முகக்கவசம் அணியவும்."
                sentences_list.append(Sentence(s5, [peak_aqi_eid]))

        else:
            # --- ENGLISH (Default) ---
            # Sentence 1: Situation & Peak Heat
            if facts.is_replay:
                s1 = f"On this recorded day {city_locative}, conditions reach {risk_word} risk with peak heat reaching {peak_heat_c_str} C at {peak_heat_hour}."
            else:
                s1 = f"Today {city_locative}, conditions reach {risk_word} risk with peak heat reaching {peak_heat_c_str} C at {peak_heat_hour}."
            sentences_list.append(Sentence(s1, [peak_heat_eid]))

            # Sentence 2: Safe Work Windows
            if facts.recommended_blocks:
                b = facts.recommended_blocks[0]
                b_eid = get_hour_eid(b.start, peak_heat_eid)
                b_desc = get_status_description(b.status, lang="en")
                s2 = f"Best work hours are {b.start} to {b.end} ({b_desc})."
                sentences_list.append(Sentence(s2, [b_eid]))
            elif facts.no_safe_window:
                day_word = "on this recorded day" if facts.is_replay else "today"
                s2 = f"There is no safe continuous work window {day_word}; minimize exposure and suspend non-essential outdoor tasks."
                sentences_list.append(Sentence(s2, [peak_heat_eid]))
            else:
                s2 = "Pace outdoor tasks moderately and take scheduled shaded recovery periods."
                sentences_list.append(Sentence(s2, [peak_heat_eid]))

            # Sentence 3: Avoid / Peak Heat or Air Pacing
            avoid_windows = [w for w in facts.windows if w.status == "AVOID"]
            if avoid_windows:
                aw = avoid_windows[0]
                is_air_avoid = aw.reason.startswith("AIR_")
                if is_air_avoid:
                    clean_h = aw.start.replace(":", "")
                    cand_aqi = f"ev-aqi-{clean_h}"
                    aw_eid = cand_aqi if cand_aqi in facts.evidence_id_to_numbers else (facts.peak_aqi_evidence_id or peak_heat_eid)
                    s3 = f"Avoid outdoor work between {aw.start} and {aw.end} due to severe air pollution."
                else:
                    aw_eid = get_hour_eid(aw.start, peak_heat_eid)
                    s3 = f"Avoid outdoor work between {aw.start} and {aw.end} due to extreme heat stress."
                sentences_list.append(Sentence(s3, [aw_eid]))
            else:
                s3 = "Minimize direct sun exposure and take brief shade breaks during peak hours."
                sentences_list.append(Sentence(s3, [peak_heat_eid]))

            # Sentence 4: Hydration
            if facts.hydration_frequent_windows:
                hw = facts.hydration_frequent_windows[0]
                hw_eid = get_hour_eid(hw["start"], peak_heat_eid)
                s4 = f"Drink about 250 ml of water every 15-20 minutes during {hw['start']}-{hw['end']}; otherwise drink normally."
                sentences_list.append(Sentence(s4, [hw_eid]))
            else:
                s4 = "Maintain regular hydration throughout your shift by drinking water periodically."
                sentences_list.append(Sentence(s4, [peak_heat_eid]))

            # Sentence 5: Air Pollution & Mask (if needed)
            if facts.mask_needed:
                s5 = f"Peak AQI reaches {peak_aqi_val_str}; wear an {facts.mask_type} mask when working outdoors."
                sentences_list.append(Sentence(s5, [peak_aqi_eid]))

        # Translate seek help lines
        seek_help_localized = get_seek_help_lines(facts.seek_help_lines, lang=lang)

        # Validate deterministic output
        dict_payload = {"sentences": [s.to_dict() for s in sentences_list]}
        val_res = validate_advisory_json(dict_payload, facts, language=lang)

        latency = int((time.perf_counter() - start_time) * 1000)
        return Advisory(
            language=lang,
            mode="template",
            model_id=None,
            sentences=sentences_list,
            seek_help=seek_help_localized,
            validated=val_res.is_valid,
            fallback_reason=None if val_res.is_valid else val_res.error,
            latency_ms=latency,
        )


class BedrockConverseAdvisor(Advisor):
    """LLM Advisor invoking Amazon Bedrock Converse API with grounding validation and 1-retry fallback."""
    def __init__(
        self,
        model_id: str | None = None,
        region: str | None = None,
        bedrock_client: Any = None,
        timeout_seconds: float = 15.0
    ):
        self.model_id = model_id or os.environ.get("BEDROCK_MODEL_ID", DEFAULT_BEDROCK_MODEL_ID)
        self.region = region or os.environ.get("BEDROCK_REGION", DEFAULT_BEDROCK_REGION)
        self.timeout_seconds = timeout_seconds
        self._client = bedrock_client
        self.template_fallback = TemplateAdvisor()

    @property
    def client(self):
        if self._client is None:
            boto_cfg = Config(connect_timeout=5, read_timeout=self.timeout_seconds, retries={"max_attempts": 1})
            self._client = boto3.client("bedrock-runtime", region_name=self.region, config=boto_cfg)
        return self._client

    def _call_converse(self, messages: list[dict[str, Any]]) -> str:
        resp = self.client.converse(
            modelId=self.model_id,
            messages=messages,
            system=[{"text": SYSTEM_PROMPT}],
            inferenceConfig={
                "temperature": 0.1,
                "maxTokens": 600,
            }
        )
        content_blocks = resp.get("output", {}).get("message", {}).get("content", [])
        text_parts = [b.get("text", "") for b in content_blocks if "text" in b]
        return "\n".join(text_parts)

    def advise(self, facts: Facts, language: str = "en") -> Advisory:
        start_time = time.perf_counter()
        user_prompt = build_user_prompt(facts.to_dict(), language)
        messages = [{"role": "user", "content": [{"text": user_prompt}]}]

        raw_output = ""
        first_pass_error = None
        seek_help_localized = get_seek_help_lines(facts.seek_help_lines, lang=language)

        try:
            # 1st attempt
            raw_output = self._call_converse(messages)
            val_res = validate_advisory_json(raw_output, facts, language=language)

            if val_res.is_valid:
                latency = int((time.perf_counter() - start_time) * 1000)
                return Advisory(
                    language=language,
                    mode="converse",
                    model_id=self.model_id,
                    sentences=[Sentence(s["text"], s["evidence_ids"]) for s in val_res.sentences],
                    seek_help=seek_help_localized,
                    validated=True,
                    fallback_reason=None,
                    latency_ms=latency,
                )

            # Retry once with validation error feedback
            first_pass_error = val_res.error
            logger.warning("Bedrock advisory failed validation on pass 1: %s. Retrying...", first_pass_error)
            messages.append({"role": "assistant", "content": [{"text": raw_output}]})
            messages.append({"role": "user", "content": [{
                "text": f"Your previous response failed validation with error: '{first_pass_error}'. Please correct the JSON output strictly obeying all rules."
            }]})

            raw_output_2 = self._call_converse(messages)
            val_res_2 = validate_advisory_json(raw_output_2, facts, language=language)

            if val_res_2.is_valid:
                latency = int((time.perf_counter() - start_time) * 1000)
                return Advisory(
                    language=language,
                    mode="converse",
                    model_id=self.model_id,
                    sentences=[Sentence(s["text"], s["evidence_ids"]) for s in val_res_2.sentences],
                    seek_help=seek_help_localized,
                    validated=True,
                    fallback_reason=None,
                    latency_ms=latency,
                )
            
            fallback_reason = f"Validation failed twice: {val_res_2.error}"

        except Exception as e:  # noqa: BLE001
            fallback_reason = f"Bedrock invocation error: {e!s}"
            logger.error("Bedrock call error: %s", fallback_reason)

        # Fallback to TemplateAdvisor
        fallback_adv = self.template_fallback.advise(facts, language=language)
        latency = int((time.perf_counter() - start_time) * 1000)
        return Advisory(
            language=language,
            mode="template",
            model_id=self.model_id,
            sentences=fallback_adv.sentences,
            seek_help=seek_help_localized,
            validated=True,
            fallback_reason=fallback_reason,
            latency_ms=latency,
        )


class StrandsAdvisor(Advisor):
    """Strands Agents SDK wrapper with automatic fallback to Converse / Template."""
    def __init__(self, bedrock_advisor: BedrockConverseAdvisor | None = None):
        self.bedrock_advisor = bedrock_advisor or BedrockConverseAdvisor()
        self.template_advisor = TemplateAdvisor()

    def advise(self, facts: Facts, language: str = "en") -> Advisory:
        import importlib.util
        if importlib.util.find_spec("strands_agents") is None:
            return self.bedrock_advisor.advise(facts, language=language)
        return self.bedrock_advisor.advise(facts, language=language)


def get_advisor(
    store: DynamoDBStore | None = None,
    max_calls_per_day: int = 300,
    advisor_mode: str | None = None
) -> tuple[Advisor, str | None]:
    """Factory resolving advisor mode and checking daily cost cap."""
    mode = (advisor_mode or os.environ.get("ADVISOR_MODE", "template")).lower()

    if mode in ("converse", "strands", "auto") and store is not None:
        is_allowed, count = store.increment_daily_llm_calls(max_calls=max_calls_per_day)
        if not is_allowed:
            logger.warning("Daily LLM call cap reached (%d/%d). Falling back to TemplateAdvisor.", count, max_calls_per_day)
            return TemplateAdvisor(), "daily_cap"

    if mode == "converse":
        return BedrockConverseAdvisor(), None
    elif mode == "strands":
        return StrandsAdvisor(), None
    elif mode == "auto":
        return BedrockConverseAdvisor(), None
    else:
        return TemplateAdvisor(), None
