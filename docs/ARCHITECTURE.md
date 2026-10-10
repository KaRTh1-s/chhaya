# Architecture

## Overview
Chhaya is designed as a serverless, decoupled microservice built on AWS Lambda, API Gateway HTTP API v2, Amazon DynamoDB, and Amazon Bedrock Converse API, with zero external runtime dependencies beyond the Python 3.11 standard library, `boto3`, and the pure-Python `chhaya_engine`.

## Split Lambda Architecture

To ensure sub-20ms cold starts for core planning calculations while enabling rich generative AI worker guidance, the backend is split into two specialized Lambda functions:

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
    
    RateCheck -->|No| BedrockConverse["Bedrock Converse API (Amazon Nova Micro / ap-south-1)"]
    
    BedrockConverse --> Val1{"Strict Validator (Pass 1)"}
    Val1 -->|Valid JSON + Grounded Numbers + Citations| AdvisoryOutput["Advisory JSON Response (200 OK)"]
    
    Val1 -->|Invalid / Hallucination| RetryConverse["Converse API 1-Retry with Feedback"]
    RetryConverse --> Val2{"Strict Validator (Pass 2)"}
    
    Val2 -->|Valid| AdvisoryOutput
    Val2 -->|Invalid| TemplateFallback
    
    TemplateFallback --> AdvisoryOutput
    AdvisoryOutput --> AuditLog["Append-only Audit Log (No PII / No Prompt Text)"]
```

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

## Web Frontend Architecture (S3 + CloudFront OAC)

The frontend is a static Single Page Application (SPA) built with React 19, TypeScript, and Vite. It is hosted on AWS using a decoupled, zero-server architecture:

```mermaid
flowchart TD
    User["End User (Mobile / Desktop Browser)"] -->|HTTPS (TLS 1.3 / HTTP/3)| CF["CloudFront Distribution (Edge Locations)"]
    
    subgraph "CloudFront Edge Protection"
        CF --> SHP["Security Headers Policy (HSTS, CSP, X-Frame DENY, Permissions)"]
        CF --> SPA["Custom Error Rewriter (403/404 -> /index.html)"]
    end
    
    subgraph "AWS S3 Private Origin"
        CF -->|Origin Access Control (SigV4 Signed)| S3["Private S3 Web Bucket (SSE-AES256 Encrypted)"]
        S3 --> Assets["/assets/* (1-Year Immutable Cache)"]
        S3 --> HTML["/index.html (No-Cache Revalidation)"]
    end

    subgraph "Client-Side Resilience"
        User --> BrowserApp["Chhaya Web App (React)"]
        BrowserApp -->|Fetch /api/...| APIGW["API Gateway / Backend"]
        BrowserApp -->|Network Error / Offline| MockEngine["Embedded Mock Engine (Delhi, Chennai, Coimbatore Recorded Fixtures)"]
        MockEngine --> DemoBanner["Demo Fallback Banner ('Showing recorded demo data')"]
    end
```

### Security & Delivery Controls
1. **Private S3 Origin with OAC**: The S3 bucket blocks all public access (`BlockPublicPolicy: true`). S3 read access is granted exclusively to CloudFront via AWS Origin Access Control with SigV4 signing.
2. **Security Headers**: Injected at CloudFront edge on every response:
   - `Strict-Transport-Security`: `max-age=31536000; includeSubdomains; preload`
   - `Content-Security-Policy`: Restricts scripts and connections to self and approved endpoints.
   - `X-Frame-Options`: `DENY` (clickjacking prevention).
   - `X-Content-Type-Options`: `nosniff`.
   - `Permissions-Policy`: Restricts camera, microphone, and payment APIs.
3. **SPA Routing**: CloudFront custom error responses intercept S3 403 and 404 status codes and rewrite to `/index.html` with HTTP 200, enabling clean client-side routing.
4. **Resilient Offline Fallback**: If the backend API Gateway or network is unreachable, `apiClient` automatically engages the client-side recorded fixtures without crashing and displays a visible fallback banner.

## Endpoints

- `GET /health` - Health check, runtime metadata, data mode, and version.
- `GET /cities` - Seeded Indian cities with coordinates.
- `GET /scenarios` - 4 recorded historical replay scenarios.
- `POST /plan` - Computes 24-hour heat/air day plan with recommended blocks.
- `POST /advise` - Generates validated multilingual plain-language advisory pinned to evidence cards.
- `GET /board` - Multi-city, multi-job risk matrix (`?mode=live` or `?mode=replay`).
- `GET /stats` - Operational metrics on plans generated, flagged hours, advisories, and lead time.
- `GET /audit` - Append-only system audit log (no personal data).
- `GET /crews` - List registered anonymous crews.
- `POST /crews` - Create crew profile (protected by `X-Chhaya-Passcode`).
- `GET /crews/{id}` - Fetch crew details with live plan summary.
- `DELETE /crews/{id}` - Remove crew profile (protected by `X-Chhaya-Passcode`).

