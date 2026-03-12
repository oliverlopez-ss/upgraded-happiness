import { useState, useEffect } from 'react'
import { api } from '../App'

function attrColor(val) {
  if (val >= 80) return '#2ea043'
  if (val >= 65) return '#d29922'
  return '#f85149'
}

function AttrBar({ label, value }) {
  return (
    <div className="stat-bar">
      <span style={{ width: 28, color: 'var(--text-muted)', fontSize: 11 }}>{label}</span>
      <div className="stat-bar-track">
        <div
          className="stat-bar-fill"
          style={{ width: `${value}%`, background: attrColor(value) }}
        />
      </div>
      <span style={{ width: 26, textAlign: 'right', color: attrColor(value), fontWeight: 600 }}>{value}</span>
    </div>
  )
}

function PlayerRow({ player, onClick, selected }) {
  const overall = computeOverall(player)
  return (
    <tr
      onClick={() => onClick(player)}
      style={{
        cursor: 'pointer',
        background: selected ? 'rgba(88,166,255,0.1)' : undefined,
      }}
    >
      <td>
        <span className="overall-chip" style={{ background: attrColor(overall) + '33', color: attrColor(overall) }}>
          {overall}
        </span>
      </td>
      <td style={{ fontWeight: 600 }}>{player.name}</td>
      <td><span className={`pos-pill pos-${player.position}`}>{player.position}</span></td>
      <td>{player.age}</td>
      <td>{player.nationality}</td>
      <td style={{ color: attrColor(player.attributes.pace) }}>{player.attributes.pace}</td>
      <td style={{ color: attrColor(player.attributes.shooting) }}>{player.attributes.shooting}</td>
      <td style={{ color: attrColor(player.attributes.passing) }}>{player.attributes.passing}</td>
      <td style={{ color: attrColor(player.attributes.defending) }}>{player.attributes.defending}</td>
      <td style={{ color: attrColor(player.attributes.physicality) }}>{player.attributes.physicality}</td>
      <td>{player.attributes.goalkeeper >= 60 ? player.attributes.goalkeeper : '—'}</td>
      <td style={{ color: '#2ea043' }}>€{player.market_value}M</td>
      <td className="text-muted">€{player.wage}k</td>
      {player.is_transfer_listed && <td><span className="badge badge-yellow">Listed</span></td>}
    </tr>
  )
}

function computeOverall(player) {
  const a = player.attributes
  const pos = player.position
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
  const parts = w[pos] || [[a.pace,1/6],[a.shooting,1/6],[a.passing,1/6],[a.defending,1/6],[a.physicality,1/6],[a.goalkeeper,1/6]]
  return Math.round(parts.reduce((acc,[v,wt]) => acc + v*wt, 0))
}

const POS_ORDER = ['GK','CB','LB','RB','CDM','CM','CAM','LW','RW','ST']

export default function Squad({ gameState }) {
  const [players, setPlayers]     = useState([])
  const [selected, setSelected]   = useState(null)
  const [filter, setFilter]       = useState('')
  const [posFilter, setPosFilter] = useState('ALL')
  const [clubId, setClubId]       = useState(null)
  const [clubs, setClubs]         = useState([])

  useEffect(() => {
    if (!gameState) return
    setClubId(gameState.user_club_id)
    api('/clubs').then(setClubs).catch(() => {})
  }, [gameState])

  useEffect(() => {
    if (!clubId) return
    api(`/squad/${clubId}`).then(setPlayers).catch(() => {})
  }, [clubId])

  const filtered = players.filter(p => {
    const nameMatch = p.name.toLowerCase().includes(filter.toLowerCase())
    const posMatch  = posFilter === 'ALL' || p.position === posFilter
    return nameMatch && posMatch
  })

  return (
    <div className="page">
      <div className="flex-between mb-16">
        <div className="page-title">Squad</div>
        <div className="flex gap-8">
          <select value={clubId || ''} onChange={e => setClubId(e.target.value)}>
            {clubs.map(c => (
              <option key={c.id} value={c.id}>
                {c.name} {c.id === gameState?.user_club_id ? '(Your Club)' : ''}
              </option>
            ))}
          </select>
          <select value={posFilter} onChange={e => setPosFilter(e.target.value)}>
            <option value="ALL">All Positions</option>
            {POS_ORDER.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <input
            placeholder="Search player..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
          />
        </div>
      </div>

      <div className={selected ? 'grid-2' : ''} style={{ gap: 16 }}>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table>
            <thead>
              <tr>
                <th>OVR</th><th>Name</th><th>Pos</th><th>Age</th><th>Nat</th>
                <th title="Pace">PAC</th>
                <th title="Shooting">SHO</th>
                <th title="Passing">PAS</th>
                <th title="Defending">DEF</th>
                <th title="Physicality">PHY</th>
                <th title="Goalkeeper">GK</th>
                <th>Value</th><th>Wage</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <PlayerRow
                  key={p.id}
                  player={p}
                  onClick={setSelected}
                  selected={selected?.id === p.id}
                />
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={14} className="text-center text-muted" style={{ padding: 20 }}>No players found.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Detail panel */}
        {selected && (
          <div>
            <div className="card" style={{ position: 'sticky', top: 60 }}>
              <div className="flex-between mb-12">
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{selected.name}</div>
                  <div className="text-muted text-sm">{selected.nationality} · {selected.age} yrs</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className={`overall-chip`} style={{
                    width: 48, height: 48,
                    background: attrColor(computeOverall(selected)) + '33',
                    color: attrColor(computeOverall(selected)),
                    fontSize: 18,
                  }}>
                    {computeOverall(selected)}
                  </div>
                  <div className="text-sm text-muted mt-8">
                    <span className={`pos-pill pos-${selected.position}`}>{selected.position}</span>
                  </div>
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <AttrBar label="PAC" value={selected.attributes.pace} />
                <AttrBar label="SHO" value={selected.attributes.shooting} />
                <AttrBar label="PAS" value={selected.attributes.passing} />
                <AttrBar label="DEF" value={selected.attributes.defending} />
                <AttrBar label="PHY" value={selected.attributes.physicality} />
                {selected.position === 'GK' && <AttrBar label="GK" value={selected.attributes.goalkeeper} />}
              </div>
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                <div className="flex-between text-sm">
                  <span className="text-muted">Market Value</span>
                  <span style={{ color: '#2ea043', fontWeight: 600 }}>€{selected.market_value}M</span>
                </div>
                <div className="flex-between text-sm mt-8">
                  <span className="text-muted">Weekly Wage</span>
                  <span>€{selected.wage}k</span>
                </div>
                <div className="flex-between text-sm mt-8">
                  <span className="text-muted">Contract</span>
                  <span>{selected.contract_years_remaining} year{selected.contract_years_remaining !== 1 ? 's' : ''}</span>
                </div>
                {selected.is_transfer_listed && (
                  <div className="mt-8">
                    <span className="badge badge-yellow">Transfer Listed</span>
                  </div>
                )}
              </div>
              <button style={{ width: '100%', marginTop: 12 }} onClick={() => setSelected(null)}>
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
