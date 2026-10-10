"""Model benchmark script for Amazon Bedrock models via Converse API."""
import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path
import numpy as np

import boto3
from botocore.exceptions import ClientError

sys.path.extend(["engine/src", "backend/src"])
from chhaya_engine.scenarios import load_scenario_readings, get_scenario, SCENARIOS
from chhaya_engine.planner import plan_day
from chhaya_engine.models import JobType, Workload, create_worker_profile
from chhaya_backend.agent.facts import build_facts_from_plan
from chhaya_backend.agent.advisors import BedrockConverseAdvisor
from chhaya_backend.agent.validator import validate_advisory_json
from chhaya_backend.store import DynamoDBStore

# Pricing reference estimates (AWS Bedrock Published Pricing, Oct 2024 / 2025):
# Source: https://aws.amazon.com/bedrock/pricing/
# Amazon Nova Micro: Input $0.000035 / 1k tokens ($0.035 / 1M), Output $0.00014 / 1k tokens ($0.14 / 1M)
# Amazon Nova Lite:  Input $0.00006 / 1k tokens ($0.06 / 1M), Output $0.00024 / 1k tokens ($0.24 / 1M)
# Anthropic Claude 3 Haiku: Input $0.00025 / 1k tokens ($0.25 / 1M), Output $0.00125 / 1k tokens ($1.25 / 1M)
# Anthropic Claude 3.5 Haiku: Input $0.0008 / 1k tokens ($0.80 / 1M), Output $0.004 / 1k tokens ($4.00 / 1M)

PRICING_TABLE = {
    "apac.amazon.nova-micro-v1:0": {"in": 0.000035 / 1000, "out": 0.00014 / 1000, "source": "https://aws.amazon.com/bedrock/pricing/"},
    "amazon.nova-micro-v1:0": {"in": 0.000035 / 1000, "out": 0.00014 / 1000, "source": "https://aws.amazon.com/bedrock/pricing/"},
    "amazon.nova-lite-v1:0": {"in": 0.00006 / 1000, "out": 0.00024 / 1000, "source": "https://aws.amazon.com/bedrock/pricing/"},
    "apac.amazon.nova-lite-v1:0": {"in": 0.00006 / 1000, "out": 0.00024 / 1000, "source": "https://aws.amazon.com/bedrock/pricing/"},
    "apac.anthropic.claude-3-haiku-20240307-v1:0": {"in": 0.00025 / 1000, "out": 0.00125 / 1000, "source": "https://aws.amazon.com/bedrock/pricing/"},
    "anthropic.claude-3-haiku-20240307-v1:0": {"in": 0.00025 / 1000, "out": 0.00125 / 1000, "source": "https://aws.amazon.com/bedrock/pricing/"},
}

def probe_candidates(region="ap-south-1"):
    client = boto3.client("bedrock-runtime", region_name=region)
    candidates = [
        "apac.amazon.nova-micro-v1:0",
        "amazon.nova-micro-v1:0",
        "apac.anthropic.claude-3-haiku-20240307-v1:0",
        "anthropic.claude-3-haiku-20240307-v1:0",
        "apac.amazon.nova-lite-v1:0",
        "amazon.nova-lite-v1:0",
    ]
    accessible = []
    print("=" * 80)
    print(f"  PROBING BEDROCK CANDIDATE MODELS ({region})")
    print("=" * 80)
    for model_id in candidates:
        try:
            resp = client.converse(
                modelId=model_id,
                messages=[{"role": "user", "content": [{"text": "Reply with 'ready'"}]}],
                inferenceConfig={"maxTokens": 10, "temperature": 0.0}
            )
            txt = resp["output"]["message"]["content"][0]["text"].strip()
            print(f"  [AVAILABLE] {model_id:<45} -> {txt}")
            accessible.append(model_id)
        except Exception as e:
            print(f"  [UNAVAILABLE] {model_id:<43} -> {type(e).__name__}: {str(e)[:60]}...")
    return accessible

def run_bench():
    region = "ap-south-1"
    accessible = probe_candidates(region=region)
    
    # Pick up to 3 candidate models (at least one Nova and one Claude Haiku if available)
    selected_models = []
    nova_models = [m for m in accessible if "nova" in m]
    haiku_models = [m for m in accessible if "haiku" in m]
    other_models = [m for m in accessible if m not in nova_models and m not in haiku_models]
    
    if nova_models:
        selected_models.append(nova_models[0])
    if haiku_models:
        selected_models.append(haiku_models[0])
    if len(nova_models) > 1 and len(selected_models) < 3:
        selected_models.append(nova_models[1])
    elif other_models and len(selected_models) < 3:
        selected_models.append(other_models[0])

    if not selected_models:
        print("ERROR: No candidate Bedrock models are accessible in this region.")
        return

    print("\n" + "=" * 80)
    print(f"  BENCHMARKING SELECTED MODELS: {selected_models}")
    print("=" * 80)

    # Prepare 12 test cases: 4 scenarios x 3 languages
    cases = []
    for sc in SCENARIOS:
        readings = load_scenario_readings(sc)
        # Use typical profile (Construction Heavy)
        p = create_worker_profile(JobType.CONSTRUCTION, Workload.HEAVY)
        anchor_dt = datetime.fromisoformat(f"{sc.date}T00:00:00+00:00")
        plan = plan_day(readings, p, sc.label, anchor_dt)
        facts = build_facts_from_plan(plan)
        for lang in ["en", "hi", "ta"]:
            cases.append((sc.id, lang, facts))

    results = {}
    tamil_samples = {}

    for model_id in selected_models:
        print(f"\nEvaluating Model: {model_id} (12 matrix calls)...")
        advisor = BedrockConverseAdvisor(model_id=model_id, region_name=region)
        client = boto3.client("bedrock-runtime", region_name=region)

        first_pass_valid = 0
        fallbacks = 0
        fallback_reasons = []
        latencies = []
        input_tokens_list = []
        output_tokens_list = []
        ta_valid_count = 0
        ta_total_count = 0

        for sc_id, lang, facts in cases:
            t0 = time.perf_counter()
            # Direct Converse 1st pass call to measure raw model performance
            from chhaya_backend.agent.prompts import SYSTEM_PROMPT, build_user_prompt
            user_prompt = build_user_prompt(facts.to_dict(), language=lang)
            try:
                resp = client.converse(
                    modelId=model_id,
                    system=[{"text": SYSTEM_PROMPT}],
                    messages=[{"role": "user", "content": [{"text": user_prompt}]}],
                    inferenceConfig={"maxTokens": 600, "temperature": 0.1, "topP": 0.9}
                )
                dt_ms = int((time.perf_counter() - t0) * 1000)
                latencies.append(dt_ms)
                
                usage = resp.get("usage", {})
                in_tok = usage.get("inputTokens", 0)
                out_tok = usage.get("outputTokens", 0)
                input_tokens_list.append(in_tok)
                output_tokens_list.append(out_tok)

                txt = resp["output"]["message"]["content"][0]["text"]
                val = validate_advisory_json(txt, facts, language=lang)

                if lang == "ta":
                    ta_total_count += 1

                if val.is_valid:
                    first_pass_valid += 1
                    if lang == "ta":
                        ta_valid_count += 1
                        if model_id not in tamil_samples:
                            tamil_samples[model_id] = txt
                else:
                    fallbacks += 1
                    fallback_reasons.append(f"{sc_id}/{lang}: {val.error}")
            except Exception as e:
                dt_ms = int((time.perf_counter() - t0) * 1000)
                latencies.append(dt_ms)
                fallbacks += 1
                fallback_reasons.append(f"{sc_id}/{lang}: {type(e).__name__}: {str(e)[:50]}")

        # Compute stats
        n_calls = len(cases)
        fp_rate = (first_pass_valid / n_calls) * 100.0
        fb_rate = (fallbacks / n_calls) * 100.0
        med_lat = np.median(latencies) if latencies else 0
        p95_lat = np.percentile(latencies, 95) if latencies else 0
        avg_in = np.mean(input_tokens_list) if input_tokens_list else 0
        avg_out = np.mean(output_tokens_list) if output_tokens_list else 0
        ta_fp_rate = (ta_valid_count / ta_total_count * 100.0) if ta_total_count > 0 else 0.0

        # Cost estimate
        price_info = PRICING_TABLE.get(model_id, {"in": 0.000035 / 1000, "out": 0.00014 / 1000, "source": "https://aws.amazon.com/bedrock/pricing/"})
        est_cost_per_call = (avg_in * price_info["in"]) + (avg_out * price_info["out"])

        results[model_id] = {
            "first_pass_valid_rate": fp_rate,
            "tamil_first_pass_rate": ta_fp_rate,
            "fallback_rate": fb_rate,
            "fallback_reasons": fallback_reasons,
            "median_latency_ms": med_lat,
            "p95_latency_ms": p95_lat,
            "avg_in_tokens": avg_in,
            "avg_out_tokens": avg_out,
            "est_cost_per_advisory_usd": est_cost_per_call,
            "pricing_source": price_info["source"],
        }

    print("\n" + "=" * 80)
    print("  MODEL BENCHMARK RESULTS SUMMARY (12 MATRIX CASES)")
    print("=" * 80)
    print(f"{'Model ID':<45} | {'1st Pass':<9} | {'Tamil 1st':<10} | {'Med Lat':<8} | {'Tokens (In/Out)':<16} | {'Est Cost/Call'}")
    print("-" * 80)
    for m, r in results.items():
        print(f"{m:<45} | {r['first_pass_valid_rate']:5.1f}%   | {r['tamil_first_pass_rate']:5.1f}%    | {r['median_latency_ms']:5.0f} ms | {r['avg_in_tokens']:4.0f} / {r['avg_out_tokens']:3.0f}     | ${r['est_cost_per_advisory_usd']:.6f}")
    print("=" * 80)

    # Print Tamil sample for chosen models
    for m, sample in tamil_samples.items():
        print(f"\nSample Tamil Advisory from {m}:")
        print(sample)

    # Decision logic: Highest Tamil 1st pass -> lowest latency -> lowest cost
    best_model = sorted(
        results.keys(),
        key=lambda m: (-results[m]["tamil_first_pass_rate"], -results[m]["first_pass_valid_rate"], results[m]["median_latency_ms"], results[m]["est_cost_per_advisory_usd"])
    )[0]

    print(f"\n[DECISION] Selected Default Bedrock Model: {best_model}")
    print(f"Reason: Tamil pass rate = {results[best_model]['tamil_first_pass_rate']:.1f}%, Median Latency = {results[best_model]['median_latency_ms']:.0f} ms, Cost = ${results[best_model]['est_cost_per_advisory_usd']:.6f}/call")

if __name__ == "__main__":
    run_bench()
