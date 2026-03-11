const { useState, useEffect, useCallback } = React;
const ACCENT = "#2A9D8F";
const WARN = "#E76F51";
const NAVY = "#0D1F2D";
const STEEL = "#1C3F5E";

// Calls Claude API which calls HubSpot MCP to get deals
async function fetchHubSpotDeals() {
  const today = new Date();

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      system: `You are a HubSpot data assistant. When asked, search HubSpot for active pipeline deals using the search_crm_objects tool.

      Filter criteria:
      - closedate >= today (${today.toISOString().split('T')[0]})
      - hs_deal_stage_probability > 0
      - Sort by amount DESCENDING
      - Limit 30

      Properties to fetch: dealname, amount, dealstage, closedate, hs_deal_stage_probability

      Return ONLY valid JSON, no markdown, no explanation. Format:
      {
        "deals": [
          {
            "name": "Deal Name",
            "amount": 500000,
            "probability": 0.4,
            "closedate": "2026-04-26",
            "weighted": 200000
          }
        ],
        "fetched_at": "ISO timestamp"
      }`,
      messages: [{ role: "user", content: "Fetch active pipeline deals from HubSpot now." }],
      mcp_servers: [{ type: "url", url: "https://mcp.hubspot.com/anthropic", name: "hubspot-mcp" }]
    })
  });

  const data = await response.json();
  const textBlock = data.content?.find(b => b.type === "text");
  if (!textBlock) throw new Error("No text in response");

  const clean = textBlock.text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

function fmt(n) {
  if (n == null || n === "") return "\u2013";
  return new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK", maximumFractionDigits: 0 }).format(n);
}

function fmtDate(d) {
  if (!d) return "\u2013";
  return new Date(d).toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
}

function ProbBadge({ prob }) {
  const pct = Math.round((prob || 0) * 100);
  const color = pct >= 70 ? "#2A9D8F" : pct >= 40 ? "#E9C46A" : "#E76F51";
  return (
    <span style={{
      display: "inline-block",
      padding: "2px 8px",
      borderRadius: 4,
      fontSize: 11,
      fontWeight: 700,
      background: color + "22",
      color,
      border: `1px solid ${color}55`,
      minWidth: 38,
      textAlign: "center"
    }}>{pct}%</span>
  );
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderTop: `3px solid ${accent || ACCENT}`,
      borderRadius: 8,
      padding: "16px 20px",
      flex: 1,
      minWidth: 160
    }}>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: "#fff", fontFamily: "'DM Mono', monospace", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function WarRoom() {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetched, setLastFetched] = useState(null);
  const [sortBy, setSortBy] = useState("weighted");

  // Static data
  const cash = -298000;
  const fixedBurn = 82198;
  const variableBurn = 168333;
  const totalBurn = fixedBurn + variableBurn;
  const secureRevenue90 = (15000 + 47500) * 3;
  const runway = Math.abs(cash) / totalBurn;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchHubSpotDeals();
      setDeals(result.deals || []);
      setLastFetched(new Date().toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" }));
    } catch (e) {
      setError("Kunde inte h\u00e4mta deals: " + e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const sorted = [...deals].sort((a, b) => {
    if (sortBy === "weighted") return (b.weighted || 0) - (a.weighted || 0);
    if (sortBy === "amount") return (b.amount || 0) - (a.amount || 0);
    if (sortBy === "prob") return (b.probability || 0) - (a.probability || 0);
    return 0;
  });

  const totalWeighted = deals.reduce((s, d) => s + (d.weighted || 0), 0);
  const totalPipeline = deals.reduce((s, d) => s + (d.amount || 0), 0);
  const netto90 = cash + secureRevenue90 - (totalBurn * 3);

  return (
    <div style={{
      minHeight: "100vh",
      background: NAVY,
      fontFamily: "'IBM Plex Sans', 'Segoe UI', sans-serif",
      color: "#fff",
      padding: 0
    }}>
      {/* Header */}
      <div style={{
        background: STEEL,
        borderBottom: `3px solid ${ACCENT}`,
        padding: "16px 32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        <div>
          <div style={{ fontSize: 11, color: ACCENT, textTransform: "uppercase", letterSpacing: 2, fontWeight: 600 }}>Structsales AB</div>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.5 }}>Financial War Room</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {lastFetched && (
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
              Uppdaterad {lastFetched}
            </span>
          )}
          <button
            onClick={load}
            disabled={loading}
            style={{
              background: loading ? "rgba(42,157,143,0.3)" : ACCENT,
              color: "#fff",
              border: "none",
              borderRadius: 6,
              padding: "8px 18px",
              fontSize: 13,
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              transition: "all 0.2s"
            }}
          >
            {loading ? (
              <>
                <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>{"\u27F3"}</span>
                H&auml;mtar...
              </>
            ) : "\u27F3 Uppdatera fr\u00e5n HubSpot"}
          </button>
        </div>
      </div>

      <div style={{ padding: "24px 32px", maxWidth: 1200 }}>
        {/* SECTION 1-4 STAT CARDS */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: 2, marginBottom: 12 }}>Snapshot</div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <StatCard label="1. Cash idag" value={fmt(cash)} sub="Uppdatera manuellt" accent={cash < 0 ? WARN : ACCENT} />
            <StatCard label="2. Total burn / m\u00e5n" value={fmt(totalBurn)} sub={`Fast: ${fmt(fixedBurn)} \u00b7 R\u00f6rlig: ${fmt(variableBurn)}`} accent={WARN} />
            <StatCard label="Runway" value={`${runway.toFixed(1)} m\u00e5n`} sub="vid nuvarande burn" accent={runway < 2 ? WARN : ACCENT} />
            <StatCard label="3. S\u00e4kra int. 90 dagar" value={fmt(secureRevenue90)} sub="Manpower + Efuel retainer" accent={ACCENT} />
            <StatCard label="Netto position 90 dagar" value={fmt(netto90)} sub="Cash + s\u00e4kra \u2013 3\u00d7burn" accent={netto90 < 0 ? WARN : ACCENT} />
          </div>
        </div>

        {/* DIVIDER */}
        <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "24px 0" }} />

        {/* SECTION 4: PIPELINE */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: 2, marginBottom: 4 }}>4. Pipeline \u2013 live fr\u00e5n HubSpot</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
                {deals.length} aktiva aff\u00e4rer &middot; Viktat v\u00e4rde: <span style={{ color: ACCENT, fontWeight: 700 }}>{fmt(totalWeighted)}</span> &middot; Pipeline totalt: {fmt(totalPipeline)}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {[["weighted","Viktat"], ["amount","V\u00e4rde"], ["prob","Sannolikhet"]].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setSortBy(key)}
                  style={{
                    background: sortBy === key ? ACCENT : "rgba(255,255,255,0.06)",
                    color: sortBy === key ? "#fff" : "rgba(255,255,255,0.5)",
                    border: "none",
                    borderRadius: 4,
                    padding: "5px 12px",
                    fontSize: 11,
                    cursor: "pointer",
                    fontWeight: sortBy === key ? 700 : 400
                  }}
                >{label}</button>
              ))}
            </div>
          </div>

          {error && (
            <div style={{
              background: "rgba(231,111,81,0.15)",
              border: `1px solid ${WARN}44`,
              borderRadius: 8,
              padding: "12px 16px",
              color: WARN,
              fontSize: 13,
              marginBottom: 16
            }}>{"\u26A0"} {error}</div>
          )}

          {loading && deals.length === 0 ? (
            <div style={{ textAlign: "center", padding: 60, color: "rgba(255,255,255,0.3)", fontSize: 14 }}>
              <div style={{ fontSize: 28, marginBottom: 12, animation: "spin 1s linear infinite", display: "inline-block" }}>{"\u27F3"}</div>
              <br />H&auml;mtar pipeline fr&aring;n HubSpot...
            </div>
          ) : (
            <div style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 10,
              overflow: "hidden"
            }}>
              {/* Table header */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 130px 80px 130px 90px",
                padding: "10px 20px",
                background: "rgba(255,255,255,0.04)",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                fontSize: 10,
                color: "rgba(255,255,255,0.35)",
                textTransform: "uppercase",
                letterSpacing: 1
              }}>
                <span>Aff&auml;r</span>
                <span style={{ textAlign: "right" }}>V&auml;rde</span>
                <span style={{ textAlign: "center" }}>Sannolikhet</span>
                <span style={{ textAlign: "right" }}>Viktat v&auml;rde</span>
                <span style={{ textAlign: "right" }}>Close date</span>
              </div>

              {sorted.map((deal, i) => (
                <div
                  key={i}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 130px 80px 130px 90px",
                    padding: "12px 20px",
                    borderBottom: i < sorted.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                    background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)",
                    transition: "background 0.15s",
                    alignItems: "center"
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(42,157,143,0.08)"}
                  onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)"}
                >
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", fontWeight: 500 }}>{deal.name}</span>
                  <span style={{ textAlign: "right", fontSize: 13, color: "rgba(255,255,255,0.6)", fontFamily: "'DM Mono', monospace" }}>{fmt(deal.amount)}</span>
                  <span style={{ textAlign: "center" }}><ProbBadge prob={deal.probability} /></span>
                  <span style={{ textAlign: "right", fontSize: 13, fontWeight: 600, color: ACCENT, fontFamily: "'DM Mono', monospace" }}>{fmt(deal.weighted)}</span>
                  <span style={{ textAlign: "right", fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{fmtDate(deal.closedate)}</span>
                </div>
              ))}

              {/* Footer total */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 130px 80px 130px 90px",
                padding: "12px 20px",
                background: "rgba(42,157,143,0.1)",
                borderTop: `1px solid ${ACCENT}44`,
                fontSize: 13,
                fontWeight: 700
              }}>
                <span style={{ color: "rgba(255,255,255,0.7)" }}>TOTALT ({deals.length} aff&auml;rer)</span>
                <span style={{ textAlign: "right", color: "rgba(255,255,255,0.6)", fontFamily: "'DM Mono', monospace" }}>{fmt(totalPipeline)}</span>
                <span />
                <span style={{ textAlign: "right", color: ACCENT, fontFamily: "'DM Mono', monospace" }}>{fmt(totalWeighted)}</span>
                <span />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
