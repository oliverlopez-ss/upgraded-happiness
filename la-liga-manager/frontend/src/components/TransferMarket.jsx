import { useState, useEffect } from 'react'
import { api } from '../App'

const POSITIONS = ['', 'GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST']

function attrColor(val) {
  if (val >= 80) return '#2ea043'
  if (val >= 65) return '#d29922'
  return '#f85149'
}

function computeOverall(player) {
  const a = player.attributes
  const w = {
    GK:  [[a.goalkeeper,0.6],[a.defending,0.2],[a.physicality,0.1],[a.passing,0.1]],
    CB:  [[a.defending,0.45],[a.physicality,0.25],[a.passing,0.15],[a.pace,0.15]],
    LB:  [[a.defending,0.3],[a.pace,0.3],[a.passing,0.25],[a.physicality,0.15]],
    RB:  [[a.defending,0.3],[a.pace,0.3],[a.passing,0.25],[a.physicality,0.15]],
    CDM: [[a.defending,0.4],[a.physicality,0.25],[a.passing,0.25],[a.pace,0.1]],
    CM:  [[a.passing,0.35],[a.physicality,0.2],[a.defending,0.2],[a.pace,0.15],[a.shooting,0.1]],
    CAM: [[a.passing,0.35],[a.shooting,0.3],[a.pace,0.2],[a.physicality,0.15]],
    LW:  [[a.pace,0.35],[a.shooting,0.3],[a.passing,0.2],[a.physicality,0.15]],
    RW:  [[a.pace,0.35],[a.shooting,0.3],[a.passing,0.2],[a.physicality,0.15]],
    ST:  [[a.shooting,0.45],[a.physicality,0.25],[a.pace,0.2],[a.passing,0.1]],
  }
  const parts = w[player.position] || [[a.pace,1/6],[a.shooting,1/6],[a.passing,1/6],[a.defending,1/6],[a.physicality,1/6],[a.goalkeeper,1/6]]
  return Math.round(parts.reduce((acc,[v,wt]) => acc+v*wt, 0))
}

export default function TransferMarket({ gameState, onRefresh }) {
  const [available, setAvailable] = useState([])
  const [squad, setSquad]         = useState([])
  const [posFilter, setPosFilter] = useState('')
  const [maxPrice, setMaxPrice]   = useState('')
  const [bidTarget, setBidTarget] = useState(null)
  const [bidAmount, setBidAmount] = useState('')
  const [sellTarget, setSellTarget] = useState(null)
  const [history, setHistory]     = useState([])
  const [msg, setMsg]             = useState(null)
  const [loading, setLoading]     = useState(false)
  const [activeTab, setActiveTab] = useState('buy')
  const [windowOpen, setWO]       = useState(false)

  function load() {
    const qs = new URLSearchParams()
    if (posFilter) qs.set('position', posFilter)
    if (maxPrice)  qs.set('max_price', maxPrice)
    api(`/transfer/available?${qs}`).then(setAvailable).catch(() => {})
    api('/squad').then(setSquad).catch(() => {})
    api('/transfer/history').then(setHistory).catch(() => {})
    api('/transfer/window').then(d => setWO(d.open)).catch(() => {})
  }

  useEffect(() => {
    if (!gameState) return
    load()
  }, [gameState, posFilter, maxPrice])

  async function handleBid() {
    if (!bidTarget || !bidAmount) return
    setLoading(true); setMsg(null)
    try {
      const res = await api('/transfer/bid', {
        method: 'POST',
        body: JSON.stringify({ player_id: bidTarget.id, bid_fee: parseFloat(bidAmount) }),
      })
      setMsg({ type: 'success', text: res.message })
      setBidTarget(null); setBidAmount('')
      load(); onRefresh()
    } catch (e) {
      setMsg({ type: 'error', text: e.message })
    } finally {
      setLoading(false)
    }
  }

  async function handleSell(player, listOnly) {
    setLoading(true); setMsg(null)
    try {
      const res = await api('/transfer/sell', {
        method: 'POST',
        body: JSON.stringify({ player_id: player.id, list_only: listOnly }),
      })
      setMsg({ type: 'success', text: res.message })
      setSellTarget(null)
      load(); onRefresh()
    } catch (e) {
      setMsg({ type: 'error', text: e.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <div className="flex-between mb-12">
        <div className="page-title">Transfer Market</div>
        <span className={`badge ${windowOpen ? 'badge-green' : 'badge-red'}`}>
          Window {windowOpen ? 'Open' : 'Closed'}
        </span>
      </div>

      {msg && (
        <div className={msg.type === 'success' ? '' : 'error-box'}
          style={msg.type === 'success' ? {
            background:'rgba(46,160,67,0.1)', border:'1px solid #2ea04344',
            borderRadius:8, padding:'10px 14px', color:'#3fb950', marginBottom:12
          } : {}}>
          {msg.text}
        </div>
      )}

      <div className="flex gap-8 mb-12">
        {['buy','sell','history'].map(t => (
          <button key={t} className={activeTab === t ? 'primary' : ''}
            onClick={() => setActiveTab(t)}>
            {t === 'buy' ? '🔍 Buy Players' : t === 'sell' ? '💰 Sell Players' : '📋 History'}
          </button>
        ))}
      </div>

      {/* --- BUY --- */}
      {activeTab === 'buy' && (
        <div>
          <div className="flex gap-8 mb-12">
            <select value={posFilter} onChange={e => setPosFilter(e.target.value)}>
              <option value="">All Positions</option>
              {POSITIONS.filter(Boolean).map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <input
              type="number" placeholder="Max price (M€)"
              value={maxPrice} onChange={e => setMaxPrice(e.target.value)}
              style={{ width: 140 }}
            />
          </div>

          {bidTarget && (
            <div className="card mb-12" style={{ borderColor: '#f7a01d' }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>
                Bid for {bidTarget.name} — Market Value: €{bidTarget.market_value}M
              </div>
              <div className="flex gap-8">
                <input
                  type="number"
                  placeholder={`Min bid: €${bidTarget.market_value}M`}
                  value={bidAmount}
                  onChange={e => setBidAmount(e.target.value)}
                  style={{ width: 180 }}
                />
                <button className="primary" disabled={loading || !windowOpen} onClick={handleBid}>
                  {loading ? '...' : 'Submit Bid'}
                </button>
                <button onClick={() => { setBidTarget(null); setBidAmount('') }}>Cancel</button>
              </div>
              {!windowOpen && <div className="text-sm text-muted mt-8">Transfer window is closed.</div>}
            </div>
          )}

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table>
              <thead>
                <tr>
                  <th>OVR</th><th>Name</th><th>Pos</th><th>Age</th><th>Nat</th>
                  <th>Value</th><th>Wage</th><th>Status</th><th></th>
                </tr>
              </thead>
              <tbody>
                {available.map(p => (
                  <tr key={p.id}
                    style={{ background: bidTarget?.id === p.id ? 'rgba(247,160,29,0.1)' : undefined }}>
                    <td>
                      <span style={{ fontWeight: 700, color: attrColor(computeOverall(p)) }}>
                        {computeOverall(p)}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td><span className={`pos-pill pos-${p.position}`}>{p.position}</span></td>
                    <td>{p.age}</td>
                    <td className="text-muted">{p.nationality}</td>
                    <td style={{ color: '#2ea043', fontWeight: 600 }}>€{p.market_value}M</td>
                    <td className="text-muted">€{p.wage}k/wk</td>
                    <td>
                      {p.is_free_agent
                        ? <span className="badge badge-blue">Free Agent</span>
                        : <span className="badge badge-yellow">Listed</span>}
                    </td>
                    <td>
                      <button
                        style={{ padding: '3px 10px', fontSize: 12 }}
                        onClick={() => { setBidTarget(p); setBidAmount(p.market_value.toString()) }}
                      >
                        Bid
                      </button>
                    </td>
                  </tr>
                ))}
                {available.length === 0 && (
                  <tr><td colSpan={9} className="text-center text-muted" style={{ padding: 20 }}>
                    No players available.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- SELL --- */}
      {activeTab === 'sell' && (
        <div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table>
              <thead>
                <tr><th>OVR</th><th>Name</th><th>Pos</th><th>Age</th><th>Value</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {squad.map(p => (
                  <tr key={p.id}
                    style={{ background: sellTarget?.id === p.id ? 'rgba(248,81,73,0.08)' : undefined }}>
                    <td style={{ fontWeight: 700, color: attrColor(computeOverall(p)) }}>
                      {computeOverall(p)}
                    </td>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td><span className={`pos-pill pos-${p.position}`}>{p.position}</span></td>
                    <td>{p.age}</td>
                    <td style={{ color: '#2ea043' }}>€{p.market_value}M</td>
                    <td>
                      {p.is_transfer_listed
                        ? <span className="badge badge-yellow">Listed</span>
                        : <span className="badge badge-gray">In Squad</span>}
                    </td>
                    <td>
                      <div className="flex gap-8">
                        {!p.is_transfer_listed && (
                          <button style={{ padding: '3px 10px', fontSize: 12 }}
                            onClick={() => handleSell(p, true)} disabled={loading}>
                            List
                          </button>
                        )}
                        <button
                          style={{ padding: '3px 10px', fontSize: 12, background: 'rgba(248,81,73,0.15)', borderColor: '#f85149', color: '#f85149' }}
                          onClick={() => handleSell(p, false)} disabled={loading}>
                          Release
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- HISTORY --- */}
      {activeTab === 'history' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table>
            <thead>
              <tr><th>Player</th><th>From</th><th>To</th><th>Fee</th><th>MD</th><th>Type</th></tr>
            </thead>
            <tbody>
              {history.map(t => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 600 }}>{t.player_name}</td>
                  <td className="text-muted">{t.from_club_id || 'Free Agent'}</td>
                  <td className="text-muted">{t.to_club_id || 'Released'}</td>
                  <td style={{ color: '#2ea043' }}>€{t.fee.toFixed(1)}M</td>
                  <td className="text-muted">{t.matchday}</td>
                  <td><span className="badge badge-gray">{t.transfer_type}</span></td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr><td colSpan={6} className="text-center text-muted" style={{ padding: 20 }}>
                  No transfer history yet.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
