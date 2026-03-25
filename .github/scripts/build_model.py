"""
Build unified financial model from WINT actuals + CSV forecasts.

WINT is the source of truth for everything that has happened.
The CSV (finanser.csv) is only used for future months where no WINT data exists yet.

Output: warroom/data/model.json
"""
import json, csv, os, sys
from datetime import datetime

YEAR = datetime.now().year
CURRENT_MONTH = datetime.now().month
MONTH_NAMES = ["JAN", "FEB", "MAR", "APR", "MAJ", "JUN",
               "JUL", "AUG", "SEP", "OKT", "NOV", "DEC"]

# Foreign revenue customers (no Swedish VAT on these)
FOREIGN_REVENUE_KEYWORDS = ["hubspot commission"]


def load_wint_data(path):
    if not os.path.exists(path):
        print(f"WARNING: {path} not found")
        return None
    with open(path) as f:
        return json.load(f)


def load_csv_forecast(path):
    """Parse finanser.csv into structured forecast data."""
    if not os.path.exists(path):
        print(f"WARNING: {path} not found")
        return None
    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.reader(f)
        rows = [row for row in reader]

    if len(rows) < 2:
        return None

    # Find the header row with month names to determine column mapping
    header_row = rows[1] if len(rows) > 1 else []
    month_cols = {}
    for ci, cell in enumerate(header_row):
        cell_upper = cell.strip().upper()
        for mi, mname in enumerate(MONTH_NAMES):
            if cell_upper == mname:
                month_cols[mi] = ci
                break

    def find_row(label):
        label_lower = label.lower()
        for ri, row in enumerate(rows):
            if row and row[0].strip().lower().startswith(label_lower):
                return ri
        return -1

    def parse_num(s):
        if not s:
            return 0
        s = s.strip().replace(" ", "").replace("\xa0", "")
        try:
            return float(s)
        except ValueError:
            return 0

    # Find section markers
    rev_header = find_row("intäkter structsales") if find_row("intäkter structsales") >= 0 else find_row("intäkter")
    rev_total = find_row("intäkter/mån")
    exp_header = find_row("utgifter structsales") if find_row("utgifter structsales") >= 0 else find_row("utgifter")
    exp_total = find_row("utgifter/mån")
    liq_row = find_row("likviditet")
    balance_row = find_row("på kontot")

    # Parse starting balance
    starting_balance = 0
    if balance_row >= 0:
        # Look for a number in the row below or same row
        for ri in [balance_row, balance_row + 1]:
            if ri < len(rows):
                for cell in rows[ri]:
                    val = parse_num(cell)
                    if val != 0:
                        starting_balance = val
                        break
                if starting_balance != 0:
                    break

    # Parse line items
    def parse_line_items(start_row, end_row):
        items = []
        for ri in range(start_row, end_row):
            if ri >= len(rows):
                break
            row = rows[ri]
            name = row[0].strip() if row else ""
            if not name:
                continue
            amounts = {}
            for mi, ci in month_cols.items():
                if ci < len(row):
                    amounts[mi] = parse_num(row[ci])
            if any(v != 0 for v in amounts.values()):
                items.append({"name": name, "amounts": amounts})
        return items

    revenue_items = []
    expense_items = []
    if rev_header >= 0 and rev_total >= 0:
        revenue_items = parse_line_items(rev_header + 1, rev_total)
    if exp_header >= 0 and exp_total >= 0:
        expense_items = parse_line_items(exp_header + 1, exp_total)

    # Parse monthly totals
    monthly_totals = {}
    for mi, ci in month_cols.items():
        rev = parse_num(rows[rev_total][ci]) if rev_total >= 0 and ci < len(rows[rev_total]) else 0
        exp = parse_num(rows[exp_total][ci]) if exp_total >= 0 and ci < len(rows[exp_total]) else 0
        liq = parse_num(rows[liq_row][ci]) if liq_row >= 0 and ci < len(rows[liq_row]) else 0
        monthly_totals[mi] = {"revenue": rev, "expenses": exp, "liquidity": liq}

    return {
        "revenueItems": revenue_items,
        "expenseItems": expense_items,
        "monthlyTotals": monthly_totals,
        "startingBalance": starting_balance,
    }


def build_wint_monthly_from_invoices(wint):
    """Build monthly revenue/expense data from WINT invoice data."""
    monthly = {}
    for mi in range(12):
        monthly[mi] = {
            "revenue": 0,
            "expenses": 0,
            "revenueItems": [],
            "expenseItems": [],
            "paidInvoices": 0,
            "unpaidInvoices": 0,
        }

    # Revenue from paid customer invoices (TotalAmount = realized revenue)
    for inv in wint.get("invoices", {}).get("paid", []):
        # Use InvoiceDate or DueDate to determine which month the revenue belongs to
        date_str = inv.get("InvoiceDate") or inv.get("DueDate") or ""
        if not date_str or not date_str.startswith(str(YEAR)):
            continue
        try:
            month_idx = int(date_str[5:7]) - 1
        except (ValueError, IndexError):
            continue
        if month_idx < 0 or month_idx > 11:
            continue
        amount = inv.get("TotalAmount") or 0
        if amount <= 0:
            continue
        monthly[month_idx]["revenue"] += amount
        monthly[month_idx]["paidInvoices"] += 1
        monthly[month_idx]["revenueItems"].append({
            "name": inv.get("CustomerName", "Unknown"),
            "amount": amount,
            "invoiceNumber": inv.get("InvoiceNumber"),
            "status": "paid",
        })

    # Also count unpaid invoices per month (expected revenue not yet realized)
    for inv in wint.get("invoices", {}).get("unpaid", []):
        date_str = inv.get("InvoiceDate") or inv.get("DueDate") or ""
        if not date_str or not date_str.startswith(str(YEAR)):
            continue
        try:
            month_idx = int(date_str[5:7]) - 1
        except (ValueError, IndexError):
            continue
        if month_idx < 0 or month_idx > 11:
            continue
        amount = inv.get("TotalAmount") or 0
        left = inv.get("LeftToPay") or 0
        monthly[month_idx]["unpaidInvoices"] += 1
        monthly[month_idx]["revenueItems"].append({
            "name": inv.get("CustomerName", "Unknown"),
            "amount": amount,
            "leftToPay": left,
            "invoiceNumber": inv.get("InvoiceNumber"),
            "status": "unpaid",
        })

    # Expenses from supplier invoices
    for inv in wint.get("supplierInvoices", {}).get("all", []):
        date_str = inv.get("InvoiceDate") or inv.get("DueDate") or ""
        if not date_str or not date_str.startswith(str(YEAR)):
            continue
        try:
            month_idx = int(date_str[5:7]) - 1
        except (ValueError, IndexError):
            continue
        if month_idx < 0 or month_idx > 11:
            continue
        amount = inv.get("Amount") or inv.get("TotalAmount") or 0
        if amount <= 0:
            continue
        monthly[month_idx]["expenses"] += amount
        monthly[month_idx]["expenseItems"].append({
            "name": inv.get("SupplierName", "Unknown"),
            "amount": amount,
            "isPaid": inv.get("IsPaid", False),
        })

    # Expenses from receipts
    for r in wint.get("receipts", {}).get("all", []):
        date_str = r.get("DateTime") or r.get("PaymentDate") or ""
        if not date_str or not date_str.startswith(str(YEAR)):
            continue
        try:
            month_idx = int(date_str[5:7]) - 1
        except (ValueError, IndexError):
            continue
        if month_idx < 0 or month_idx > 11:
            continue
        amount = r.get("Amount") or 0
        if amount <= 0:
            continue
        monthly[month_idx]["expenses"] += amount
        monthly[month_idx]["expenseItems"].append({
            "name": r.get("Description") or r.get("PersonName") or "Kvitto",
            "amount": amount,
            "type": "receipt",
        })

    return monthly


def build_wint_monthly_from_reports(wint):
    """Try to extract monthly P&L from WINT's MonthlyResultReport."""
    report = wint.get("monthlyResultReport")
    if not report:
        return None

    monthly = {}
    # The MonthlyResultReport structure varies - try to parse it
    # It typically has rows with account groups and monthly columns
    rows = report if isinstance(report, list) else report.get("Rows", report.get("rows", []))
    if not rows:
        return None

    print(f"  Parsing monthly result report ({len(rows)} rows)...")

    for mi in range(12):
        monthly[mi] = {"revenue": 0, "expenses": 0, "items": []}

    # WINT MonthlyResultReport typically has:
    # - Rows with AccountGroupName and monthly Amount values
    # - Revenue accounts: 3xxx (Försäljningsintäkter)
    # - Expense accounts: 4xxx-8xxx
    for row in rows:
        if not isinstance(row, dict):
            continue
        account_num = row.get("AccountNumber") or row.get("Account") or ""
        account_name = row.get("AccountName") or row.get("Name") or ""
        amounts = row.get("Amounts") or row.get("MonthlyAmounts") or []

        if not amounts:
            # Try individual month fields
            for mi in range(12):
                month_key = MONTH_NAMES[mi]
                val = row.get(month_key) or row.get(f"Month{mi+1}") or 0
                if val:
                    amounts.append(val) if len(amounts) <= mi else None

        acc_str = str(account_num)
        for mi, amt in enumerate(amounts):
            if mi > 11:
                break
            amt = float(amt) if amt else 0
            if amt == 0:
                continue
            # Revenue accounts: 3000-3999 (amounts are typically negative in Swedish accounting)
            if acc_str.startswith("3"):
                monthly[mi]["revenue"] += abs(amt)
                monthly[mi]["items"].append({"account": acc_str, "name": account_name, "amount": abs(amt), "type": "revenue"})
            # Cost of goods: 4000-4999, Operating expenses: 5000-6999, Personnel: 7000-7999, Financial: 8000-8999
            elif acc_str and acc_str[0] in "45678":
                monthly[mi]["expenses"] += abs(amt)
                monthly[mi]["items"].append({"account": acc_str, "name": account_name, "amount": abs(amt), "type": "expense"})

    # Check if we got any data
    has_data = any(monthly[mi]["revenue"] > 0 or monthly[mi]["expenses"] > 0 for mi in range(12))
    if not has_data:
        print("  WARNING: MonthlyResultReport parsed but no revenue/expense data found")
        return None

    return monthly


def get_cash_position(wint):
    """Get current cash position from WINT bank account balances."""
    bank = wint.get("bankAccounts", {})
    total = 0
    details = {}
    for acc_num, data in bank.items():
        # Balance data structure varies
        if isinstance(data, dict):
            bal = data.get("Balance") or data.get("Amount") or data.get("balance") or 0
        elif isinstance(data, (int, float)):
            bal = data
        else:
            bal = 0
        total += bal
        details[acc_num] = bal
    return total, details


def build_model():
    wint_path = "warroom/data/wint.json"
    csv_path = "warroom/data/finanser.csv"

    wint = load_wint_data(wint_path)
    forecast = load_csv_forecast(csv_path)

    if not wint and not forecast:
        print("ERROR: No data sources available")
        sys.exit(1)

    # ── Build actuals from WINT ──
    # Strategy 1: Use MonthlyResultReport if available (most accurate - from bookkeeping)
    # Strategy 2: Fall back to invoice/receipt aggregation
    wint_from_reports = None
    wint_from_invoices = None

    if wint:
        wint_from_reports = build_wint_monthly_from_reports(wint)
        wint_from_invoices = build_wint_monthly_from_invoices(wint)

    # ── Merge: WINT actuals for past/current months, CSV for future ──
    model_months = []
    cash_position, cash_details = get_cash_position(wint) if wint else (0, {})
    starting_balance = forecast["startingBalance"] if forecast else 0

    # Use WINT cash position if available, otherwise CSV starting balance
    if cash_position != 0:
        running_cash = cash_position
        cash_source = "wint"
    elif starting_balance != 0:
        running_cash = starting_balance
        cash_source = "csv"
    else:
        running_cash = 0
        cash_source = "none"

    for mi in range(12):
        month_name = MONTH_NAMES[mi]
        month_num = mi + 1
        is_past_or_current = month_num <= CURRENT_MONTH

        month_data = {
            "month": month_name,
            "monthIndex": mi,
            "monthNumber": month_num,
            "revenue": 0,
            "expenses": 0,
            "netto": 0,
            "source": "none",
            "revenueItems": [],
            "expenseItems": [],
            "hasData": False,
        }

        if is_past_or_current and wint:
            # WINT is source of truth for past/current months
            # Prefer the result report (bookkeeping) over invoice aggregation
            report_data = wint_from_reports.get(mi) if wint_from_reports else None
            invoice_data = wint_from_invoices.get(mi) if wint_from_invoices else None

            if report_data and (report_data["revenue"] > 0 or report_data["expenses"] > 0):
                month_data["revenue"] = report_data["revenue"]
                month_data["expenses"] = report_data["expenses"]
                month_data["source"] = "wint-bokforing"
                month_data["revenueItems"] = report_data.get("items", [])
                month_data["hasData"] = True
                # Enrich with invoice details if available
                if invoice_data:
                    month_data["invoiceDetails"] = {
                        "paidInvoices": invoice_data["paidInvoices"],
                        "unpaidInvoices": invoice_data["unpaidInvoices"],
                        "invoiceItems": invoice_data["revenueItems"],
                    }
            elif invoice_data and (invoice_data["revenue"] > 0 or invoice_data["expenses"] > 0):
                month_data["revenue"] = invoice_data["revenue"]
                month_data["expenses"] = invoice_data["expenses"]
                month_data["source"] = "wint-fakturor"
                month_data["revenueItems"] = invoice_data["revenueItems"]
                month_data["expenseItems"] = invoice_data["expenseItems"]
                month_data["hasData"] = True
            elif forecast and mi in forecast.get("monthlyTotals", {}):
                # Fall back to CSV for current month if WINT has no data yet
                csv_month = forecast["monthlyTotals"][mi]
                month_data["revenue"] = csv_month["revenue"]
                month_data["expenses"] = csv_month["expenses"]
                month_data["source"] = "csv-fallback"
                month_data["hasData"] = csv_month["revenue"] > 0 or csv_month["expenses"] > 0
                if forecast.get("revenueItems"):
                    for item in forecast["revenueItems"]:
                        amt = item["amounts"].get(mi, 0)
                        if amt:
                            month_data["revenueItems"].append({"name": item["name"], "amount": amt, "source": "forecast"})
                if forecast.get("expenseItems"):
                    for item in forecast["expenseItems"]:
                        amt = item["amounts"].get(mi, 0)
                        if amt:
                            month_data["expenseItems"].append({"name": item["name"], "amount": amt, "source": "forecast"})
        else:
            # Future months: use CSV forecast
            if forecast and mi in forecast.get("monthlyTotals", {}):
                csv_month = forecast["monthlyTotals"][mi]
                month_data["revenue"] = csv_month["revenue"]
                month_data["expenses"] = csv_month["expenses"]
                month_data["source"] = "forecast"
                month_data["hasData"] = csv_month["revenue"] > 0 or csv_month["expenses"] > 0
                if forecast.get("revenueItems"):
                    for item in forecast["revenueItems"]:
                        amt = item["amounts"].get(mi, 0)
                        if amt:
                            month_data["revenueItems"].append({"name": item["name"], "amount": amt, "source": "forecast"})
                if forecast.get("expenseItems"):
                    for item in forecast["expenseItems"]:
                        amt = item["amounts"].get(mi, 0)
                        if amt:
                            month_data["expenseItems"].append({"name": item["name"], "amount": amt, "source": "forecast"})

        month_data["netto"] = month_data["revenue"] - month_data["expenses"]
        model_months.append(month_data)

    # ── Compute liquidity (running cash balance) ──
    # Find the first month with data to anchor cash position
    # Work backwards from current month to compute starting point
    cumulative_netto = sum(m["netto"] for m in model_months[:CURRENT_MONTH])

    # If we have a known cash position, back-calculate the starting cash
    if cash_position != 0:
        implied_start = cash_position - cumulative_netto
        running = implied_start
    elif starting_balance != 0:
        # CSV balance is for a specific date, use it as anchor
        running = starting_balance - cumulative_netto
    else:
        running = 0

    for m in model_months:
        running += m["netto"]
        m["liquidity"] = running

    # ── Build summary ──
    total_actual_revenue = sum(m["revenue"] for m in model_months if m["source"].startswith("wint"))
    total_forecast_revenue = sum(m["revenue"] for m in model_months if m["source"] == "forecast")
    total_actual_expenses = sum(m["expenses"] for m in model_months if m["source"].startswith("wint"))
    total_forecast_expenses = sum(m["expenses"] for m in model_months if m["source"] == "forecast")

    model = {
        "generatedAt": datetime.now().isoformat(),
        "year": YEAR,
        "currentMonth": CURRENT_MONTH,
        "cashPosition": {
            "amount": cash_position,
            "source": cash_source,
            "bankAccounts": cash_details,
            "csvStartingBalance": starting_balance,
        },
        "months": model_months,
        "summary": {
            "totalActualRevenue": total_actual_revenue,
            "totalForecastRevenue": total_forecast_revenue,
            "totalActualExpenses": total_actual_expenses,
            "totalForecastExpenses": total_forecast_expenses,
            "yearEndProjectedLiquidity": model_months[-1]["liquidity"] if model_months else 0,
            "monthsWithWintData": sum(1 for m in model_months if m["source"].startswith("wint")),
            "monthsWithForecast": sum(1 for m in model_months if m["source"] == "forecast"),
        },
        "dataSources": {
            "wint": {
                "fetchedAt": wint.get("fetchedAt") if wint else None,
                "hasMonthlyReport": wint_from_reports is not None,
                "hasInvoiceData": wint_from_invoices is not None,
                "totalInvoices": len(wint.get("invoices", {}).get("all", [])) if wint else 0,
                "paidInvoices": len(wint.get("invoices", {}).get("paid", [])) if wint else 0,
                "unpaidInvoices": len(wint.get("invoices", {}).get("unpaid", [])) if wint else 0,
            },
            "csv": {
                "available": forecast is not None,
                "startingBalance": starting_balance,
            }
        }
    }

    output_path = "warroom/data/model.json"
    with open(output_path, "w") as f:
        json.dump(model, f, indent=2, default=str)

    print(f"\nModel built successfully -> {output_path}")
    print(f"  Months with WINT actuals: {model['summary']['monthsWithWintData']}")
    print(f"  Months with forecasts: {model['summary']['monthsWithForecast']}")
    print(f"  Cash position: {cash_position:,.0f} kr (source: {cash_source})")
    print(f"  Actual revenue YTD: {total_actual_revenue:,.0f} kr")
    print(f"  Forecast revenue remaining: {total_forecast_revenue:,.0f} kr")
    print(f"  Year-end projected liquidity: {model['summary']['yearEndProjectedLiquidity']:,.0f} kr")

    for m in model_months:
        tag = ""
        if m["source"].startswith("wint"):
            tag = " [WINT]"
        elif m["source"] == "forecast":
            tag = " [PROGNOS]"
        elif m["source"] == "csv-fallback":
            tag = " [CSV*]"
        elif m["source"] == "none":
            tag = " [-]"
        print(f"  {m['month']}: intäkter={m['revenue']:>10,.0f}  utgifter={m['expenses']:>10,.0f}  netto={m['netto']:>10,.0f}  likviditet={m['liquidity']:>10,.0f}{tag}")


if __name__ == "__main__":
    build_model()
