# Architecture

## Overview
Chhaya is designed as a serverless, decoupled microservice built on AWS Lambda, API Gateway HTTP API v2, Amazon DynamoDB, and Amazon Bedrock Converse API, with zero external runtime dependencies beyond the Python 3.11 standard library, `boto3`, and the pure-Python `chhaya_engine`.

## Split Lambda Architecture

To maintain fast cold starts for core planning calculations while isolating generative AI worker guidance dependencies, the backend is split into two specialized Lambda functions:

1. **`ApiFunction` (Core Engine & Data Plane)**:
   - Zero 3rd-party runtime dependencies (Python 3.11 stdlib + `boto3` + `chhaya_engine`).
   - Handles `/health`, `/cities`, `/scenarios`, `/plan`, `/board`, `/stats`, `/audit`, `/crews`.
   - Memory: 512 MB, Timeout: 30s.


2. **`AdvisorFunction` (Generative AI & Plain-Language Copilot)**:
   - Dedicated handler for `POST /advise`.
   - Connects to Amazon Bedrock Converse API with prompt versioning and grounding validation.
   - Enforces fallback to deterministic `TemplateAdvisor` on validation failure, timeout, or rate-limit.
   - Memory: 1024 MB, Timeout: 30s.

## Advisory Generation Pipeline

```mermaid
flowchart TD
    Client["Client (Web / Mobile / WhatsApp)"] -->|POST /advise (JSON, lang=en/hi/ta)| APIGW["API Gateway HTTP API v2"]
    APIGW --> AdvLambda["Advisor Lambda (advisor.handler)"]
    
    AdvLambda --> PlanSvc["PlanService (chhaya_engine)"]
    PlanSvc --> DayPlan["DayPlan + Evidence Cards"]
    
    DayPlan --> FactExtractor["Facts Extractor (facts.py)"]
    FactExtractor --> Facts["Compact Facts (Windows, Guidelines, Evidence IDs, Allowed Numbers)"]
    
    Facts --> RateCheck{"Daily Cap Reached? (>300 calls)"}
    RateCheck -->|Yes (daily_cap)| TemplateFallback["TemplateAdvisor (en/hi/ta)"]
    
    RateCheck -->|No| BedrockConverse["Bedrock Converse API (apac.amazon.nova-micro-v1:0 / ap-south-1)"]
    
    BedrockConverse --> Val1{"Strict Validator (Pass 1)"}
    Val1 -->|Valid JSON + Grounded Numbers + Citations| AdvisoryOutput["Advisory JSON Response (200 OK)"]
    
    Val1 -->|Invalid / Hallucination| RetryConverse["Converse API 1-Retry with Feedback"]
    RetryConverse --> Val2{"Strict Validator (Pass 2)"}
    
    Val2 -->|Valid| AdvisoryOutput
    Val2 -->|Invalid| TemplateFallback
    
    TemplateFallback --> AdvisoryOutput
    AdvisoryOutput --> AuditLog["Append-only Audit Log (No PII / No Prompt Text)"]
```

> [!NOTE]
> **Data Privacy & Model Routing**: The Bedrock integration utilizes Asia-Pacific regional inference profiles (`apac.amazon.nova-micro-v1:0`) which route dynamically across APAC AWS data centers for high availability. Strictly zero personal data, worker identifiers, or crew names are sent to the model—only computed anonymous plan facts (hourly temperatures, AQI levels, and schedule intervals).

## Grounding & Safety Validator Rules

Every generated advisory (whether from Bedrock or Template) passes through `validate_advisory_json`:
1. **Sentence Bounds**: Strictly 1 to 5 sentences.
2. **Evidence ID Citation**: Every sentence MUST cite at least 1 valid evidence ID from `DayPlan.evidence`.
3. **Number Grounding**: Every number in the advisory text MUST exist in the computed `allowed_numbers` set. Hallucinated numbers trigger automatic retry and fallback.
4. **Script Verification**:
   - English (`en`): Latin script.
   - Hindi (`hi`): Devanagari script ($\ge 5$ Devanagari characters).
   - Tamil (`ta`): Tamil script ($\ge 5$ Tamil characters).
5. **Medical Claim Blocklist**: Prohibits medical claims or prescriptions (`cure`, `antibiotic`, `மருந்து`, `दवा`).

## DynamoDB Single-Table Design

The table uses `PAY_PER_REQUEST` billing with partition key `pk` (String) and sort key `sk` (String), plus a TTL attribute `ttl` (Number).

### Access Patterns & Key Schema

| Entity | `pk` | `sk` | TTL | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Readings Cache** | `READINGS#<lat_lon>` | `READINGS` | 30 mins (`now + 1800`) | Cached hourly weather/AQI readings JSON. Key formatted as `f"{lat:.2f}_{lon:.2f}"`. |
| **Crew Profile** | `CREW#<id>` | `CREW` | None | Anonymous group profile (`name`, `city_id`, `job_type`, `workload`, `size`). |
| **Global Stats** | `STATS#GLOBAL` | `STATS` | None | Atomic counters (`plans_generated`, `hours_flagged`, `lead_time_sum`, `advisories_generated`). |
| **Daily LLM Cap** | `LLM_CALLS#<yyyy-mm-dd>` | `COUNT` | None | Atomic counter enforcing daily cost cap (300 calls/day default). |
| **Audit Event** | `AUDIT#<yyyy-mm-dd>` | `<iso_timestamp>#<id>` | 30 days (`now + 30d`) | Append-only anonymized event log (`event_type`, `details_json`). Strictly no PII. |

## Endpoints

- `GET /health` - Health check, runtime metadata, data mode, and version.
- `GET /cities` - Seeded Indian cities with coordinates.
- `GET /scenarios` - 4 recorded historical replay scenarios.
- `POST /plan` - Computes 24-hour heat/air day plan with recommended blocks.
- `POST /advise` - Generates validated multilingual plain-language advisory pinned to evidence cards.
- `GET /board` - Multi-city, multi-job risk matrix (`?mode=live` or `?mode=replay`).
- `GET /stats` - Real-time metrics on plans generated, flagged hours, advisories, and lead time.
- `GET /audit` - Append-only system audit log (no personal data).
- `GET /crews` - List registered anonymous crews.
- `POST /crews` - Create crew profile (protected by `X-Chhaya-Passcode`).
- `GET /crews/{id}` - Fetch crew details with live plan summary.
- `DELETE /crews/{id}` - Remove crew profile (protected by `X-Chhaya-Passcode`).
