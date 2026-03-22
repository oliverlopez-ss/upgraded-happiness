import json, os, sys, urllib.request, urllib.error
from datetime import datetime, timedelta

API_BASE = "https://superkollapi.wint.se/api"
USERNAME = os.environ["WINT_USERNAME"]
API_KEY = os.environ["WINT_API_KEY"]

def api_request(path, method="GET", body=None, token=None, auth_header=None):
    url = f"{API_BASE}{path}"
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    if token:
        header_value = auth_header or f"Bearer {token}"
        req.add_header("Authorization", header_value)
    try:
        resp = urllib.request.urlopen(req, timeout=30)
        return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        print(f"  HTTP {e.code} for {path}: {e.read().decode()[:200]}")
        return None
    except Exception as e:
        print(f"  Error for {path}: {e}")
        return None

# 1. Authenticate
print("Authenticating with Wint API...")
auth_resp = api_request("/Auth", method="POST", body={
    "username": USERNAME,
    "password": API_KEY
})
if not auth_resp:
    print("::error::Failed to authenticate with Wint API")
    sys.exit(1)

print(f"  Auth response keys: {list(auth_resp.keys()) if isinstance(auth_resp, dict) else type(auth_resp).__name__}")
print(f"  Auth response (truncated): {json.dumps(auth_resp, default=str)[:500]}")

token = auth_resp.get("token") or auth_resp.get("Token") or auth_resp.get("access_token")
if not token:
    if isinstance(auth_resp, str):
        token = auth_resp
    else:
        for k, v in auth_resp.items():
            if isinstance(v, str) and len(v) > 20:
                token = v
                break
if not token:
    print(f"::error::No token found in auth response: {json.dumps(auth_resp)[:300]}")
    sys.exit(1)
print(f"  Token: {token[:10]}...")

# 2. Try different auth methods to find the working one
print("Testing auth methods...")
test_path = "/Account"
auth_methods = [
    ("Bearer", f"Bearer {token}"),
    ("Token", f"Token {token}"),
    ("Plain", token),
    ("Basic", f"Basic {token}"),
]
working_auth = None
for name, header_value in auth_methods:
    print(f"  Trying {name}: Authorization: {header_value[:30]}...")
    result = api_request(test_path, token=token, auth_header=header_value)
    if result is not None:
        print(f"  {name} works!")
        working_auth = header_value
        break

if not working_auth:
    # Also try as query parameter
    print("  Trying token as query parameter...")
    result = api_request(f"{test_path}?token={token}", token=None)
    if result is not None:
        print("  Query parameter works!")
        # We'll handle this differently below
        working_auth = "query"

if not working_auth:
    print("::error::No auth method worked. Check API documentation.")
    sys.exit(1)

print(f"  Using auth method: {working_auth[:30]}...")

def fetch(path):
    """Fetch using the discovered working auth method."""
    if working_auth == "query":
        sep = "&" if "?" in path else "?"
        return api_request(f"{path}{sep}token={token}", token=None)
    return api_request(path, token=token, auth_header=working_auth)

# 3. Get company info
print("Fetching company info...")
company = fetch("/Auth")

# 4. Fetch invoices (current year)
print("Fetching invoices...")
year = datetime.now().year
invoices = fetch(f"/Invoice?year={year}")
if invoices is None:
    invoices = fetch("/Invoice")

# 5. Fetch receipts
print("Fetching receipts...")
receipts = fetch(f"/Receipt?year={year}")
if receipts is None:
    receipts = fetch("/Receipt")

# 6. Fetch accounts
print("Fetching accounts...")
accounts = fetch("/Account")

# 7. Fetch transactions
print("Fetching transactions...")
transactions = fetch(f"/Transaction?year={year}")
if transactions is None:
    transactions = fetch("/Transaction")

# 8. Fetch vouchers
print("Fetching vouchers...")
vouchers = fetch(f"/Voucher?year={year}")
if vouchers is None:
    vouchers = fetch("/Voucher")

# 9. Fetch employees
print("Fetching employees...")
employees = fetch("/Employees")

# 10. Fetch customers
print("Fetching customers...")
customers = fetch("/Customer")

# 11. Fetch salary deviations
print("Fetching salary data...")
salary_months = fetch("/SalaryDeviation/months")

# Build combined output
wint_data = {
    "fetchedAt": datetime.now().isoformat(),
    "company": company,
    "invoices": invoices,
    "receipts": receipts,
    "accounts": accounts,
    "transactions": transactions,
    "vouchers": vouchers,
    "employees": employees,
    "customers": customers,
    "salaryMonths": salary_months,
}

# Write to file
output_path = "warroom/data/wint.json"
with open(output_path, "w") as f:
    json.dump(wint_data, f, indent=2, default=str)

# Print summary
for key, val in wint_data.items():
    if key == "fetchedAt":
        continue
    if isinstance(val, list):
        print(f"  {key}: {len(val)} items")
    elif isinstance(val, dict):
        items = val.get("items") or val.get("results") or val.get("data")
        if isinstance(items, list):
            print(f"  {key}: {len(items)} items")
        else:
            print(f"  {key}: dict with {len(val)} keys")
    elif val is None:
        print(f"  {key}: (no data)")
    else:
        print(f"  {key}: {type(val).__name__}")

print(f"\nWrote Wint data to {output_path}")
