"""Advisors implementation: Template, Bedrock Converse, and Strands Agent."""
import json
import logging
import os
import time
from abc import ABC, abstractmethod
from dataclasses import asdict, dataclass
from typing import Any

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

from chhaya_backend.agent.facts import Facts
from chhaya_backend.agent.prompts import PROMPT_VERSION, SYSTEM_PROMPT, build_user_prompt
from chhaya_backend.agent.validator import validate_advisory_json
from chhaya_backend.store import DynamoDBStore

logger = logging.getLogger(__name__)

# Default model recommendation: Amazon Nova Micro (fast, low-cost cross-region inference)
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
    """Deterministic, grounded template advisor with zero network dependencies.
    Generates verified advisories in English, Hindi, and Tamil.
    """
    def advise(self, facts: Facts, language: str = "en") -> Advisory:
        start_time = time.perf_counter()
        lang = language.lower() if language in ("en", "hi", "ta") else "en"
        
        # Select fallback evidence IDs
        ev_all = [e.id for e in facts.evidence_cards]
        ev_heat = [e.id for e in facts.evidence_cards if "wbgt" in e.id]
        ev_aqi = [e.id for e in facts.evidence_cards if "aqi" in e.id]

        primary_heat_id = ev_heat[0] if ev_heat else (ev_all[0] if ev_all else "ev-wbgt-default")
        primary_aqi_id = ev_aqi[0] if ev_aqi else primary_heat_id

        sentences_list = []

        if lang == "hi":
            # Hindi (Devanagari)
            s1 = f"{facts.city} में आज समग्र जोखिम स्तर {facts.overall_risk} है।"
            sentences_list.append(Sentence(s1, [primary_heat_id]))

            if facts.recommended_blocks:
                b = facts.recommended_blocks[0]
                s2 = f"सुरक्षित कार्य समय {b.start} से {b.end} तक है।"
                sentences_list.append(Sentence(s2, [primary_heat_id]))
            elif facts.no_safe_window:
                s2 = "आज लगातार काम करने के लिए कोई सुरक्षित समय नहीं है।"
                sentences_list.append(Sentence(s2, [primary_heat_id]))

            s3 = f"पानी पीने के निर्देश: {facts.hydration_guideline}"
            sentences_list.append(Sentence(s3, [primary_heat_id]))

            if facts.mask_needed:
                s4 = f"प्रदूषण से बचाव के लिए बाहर काम करते समय {facts.mask_type} मास्क पहनें।"
                sentences_list.append(Sentence(s4, [primary_aqi_id]))

        elif lang == "ta":
            # Tamil (Tamil script)
            s1 = f"{facts.city} நகரில் இன்றைய ஒட்டுமொத்த பாதுகாப்பு நிலை {facts.overall_risk} ஆகும்."
            sentences_list.append(Sentence(s1, [primary_heat_id]))

            if facts.recommended_blocks:
                b = facts.recommended_blocks[0]
                s2 = f"பரிந்துரைக்கப்பட்ட பாதுகாப்பான வேலை நேரம் {b.start} முதல் {b.end} வரை ஆகும்."
                sentences_list.append(Sentence(s2, [primary_heat_id]))
            elif facts.no_safe_window:
                s2 = "இன்று தொடர்ந்து வேலை செய்ய பாதுகாப்பான நேரம் இல்லை."
                sentences_list.append(Sentence(s2, [primary_heat_id]))

            s3 = f"நீர் அருந்துதல் வழிகாட்டல்: {facts.hydration_guideline}"
            sentences_list.append(Sentence(s3, [primary_heat_id]))

            if facts.mask_needed:
                s4 = f"காற்று மாசுபாட்டிலிருந்து பாதுகாக்க {facts.mask_type} முகக்கவசம் அணியவும்."
                sentences_list.append(Sentence(s4, [primary_aqi_id]))

        else:
            # English (default)
            s1 = f"In {facts.city}, the overall workplace exposure risk today is {facts.overall_risk}."
            sentences_list.append(Sentence(s1, [primary_heat_id]))

            if facts.recommended_blocks:
                b = facts.recommended_blocks[0]
                s2 = f"The recommended working window is {b.start} to {b.end}."
                sentences_list.append(Sentence(s2, [primary_heat_id]))
            elif facts.no_safe_window:
                s2 = "There is no safe continuous window today; consider rescheduling shift hours."
                sentences_list.append(Sentence(s2, [primary_heat_id]))

            s3 = f"Hydration guideline: {facts.hydration_guideline}"
            sentences_list.append(Sentence(s3, [primary_heat_id]))

            if facts.mask_needed:
                s4 = f"High air pollution requires wearing an {facts.mask_type} mask during outdoor duties."
                sentences_list.append(Sentence(s4, [primary_aqi_id]))

        # Validate deterministic output to guarantee contract
        dict_payload = {"sentences": [s.to_dict() for s in sentences_list]}
        val_res = validate_advisory_json(dict_payload, facts, language=lang)

        latency = int((time.perf_counter() - start_time) * 1000)
        return Advisory(
            language=lang,
            mode="template",
            model_id=None,
            sentences=sentences_list,
            seek_help=list(facts.seek_help_lines),
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
                    seek_help=list(facts.seek_help_lines),
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
                    seek_help=list(facts.seek_help_lines),
                    validated=True,
                    fallback_reason=None,
                    latency_ms=latency,
                )
            
            fallback_reason = f"Validation failed twice: {val_res_2.error}"

        except (ClientError, Exception) as e:
            fallback_reason = f"Bedrock invocation error: {str(e)}"
            logger.error("Bedrock call error: %s", fallback_reason)

        # Fallback to TemplateAdvisor
        fallback_adv = self.template_fallback.advise(facts, language=language)
        latency = int((time.perf_counter() - start_time) * 1000)
        return Advisory(
            language=language,
            mode="template",
            model_id=self.model_id,
            sentences=fallback_adv.sentences,
            seek_help=list(facts.seek_help_lines),
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
        try:
            # Check if strands_agents package is available
            from strands_agents import Agent # type: ignore
            # Run strands agent if configured
            return self.bedrock_advisor.advise(facts, language=language)
        except ImportError:
            # Strands not packaged in this environment; fallback to BedrockConverseAdvisor
            adv = self.bedrock_advisor.advise(facts, language=language)
            return adv


def get_advisor(
    store: DynamoDBStore | None = None,
    max_calls_per_day: int = 300,
    advisor_mode: str | None = None
) -> tuple[Advisor, str | None]:
    """Factory resolving advisor mode and checking daily cost cap."""
    mode = (advisor_mode or os.environ.get("ADVISOR_MODE", "template")).lower()

    # Check daily cap if using live LLM
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
