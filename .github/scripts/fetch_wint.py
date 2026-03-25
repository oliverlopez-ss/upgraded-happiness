import json, os, sys, urllib.request, urllib.error, base64
from datetime import datetime
from collections import Counter

API_BASE = "https://superkollapi.wint.se/api"
USERNAME = os.environ["WINT_USERNAME"]
API_KEY = os.environ["WINT_API_KEY"]

BASIC_CREDS = base64.b64encode(f"{USERNAME}:{API_KEY}".encode()).decode()
YEAR = datetime.now().year

# Invoice Status codes (from Wint UI):
# 0=Ej skickad (draft), 3=Skickad, 5=Förfallen, 4=Betald
# PaymentState: 0=Obetald, 1=Delvis betald, 2=Betald

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

def api_post(path, body, timeout=60):
    url = f"{API_BASE}{path}"
    data = json.dumps(body).encode()
    req = urllib.request.Request(url, data=data, method="POST")
    req.add_header("Content-Type", "application/json")
    req.add_header("Authorization", f"Basic {BASIC_CREDS}")
    try:
        resp = urllib.request.urlopen(req, timeout=timeout)
        return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        print(f"  HTTP {e.code} for POST {path}: {e.read().decode()[:200]}")
        return None
    except Exception as e:
        print(f"  Error for POST {path}: {e}")
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
    if status == 0:
        return False
    if left_to_pay <= 0:
        return False
    if payment_state == 2:
        return False
    return True

def classify_invoice(invoice):
    """Classify an invoice: 'paid', 'unpaid', or 'draft'."""
    status = invoice.get("Status", 0)
    if status == 0:
        return "draft"
    payment_state = invoice.get("PaymentState", 0)
    left_to_pay = invoice.get("LeftToPay") or 0
    if payment_state == 2 or left_to_pay <= 0:
        return "paid"
    return "unpaid"

# ── Verify auth ──
print("Verifying Wint API credentials...")
test = api_get("/Account")
if test is None:
    print("::error::Wint API authentication failed.")
    sys.exit(1)
print("  Authenticated successfully")

# ── Fetch company info ──
print("Fetching company info...")
company = api_get("/Auth")

# ── Customer invoices (ALL - both paid and unpaid) ──
print(f"\nFetching ALL customer invoices for {YEAR}...")
raw_invoices = fetch_recent_pages("/Invoice", "DueDate")
# Deduplicate by Id
seen_inv_ids = set()
deduped_invoices = []
for inv in raw_invoices:
    inv_id = inv.get("Id")
    if inv_id not in seen_inv_ids:
        seen_inv_ids.add(inv_id)
        deduped_invoices.append(inv)
raw_invoices = deduped_invoices

# Classify all invoices
paid_invoices = []
unpaid_invoices = []
for inv in raw_invoices:
    cls = classify_invoice(inv)
    if cls == "paid":
        paid_invoices.append(inv)
    elif cls == "unpaid":
        unpaid_invoices.append(inv)

print(f"  Total unique: {len(raw_invoices)}, paid: {len(paid_invoices)}, unpaid: {len(unpaid_invoices)}")
status_dist = Counter((i.get("Status"), i.get("PaymentState")) for i in raw_invoices)
print(f"  (Status, PaymentState) distribution:")
for (s, ps), count in sorted(status_dist.items()):
    ltp = sum(i.get("LeftToPay", 0) for i in raw_invoices if i.get("Status") == s and i.get("PaymentState") == ps)
    total_amt = sum(i.get("TotalAmount", 0) for i in raw_invoices if i.get("Status") == s and i.get("PaymentState") == ps)
    print(f"    Status={s}, PaymentState={ps}: {count} invoices, TotalAmount={total_amt:,.0f}, LeftToPay={ltp:,.0f}")

for inv in unpaid_invoices[:5]:
    print(f"    -> UNPAID: {inv.get('CustomerName')}: {inv.get('LeftToPay'):,.0f} kr, Due={inv.get('DueDate','')[:10]}")
for inv in paid_invoices[:5]:
    print(f"    -> PAID: {inv.get('CustomerName')}: {inv.get('TotalAmount'):,.0f} kr, Due={inv.get('DueDate','')[:10]}")

# ── Supplier invoices (Leverantörsfakturor) ──
print(f"\nFetching supplier invoices...")
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
    test = api_get(f"{ep}?page=0")
    if test is not None:
        print(f"  {ep} exists but returned 0 items")
        break

def is_supplier_unpaid(inv):
    if inv.get("State") != 0:
        return False
    if inv.get("IsPaid"):
        return False
    amount = inv.get("LeftToPay") or inv.get("Amount") or 0
    return amount > 0

seen_ids = set()
unpaid_supplier = []
all_supplier = []
for i in raw_supplier:
    inv_id = i.get("Id")
    if inv_id in seen_ids:
        continue
    seen_ids.add(inv_id)
    all_supplier.append(i)
    if is_supplier_unpaid(i):
        unpaid_supplier.append(i)
print(f"  Raw: {len(raw_supplier)}, unique: {len(all_supplier)}, unpaid: {len(unpaid_supplier)}")

# ── Receipts (Kvitton) ──
print(f"\nFetching receipts...")
raw_receipts = fetch_recent_pages("/Receipt", "DateTime")
pending_receipts = []
all_receipts_year = []
for r in raw_receipts:
    date = r.get("DateTime") or r.get("PaymentDate") or ""
    if not date.startswith(str(YEAR)):
        continue
    all_receipts_year.append(r)
    if r.get("PaymentState", 0) == 0:
        pending_receipts.append(r)
print(f"  Raw: {len(raw_receipts)}, {YEAR} total: {len(all_receipts_year)}, pending payout: {len(pending_receipts)}")

# ── Accounts (for cash position) ──
print("\nFetching accounts...")
accounts = api_get("/Account")

# ── Bank account balances (key accounts: 1930=Företagskonto, 1920=PlusGiro, etc.) ──
print("Fetching bank account balances...")
bank_accounts = {}
for acc_num in ["1930", "1920", "1910", "1940"]:
    balance = api_get(f"/Account/AccountBalance/{acc_num}")
    if balance is not None:
        bank_accounts[acc_num] = balance
        print(f"  Account {acc_num}: {json.dumps(balance)[:100]}")

# ── Monthly Result Report (actual P&L from WINT bookkeeping) ──
print(f"\nFetching monthly result report for {YEAR}...")
monthly_result = api_post("/FinancialReports/MonthlyResultReport", {
    "Year": YEAR,
})
if monthly_result:
    print(f"  Got monthly result report ({len(json.dumps(monthly_result))} bytes)")
else:
    print("  WARNING: Could not fetch monthly result report")

# ── Balance Report (for current financial position) ──
print(f"Fetching balance report...")
balance_report = api_post("/FinancialReports/BalanceReport", {
    "Year": YEAR,
    "Month": datetime.now().month,
})
if balance_report:
    print(f"  Got balance report ({len(json.dumps(balance_report))} bytes)")
else:
    print("  WARNING: Could not fetch balance report")

# ── Employees ──
print("Fetching employees...")
employees = api_get("/Employees")

# ── Build output ──
wint_data = {
    "fetchedAt": datetime.now().isoformat(),
    "year": YEAR,
    "company": company,
    "invoices": {
        "all": raw_invoices,
        "paid": paid_invoices,
        "unpaid": unpaid_invoices,
    },
    "supplierInvoices": {
        "all": all_supplier,
        "unpaid": unpaid_supplier,
    },
    "receipts": {
        "all": all_receipts_year,
        "pending": pending_receipts,
    },
    "accounts": accounts,
    "bankAccounts": bank_accounts,
    "monthlyResultReport": monthly_result,
    "balanceReport": balance_report,
    "employees": employees,
}

output_path = "warroom/data/wint.json"
with open(output_path, "w") as f:
    json.dump(wint_data, f, indent=2, default=str)

# ── Summary ──
print(f"\nSummary:")
print(f"  All customer invoices: {len(raw_invoices)} (paid: {len(paid_invoices)}, unpaid: {len(unpaid_invoices)})")
total_receivable = sum(i.get("LeftToPay", 0) for i in unpaid_invoices)
total_realized = sum(i.get("TotalAmount", 0) for i in paid_invoices)
print(f"  Total realized revenue (paid): {total_realized:,.0f} kr")
print(f"  Total receivable (unpaid): {total_receivable:,.0f} kr")
print(f"  Supplier invoices: {len(all_supplier)} (unpaid: {len(unpaid_supplier)})")
total_payable = sum((i.get("LeftToPay") or i.get("Amount") or 0) for i in unpaid_supplier)
print(f"  Total payable: {total_payable:,.0f} kr")
print(f"  Receipts: {len(all_receipts_year)} (pending: {len(pending_receipts)})")
total_pending = sum(r.get("Amount", 0) for r in pending_receipts)
print(f"  Total pending payout: {total_pending:,.0f} kr")
print(f"  Monthly result report: {'YES' if monthly_result else 'NO'}")
print(f"  Balance report: {'YES' if balance_report else 'NO'}")
emp_items = employees.get("Items", []) if employees else []
print(f"  Employees: {len(emp_items)}")
print(f"\nWrote Wint data to {output_path}")
