import json, os, sys, urllib.request, urllib.error, base64
from datetime import datetime

API_BASE = "https://superkollapi.wint.se/api"
USERNAME = os.environ["WINT_USERNAME"]
API_KEY = os.environ["WINT_API_KEY"]

BASIC_CREDS = base64.b64encode(f"{USERNAME}:{API_KEY}".encode()).decode()
YEAR = datetime.now().year
YEAR_START = f"{YEAR}-01-01"

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

def fetch_recent_pages(path, date_field, timeout=90, max_pages=50):
    """Fetch pages from the END (newest) working backwards until we pass YEAR_START."""
    # First get total to find last page
    result = api_get(f"{path}{'&' if '?' in path else '?'}page=0", timeout=timeout)
    if not result or not isinstance(result, dict):
        return []
    total = result.get("TotalItems", 0)
    per_page = result.get("NumPerPage", 30)
    if total == 0:
        return []
    last_page = (total - 1) // per_page
    print(f"  Total items: {total}, last page: {last_page}")

    all_items = []
    sep = "&" if "?" in path else "?"
    for page in range(last_page, max(last_page - max_pages, -1), -1):
        page_result = api_get(f"{path}{sep}page={page}", timeout=timeout)
        if not page_result or not isinstance(page_result, dict):
            break
        items = page_result.get("Items", [])
        if not items:
            break
        all_items.extend(items)
        # Check if we've gone past current year
        oldest_date = min((i.get(date_field) or "9999" for i in items))
        print(f"  Page {page}: {len(items)} items, oldest: {oldest_date[:10]}")
        if oldest_date < YEAR_START:
            break

    return all_items

def fetch_all_pages(path, timeout=90, max_pages=50):
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

# Fetch invoices from the END (newest first) until we pass current year
print(f"Fetching recent invoices (from end, looking for {YEAR})...")
raw_invoices = fetch_recent_pages("/Invoice", "DueDate")
# Filter to current year
current_year_invoices = [i for i in raw_invoices
    if (i.get("DueDate") or "").startswith(str(YEAR))]
# Unpaid: LeftToPay > 0 regardless of year
unpaid_invoices = [i for i in raw_invoices
    if (i.get("LeftToPay") or 0) > 0]
print(f"  Raw: {len(raw_invoices)}, {YEAR}: {len(current_year_invoices)}, unpaid: {len(unpaid_invoices)}")

# Fetch receipts from the END (newest first)
print(f"Fetching recent receipts (from end, looking for {YEAR})...")
raw_receipts = fetch_recent_pages("/Receipt", "DateTime")
current_year_receipts = [r for r in raw_receipts
    if (r.get("DateTime") or r.get("PaymentDate") or "").startswith(str(YEAR))]
print(f"  Raw: {len(raw_receipts)}, {YEAR}: {len(current_year_receipts)}")

# Fetch accounts (for cash position)
print("Fetching accounts...")
accounts = api_get("/Account")

# Fetch active customers only
print("Fetching customers...")
all_customers = fetch_all_pages("/Customer")
active_customers = [c for c in all_customers
    if not c.get("Inactive", False) and (c.get("NumOfInvoices") or 0) > 0]
print(f"  Total: {len(all_customers)}, active with invoices: {len(active_customers)}")

# Fetch employees
print("Fetching employees...")
employees = api_get("/Employees")

# Build output
wint_data = {
    "fetchedAt": datetime.now().isoformat(),
    "year": YEAR,
    "company": company,
    "invoices": {
        "all": current_year_invoices,
        "unpaid": unpaid_invoices,
    },
    "receipts": {
        "items": current_year_receipts,
    },
    "accounts": accounts,
    "customers": {
        "active": active_customers,
    },
    "employees": employees,
}

output_path = "warroom/data/wint.json"
with open(output_path, "w") as f:
    json.dump(wint_data, f, indent=2, default=str)

# Summary
print(f"\nSummary for {YEAR}:")
print(f"  Invoices ({YEAR}): {len(current_year_invoices)}")
print(f"  Unpaid invoices (all time): {len(unpaid_invoices)}")
print(f"  Receipts ({YEAR}): {len(current_year_receipts)}")
print(f"  Active customers: {len(active_customers)}")
emp_items = employees.get("Items", []) if employees else []
print(f"  Employees: {len(emp_items)}")
print(f"\nWrote Wint data to {output_path}")
