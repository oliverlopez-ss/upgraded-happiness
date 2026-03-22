import { useState, useEffect } from 'react'
import { api } from '../App'

const FORMATIONS = ['4-3-3', '4-4-2', '3-5-2', '4-2-3-1', '5-3-2', '4-1-4-1']

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

export default function Tactics({ gameState, onRefresh }) {
  const [tactics, setTactics]   = useState(null)
  const [squad, setSquad]       = useState([])
  const [formation, setForm]    = useState('4-3-3')
  const [xi, setXI]             = useState([])
  const [error, setError]       = useState(null)
  const [success, setSuccess]   = useState(null)
  const [autoLoading, setAutoL] = useState(false)

  useEffect(() => {
    if (!gameState) return
    Promise.all([
      api('/tactics'),
      api('/squad'),
    ]).then(([t, s]) => {
      setTactics(t)
      setSquad(s)
      setForm(t.formation)
      setXI(t.starting_xi)
    }).catch(() => {})
  }, [gameState])

  async function handleSave() {
    setError(null); setSuccess(null)
    try {
      const t = await api('/tactics', {
        method: 'POST',
        body: JSON.stringify({ formation, starting_xi: xi, bench: [] }),
      })
      setTactics(t)
      setSuccess('Tactics saved successfully.')
      onRefresh()
    } catch (e) {
      setError(e.message)
    }
  }

  async function handleAuto() {
    setAutoL(true); setError(null); setSuccess(null)
    try {
      const t = await api(`/tactics/auto?formation=${formation}`, { method: 'POST' })
      setTactics(t)
      setForm(t.formation)
      setXI(t.starting_xi)
      setSuccess('Auto-picked best XI.')
      onRefresh()
    } catch (e) {
      setError(e.message)
    } finally {
      setAutoL(false)
    }
  }

  const xiPlayers = xi.map(id => squad.find(p => p.id === id)).filter(Boolean)
  const benchPlayers = squad.filter(p => !xi.includes(p.id))

  function moveToXI(player) {
    if (xi.length < 11 && !xi.includes(player.id)) {
      setXI([...xi, player.id])
    }
  }

  function removeFromXI(playerId) {
    setXI(xi.filter(id => id !== playerId))
  }

  return (
    <div className="page">
      <div className="flex-between mb-16">
        <div className="page-title">Tactics</div>
        <div className="flex gap-8">
          <select value={formation} onChange={e => setForm(e.target.value)}>
            {FORMATIONS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
          <button onClick={handleAuto} disabled={autoLoading}>
            {autoLoading ? '...' : '⚡ Auto-Pick'}
          </button>
          <button className="primary" onClick={handleSave}>Save Tactics</button>
        </div>
      </div>

      {error   && <div className="error-box">{error}</div>}
      {success && <div style={{ background:'rgba(46,160,67,0.1)', border:'1px solid #2ea04344', borderRadius:8, padding:'10px 14px', color:'#3fb950', marginBottom:12 }}>{success}</div>}

      <div className="grid-2">
        {/* Starting XI */}
        <div>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>
            Starting XI — {formation} <span className="text-muted text-sm">({xi.length}/11)</span>
          </div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table>
              <thead>
                <tr><th>#</th><th>Name</th><th>Pos</th><th>OVR</th><th></th></tr>
              </thead>
              <tbody>
                {xiPlayers.map((p, i) => (
                  <tr key={p.id}>
                    <td className="text-muted" style={{ width: 30 }}>{i+1}</td>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td><span className={`pos-pill pos-${p.position}`}>{p.position}</span></td>
                    <td style={{ color: attrColor(computeOverall(p)), fontWeight: 700 }}>{computeOverall(p)}</td>
                    <td>
                      <button
                        style={{ padding: '2px 8px', fontSize: 11 }}
                        onClick={() => removeFromXI(p.id)}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
                {xiPlayers.length === 0 && (
                  <tr><td colSpan={5} className="text-center text-muted" style={{ padding: 16 }}>
                    No players selected. Use Auto-Pick or add from bench.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bench */}
        <div>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>
            Bench ({benchPlayers.length})
          </div>
          <div className="card" style={{ padding: 0, overflow: 'hidden', maxHeight: 500, overflowY: 'auto' }}>
            <table>
              <thead>
                <tr><th>Name</th><th>Pos</th><th>OVR</th><th></th></tr>
              </thead>
              <tbody>
                {benchPlayers.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td><span className={`pos-pill pos-${p.position}`}>{p.position}</span></td>
                    <td style={{ color: attrColor(computeOverall(p)), fontWeight: 700 }}>{computeOverall(p)}</td>
                    <td>
                      {xi.length < 11 && !xi.includes(p.id) && (
                        <button
                          style={{ padding: '2px 8px', fontSize: 11 }}
                          onClick={() => moveToXI(p)}
                        >
                          + Add
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
