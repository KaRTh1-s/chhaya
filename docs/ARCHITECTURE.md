# Architecture

- Python 3.11 target.
- Monorepo containing engine, backend, and web frontend.
- AWS SAM for infrastructure (template.yaml)
- Services: Lambda, API Gateway (HTTP API), DynamoDB, EventBridge, SNS, Bedrock, CloudWatch.
- Local mode using `moto` and fixtures.

```mermaid
graph TD
    Client[Web Client] --> APIGW[API Gateway]
    APIGW --> Lambda[Lambda Handler]
    Lambda --> Engine[Chhaya Engine]
    Engine --> OpenMeteo[Open-Meteo APIs]
    Lambda --> Bedrock[Amazon Bedrock / Strands]
    Lambda --> DDB[(DynamoDB)]
    EventBridge[EventBridge] --> AlertLambda[Alert Lambda]
    AlertLambda --> SNS[SNS]
```
