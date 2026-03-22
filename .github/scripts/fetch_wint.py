import json, os, sys, urllib.request, urllib.error, base64
from datetime import datetime

API_BASE = "https://superkollapi.wint.se/api"
USERNAME = os.environ["WINT_USERNAME"]
API_KEY = os.environ["WINT_API_KEY"]

BASIC_CREDS = base64.b64encode(f"{USERNAME}:{API_KEY}".encode()).decode()
YEAR = datetime.now().year

# Invoice Status codes (from Wint UI):
# 1=Ej skickad, 3=Skickad, ?=Påminnelse, 5=Förfallen, 4=Betald, ?=Makulerad, ?=Hos inkasso
# We want: Skickad, Påminnelse, Förfallen (i.e. sent but not yet paid)
# PaymentState: 0=Obetald, 1=Delvis betald, 2=Betald
WANTED_INVOICE_STATUSES = {3, 5}  # Skickad + Förfallen (will also check LeftToPay)

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
    """Fetch pages from the END (newest) working backwards."""
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
    year_start = f"{YEAR}-01-01"
    for page in range(last_page, max(last_page - max_pages, -1), -1):
        page_result = api_get(f"{path}{sep}page={page}", timeout=timeout)
        if not page_result or not isinstance(page_result, dict):
            break
        items = page_result.get("Items", [])
        if not items:
            break
        all_items.extend(items)
        oldest_date = min((i.get(date_field) or "9999" for i in items))
        print(f"  Page {page}: {len(items)} items, oldest: {oldest_date[:10]}")
        if oldest_date < year_start:
            break

    return all_items

def is_unpaid_and_sent(invoice):
    """Invoice is sent (not draft) and has outstanding balance."""
    status = invoice.get("Status", 0)
    left_to_pay = invoice.get("LeftToPay") or 0
    payment_state = invoice.get("PaymentState", 0)
    # Wint Status: 0=Ej skickad, 1=Skickad, 4=Betald
    # PaymentState: 0=Obetald, 1=Delvis betald, 2=Betald
    # We want: sent (Status >= 1) AND has outstanding balance
    if status == 0:  # Ej skickad (draft)
        return False
    if left_to_pay <= 0:
        return False
    if payment_state == 2:  # Fully paid
        return False
    return True

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

# --- Customer invoices (Kundfakturor) ---
print(f"\nFetching customer invoices...")
raw_invoices = fetch_recent_pages("/Invoice", "DueDate")
unpaid_invoices = [i for i in raw_invoices if is_unpaid_and_sent(i)]
print(f"  Raw: {len(raw_invoices)}, unpaid (LeftToPay>0): {len(unpaid_invoices)}")
# Log status + payment state distribution for debugging
from collections import Counter
status_dist = Counter((i.get("Status"), i.get("PaymentState")) for i in raw_invoices)
print(f"  (Status, PaymentState) distribution:")
for (s, ps), count in sorted(status_dist.items()):
    ltp = sum(i.get("LeftToPay", 0) for i in raw_invoices if i.get("Status") == s and i.get("PaymentState") == ps)
    print(f"    Status={s}, PaymentState={ps}: {count} invoices, LeftToPay total={ltp:,.0f}")
# Show sample of unpaid
for inv in unpaid_invoices[:5]:
    print(f"    -> {inv.get('CustomerName')}: {inv.get('LeftToPay'):,.0f} kr, Status={inv.get('Status')}, PS={inv.get('PaymentState')}, Due={inv.get('DueDate','')[:10]}")

# --- Supplier invoices (Leverantörsfakturor) ---
print(f"\nFetching supplier invoices...")
# Try different endpoint names
supplier_endpoints = [
    "/IncomingInvoice",
    "/SupplierInvoice",
    "/Supplier/Invoice",
    "/DocumentDraft",
]
raw_supplier = []
for ep in supplier_endpoints:
    print(f"  Trying {ep}...")
    result = fetch_recent_pages(ep, "DueDate")
    if result:
        print(f"  {ep} returned {len(result)} items!")
        raw_supplier = result
        break
    # If fetch_recent_pages returned empty, try a simple GET to check if endpoint exists
    test = api_get(f"{ep}?page=0")
    if test is not None:
        print(f"  {ep} exists but returned 0 items")
        break

# Supplier invoices use State (not Status/PaymentState):
#   State 0=Ny, 2=Attesterad, 4=Betald, 7=Bokförd, 8=Makulerad
# "Bokförd" means booked in accounting, NOT necessarily paid.
# Only exclude State=8 (Makulerad/cancelled). Use LeftToPay as primary filter.
def is_supplier_unpaid(inv):
    if inv.get("State") == 8:  # Makulerad
        return False
    left = inv.get("LeftToPay") or 0
    return left > 0

unpaid_supplier = [i for i in raw_supplier if is_supplier_unpaid(i)]
print(f"  Raw: {len(raw_supplier)}, unpaid (active & LeftToPay>0): {len(unpaid_supplier)}")
for inv in unpaid_supplier[:5]:
    name = inv.get('SupplierName') or '?'
    amt = inv.get('LeftToPay') or inv.get('Amount') or 0
    print(f"    -> {name}: {amt:,.0f} kr, State={inv.get('State')}, Due={inv.get('DueDate','')[:10]}")

# --- Receipts (Kvitton) - submitted but not paid out ---
print(f"\nFetching receipts...")
raw_receipts = fetch_recent_pages("/Receipt", "DateTime")
# PaymentState 0 = not paid out, State 1 = submitted
# Filter: current year, submitted, not paid out
pending_receipts = []
for r in raw_receipts:
    date = r.get("DateTime") or r.get("PaymentDate") or ""
    if not date.startswith(str(YEAR)):
        continue
    payment_state = r.get("PaymentState", 0)
    if payment_state == 0:  # Not paid out
        pending_receipts.append(r)
print(f"  Raw: {len(raw_receipts)}, {YEAR} pending payout: {len(pending_receipts)}")

# --- Accounts (for cash position) ---
print("\nFetching accounts...")
accounts = api_get("/Account")

# --- Employees ---
print("Fetching employees...")
employees = api_get("/Employees")

# Build output
wint_data = {
    "fetchedAt": datetime.now().isoformat(),
    "year": YEAR,
    "company": company,
    "invoices": {
        "unpaid": unpaid_invoices,
    },
    "supplierInvoices": {
        "unpaid": unpaid_supplier,
    },
    "receipts": {
        "pending": pending_receipts,
    },
    "accounts": accounts,
    "employees": employees,
}

output_path = "warroom/data/wint.json"
with open(output_path, "w") as f:
    json.dump(wint_data, f, indent=2, default=str)

# Summary
print(f"\nSummary:")
print(f"  Unpaid customer invoices: {len(unpaid_invoices)}")
total_receivable = sum(i.get("LeftToPay", 0) for i in unpaid_invoices)
print(f"  Total receivable: {total_receivable:,.0f} kr")
print(f"  Unpaid supplier invoices: {len(unpaid_supplier)}")
total_payable = sum(i.get("LeftToPay", 0) for i in unpaid_supplier)
print(f"  Total payable: {total_payable:,.0f} kr")
print(f"  Pending receipts: {len(pending_receipts)}")
total_pending = sum(r.get("Amount", 0) for r in pending_receipts)
print(f"  Total pending payout: {total_pending:,.0f} kr")
emp_items = employees.get("Items", []) if employees else []
print(f"  Employees: {len(emp_items)}")
print(f"\nWrote Wint data to {output_path}")
