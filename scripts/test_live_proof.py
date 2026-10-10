"""Fetch and print live proof outputs from local server."""
import json
import urllib.request


def run_proof():
    # 1. Delhi Rider
    req1 = urllib.request.Request(
        "http://127.0.0.1:8788/plan",
        data=json.dumps({"city_id": "delhi", "job_type": "RIDER"}).encode(),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req1) as resp:
        res1 = json.loads(resp.read().decode())
        print("=" * 60)
        print("1. POST /plan (delhi/rider, live)")
        print("=" * 60)
        print(f"City: {res1['city_label']} | Data Source: {res1['data_source']} | Overall Risk: {res1['overall_risk']}")
        print(f"Generated At: {res1['generated_at']}")
        print("Recommended Blocks:")
        for b in res1["recommended_blocks"]:
            print(f"  {b['start'][11:16]} - {b['end'][11:16]} : {b['status']} ({b['summary_code']})")
        print("Hydration:", res1["hydration"])
        print("Mask:", res1["mask"])
        print("Sample Hours (First 4):")
        for h in res1["hours"][:4]:
            print(f"  {h['hour'][11:16]} | Status: {h['status']:<8} | WBGT: {h['wbgt_c']:.1f}°C | AQI: {h['aqi']} | Hydration: {h['hydration']}")

    # 2. Chennai Vendor
    req2 = urllib.request.Request(
        "http://127.0.0.1:8788/plan",
        data=json.dumps({"city_id": "chennai", "job_type": "VENDOR"}).encode(),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req2) as resp:
        res2 = json.loads(resp.read().decode())
        print("\n" + "=" * 60)
        print("2. POST /plan (chennai/vendor, live)")
        print("=" * 60)
        print(f"City: {res2['city_label']} | Data Source: {res2['data_source']} | Overall Risk: {res2['overall_risk']}")
        print(f"Generated At: {res2['generated_at']}")
        print("Recommended Blocks:")
        for b in res2["recommended_blocks"]:
            print(f"  {b['start'][11:16]} - {b['end'][11:16]} : {b['status']} ({b['summary_code']})")
        print("Hydration:", res2["hydration"])
        print("Mask:", res2["mask"])
        print("Sample Hours (First 4):")
        for h in res2["hours"][:4]:
            print(f"  {h['hour'][11:16]} | Status: {h['status']:<8} | WBGT: {h['wbgt_c']:.1f}°C | AQI: {h['aqi']} | Hydration: {h['hydration']}")

    # 3. Board Live (First 3 cities)
    req3 = urllib.request.Request("http://127.0.0.1:8788/board?mode=live")
    with urllib.request.urlopen(req3) as resp:
        res3 = json.loads(resp.read().decode())
        print("\n" + "=" * 60)
        print("3. GET /board?mode=live (First 3 Cities)")
        print("=" * 60)
        print(f"Updated At: {res3['updated_at']} | Mode: {res3['mode']}")
        for c in res3["cities"][:3]:
            print(f"City: {c['city_name']} ({c['city_id']})")
            for j, details in c["jobs"].items():
                print(f"  {j:<12}: Current={details['current_risk']:<8} Peak12h={details['next_12h_peak_risk']:<8} Workload={details['workload']}")

if __name__ == "__main__":
    run_proof()
