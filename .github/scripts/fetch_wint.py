import json, os, sys, urllib.request, urllib.error, base64
from datetime import datetime

API_BASE = "https://superkollapi.wint.se/api"
USERNAME = os.environ["WINT_USERNAME"]
API_KEY = os.environ["WINT_API_KEY"]

BASIC_CREDS = base64.b64encode(f"{USERNAME}:{API_KEY}".encode()).decode()

def fetch(path, timeout=60):
    url = f"{API_BASE}{path}"
    req = urllib.request.Request(url)
    req.add_header("Content-Type", "application/json")
    req.add_header("Authorization", f"Basic {BASIC_CREDS}")
    try:
        resp = urllib.request.urlopen(req, timeout=timeout)
        return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        print(f"  HTTP {e.code} for {path}: {e.read().decode()[:200]}")
        return None
    except Exception as e:
        print(f"  Error for {path}: {e}")
        return None

# Verify auth works
print("Verifying Wint API credentials...")
test = fetch("/Account")
if test is None:
    print("::error::Wint API authentication failed. Check WINT_USERNAME and WINT_API_KEY secrets.")
    sys.exit(1)
print("  Authenticated successfully")

year = datetime.now().year

endpoints = {
    "company": "/Auth",
    "invoices": f"/Invoice?year={year}",
    "receipts": f"/Receipt?year={year}",
    "accounts": "/Account",
    "transactions": f"/Transaction?year={year}",
    "vouchers": f"/Voucher?year={year}",
    "employees": "/Employees",
    "customers": "/Customer",
    "salaryMonths": "/SalaryDeviation/months",
}

wint_data = {"fetchedAt": datetime.now().isoformat()}

for key, path in endpoints.items():
    print(f"Fetching {key}...")
    result = fetch(path, timeout=90)
    wint_data[key] = result
    if result is None:
        print(f"  {key}: no data")
    elif isinstance(result, list):
        print(f"  {key}: {len(result)} items")
    elif isinstance(result, dict):
        items = result.get("items") or result.get("results") or result.get("data")
        if isinstance(items, list):
            print(f"  {key}: {len(items)} items")
        else:
            print(f"  {key}: dict with {len(result)} keys")

output_path = "warroom/data/wint.json"
with open(output_path, "w") as f:
    json.dump(wint_data, f, indent=2, default=str)

print(f"\nWrote Wint data to {output_path}")
