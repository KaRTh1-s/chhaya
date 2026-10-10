# Chhaya Project Brief

## PROBLEM
Delivery riders, construction labourers, street vendors and sanitation workers in Indian cities carry the worst heat and air-pollution exposure and decide when to work with no guidance. Weather and AQI apps are built for the general public, report city-level numbers, and never say what a worker should do. Heat action plans are PDFs that never reach the individual.

## SOLUTION
Chhaya is a heat-and-air exposure copilot for outdoor workers.
1. A worker (or their contractor) gives a location and job type (rider, construction, vendor, sanitation) plus workload level.
2. The system pulls hyperlocal temperature, humidity, solar radiation and AQI from free public APIs (Open-Meteo weather + Open-Meteo Air Quality; no API keys).
3. Deterministic code computes a heat-stress index (WBGT estimate) and an AQI exposure score.
4. A rule-based planner produces a work/rest/hydration/mask schedule for the next 24 hours (e.g. "work 6-10 AM, rest 12-4 PM").
5. An agent (Strands Agents SDK on Amazon Bedrock) turns the computed plan into a short, plain advisory in English, Hindi or Tamil. Every sentence is pinned to an evidence card (the numbers it came from).
6. Proactive alerts fire before dangerous windows (EventBridge schedule + SNS).
7. Employers/contractors/NGOs get a dashboard of crew exposure risk across a region.

## SAFETY PRINCIPLES (non-negotiable, these are our trust story)
- Evidence before the model: all numbers and thresholds come from code, never from the LLM. The LLM only phrases an already-computed plan.
- If Bedrock is unavailable or the output fails validation, fall back to deterministic template text. The product must work with zero LLM.
- Advisories are guidance, not medical advice. Always include a "when to seek help" line for heat illness symptoms.
- Everything must run locally with no AWS account (mocked AWS), and the same code deploys to real AWS.

## TECH
- Python 3.11 target.
