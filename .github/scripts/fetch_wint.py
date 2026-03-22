import json, os, sys, urllib.request, urllib.error, base64
from datetime import datetime

API_BASE = "https://superkollapi.wint.se/api"
USERNAME = os.environ["WINT_USERNAME"]
API_KEY = os.environ["WINT_API_KEY"]

BASIC_CREDS = base64.b64encode(f"{USERNAME}:{API_KEY}".encode()).decode()
YEAR = datetime.now().year

def api_get(path, timeout=60):
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

def fetch_all_pages(path, timeout=90, max_pages=20):
    """Fetch all pages from a paginated endpoint."""
    all_items = []
    sep = "&" if "?" in path else "?"
    for page in range(max_pages):
        result = api_get(f"{path}{sep}page={page}", timeout=timeout)
        if not result or not isinstance(result, dict):
            break
        items = result.get("Items", [])
        if not items:
            break
        all_items.extend(items)
        total = result.get("TotalItems", 0)
        print(f"  Page {page}: {len(items)} items (total: {total})")
        if len(all_items) >= total:
            break
    return all_items

# Verify auth
print("Verifying Wint API credentials...")
test = api_get("/Account")
if test is None:
    print("::error::Wint API authentication failed.")
    sys.exit(1)
print("  Authenticated successfully")

# Fetch company info
print("Fetching company info...")
company = api_get("/Auth")

# Fetch ALL invoices for current year, then filter
print(f"Fetching invoices for {YEAR}...")
all_invoices = fetch_all_pages(f"/Invoice?year={YEAR}")
# Filter: only unpaid (Status != 4) or current year invoices
unpaid_invoices = [i for i in all_invoices if i.get("Status") != 4 or i.get("LeftToPay", 0) > 0]
current_year_invoices = [i for i in all_invoices if str(YEAR) in (i.get("DueDate") or "")]
print(f"  Total: {len(all_invoices)}, unpaid: {len(unpaid_invoices)}, current year: {len(current_year_invoices)}")

# Fetch receipts for current year
print(f"Fetching receipts for {YEAR}...")
all_receipts = fetch_all_pages(f"/Receipt?year={YEAR}")
# Filter to current year only
current_year_receipts = [r for r in all_receipts
    if str(YEAR) in (r.get("DateTime") or r.get("PaymentDate") or "")]
print(f"  Total: {len(all_receipts)}, current year: {len(current_year_receipts)}")

# Fetch accounts (for cash position)
print("Fetching accounts...")
accounts = api_get("/Account")

# Fetch active customers only (skip inactive)
print("Fetching customers...")
all_customers = fetch_all_pages("/Customer")
active_customers = [c for c in all_customers if not c.get("Inactive", False)]
print(f"  Total: {len(all_customers)}, active: {len(active_customers)}")

# Fetch employees
print("Fetching employees...")
employees = api_get("/Employees")

# Build output with filtered data
wint_data = {
    "fetchedAt": datetime.now().isoformat(),
    "year": YEAR,
    "company": company,
    "invoices": {
        "all": current_year_invoices,
        "unpaid": unpaid_invoices,
        "totalAllTime": len(all_invoices),
    },
    "receipts": {
        "items": current_year_receipts,
        "totalAllTime": len(all_receipts),
    },
    "accounts": accounts,
    "customers": {
        "active": active_customers,
        "totalAllTime": len(all_customers),
    },
    "employees": employees,
}

output_path = "warroom/data/wint.json"
with open(output_path, "w") as f:
    json.dump(wint_data, f, indent=2, default=str)

# Summary
print(f"\nSummary for {YEAR}:")
print(f"  Invoices (current year): {len(current_year_invoices)}")
print(f"  Invoices (unpaid): {len(unpaid_invoices)}")
print(f"  Receipts (current year): {len(current_year_receipts)}")
print(f"  Active customers: {len(active_customers)}")
emp_items = employees.get("Items", []) if employees else []
print(f"  Employees: {len(emp_items)}")
print(f"\nWrote Wint data to {output_path}")
