import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { doc, getDoc, collection, getDocs, query, where, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import EventNav from '../components/EventNav'
import SaveConfirmation from '../components/SaveConfirmation'
import { secondsToHHMMSS, parseTimeInput, isValidTimeInput } from '../utils/timeUtils'

export default function Results() {
  const { id } = useParams()
  const [event, setEvent] = useState(null)
  const [teams, setTeams] = useState([])
  const [inputs, setInputs] = useState({})
  const [errors, setErrors] = useState({})
  const [saved, setSaved] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAll()
  }, [id])

  async function loadAll() {
    const [evSnap, teamsSnap] = await Promise.all([
      getDoc(doc(db, 'events', id)),
      getDocs(query(collection(db, 'teams'), where('eventId', '==', id))),
    ])
    if (evSnap.exists()) setEvent(evSnap.data())
    const ts = teamsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
    setTeams(ts)
    const initInputs = {}
    ts.forEach(t => { initInputs[t.id] = t.finishTimeSeconds != null ? secondsToHHMMSS(t.finishTimeSeconds) : '' })
    setInputs(initInputs)
    setLoading(false)
  }

  function handleInputChange(teamId, val) {
    setInputs(prev => ({ ...prev, [teamId]: val }))
    if (errors[teamId]) setErrors(prev => ({ ...prev, [teamId]: false }))
  }

  async function saveTime(team) {
    const raw = inputs[team.id] || ''
    if (raw === '') {
      await updateDoc(doc(db, 'teams', team.id), { finishTimeSeconds: null, rank: null })
      setTeams(ts => ts.map(t => t.id === team.id ? { ...t, finishTimeSeconds: null, rank: null } : t))
      setSaved(s => ({ ...s, [team.id]: (s[team.id] || 0) + 1 }))
      return
    }
    if (!isValidTimeInput(raw)) {
      setErrors(prev => ({ ...prev, [team.id]: true }))
      return
    }
    const seconds = parseTimeInput(raw)
    await updateDoc(doc(db, 'teams', team.id), { finishTimeSeconds: seconds })
    const updated = teams.map(t => t.id === team.id ? { ...t, finishTimeSeconds: seconds } : t)
    const ranked = computeRanks(updated)
    await Promise.all(ranked.map(t => updateDoc(doc(db, 'teams', t.id), { rank: t.rank })))
    setTeams(ranked)
    setSaved(s => ({ ...s, [team.id]: (s[team.id] || 0) + 1 }))
  }

  function computeRanks(allTeams) {
    const byCat = {}
    allTeams.forEach(t => {
      if (!byCat[t.categoryId]) byCat[t.categoryId] = []
      byCat[t.categoryId].push(t)
    })
    const result = []
    Object.values(byCat).forEach(catTeams => {
      const withTime = catTeams.filter(t => t.finishTimeSeconds != null).sort((a, b) => a.finishTimeSeconds - b.finishTimeSeconds)
      const withoutTime = catTeams.filter(t => t.finishTimeSeconds == null)
      withTime.forEach((t, i) => result.push({ ...t, rank: i + 1 }))
      withoutTime.forEach(t => result.push({ ...t, rank: null }))
    })
    return result
  }

  const [sortCol, setSortCol] = useState('bib')
  const [sortDir, setSortDir] = useState('asc')

  function handleSort(col) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  function sortTeams(list) {
    return [...list].sort((a, b) => {
      let v = 0
      if (sortCol === 'bib') v = (a.bibNumber || 0) - (b.bibNumber || 0)
      else if (sortCol === 'rank') {
        if (a.rank && b.rank) v = a.rank - b.rank
        else if (a.rank) v = -1
        else if (b.rank) v = 1
        else v = (a.bibNumber || 0) - (b.bibNumber || 0)
      } else if (sortCol === 'name') v = (a.name || '').localeCompare(b.name || '')
      else if (sortCol === 'time') {
        if (a.finishTimeSeconds != null && b.finishTimeSeconds != null) v = a.finishTimeSeconds - b.finishTimeSeconds
        else if (a.finishTimeSeconds != null) v = -1
        else if (b.finishTimeSeconds != null) v = 1
      }
      return sortDir === 'asc' ? v : -v
    })
  }

  function SortHeader({ col, children, style }) {
    const active = sortCol === col
    return (
      <th onClick={() => handleSort(col)} style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap', ...style }}>
        {children} <span style={{ opacity: active ? 1 : 0.3, fontSize: 10 }}>{active ? (sortDir === 'asc' ? '▲' : '▼') : '▲'}</span>
      </th>
    )
  }

  const waves = (event?.waves || []).filter(w => !w.isRestWave).sort((a, b) => a.startTime?.localeCompare(b.startTime))
  const hasAnyResult = teams.some(t => t.finishTimeSeconds != null)

  if (loading) return <div><EventNav id={id} /><p style={{ padding: 32, color: 'var(--color-text-muted)' }}>Loading...</p></div>

  return (
    <div>
      <EventNav id={id} eventName={event?.name} publicSlug={event?.publicSlug} />
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 8 }}>
          <h1 style={{ fontSize: 28 }}>Results</h1>
          {hasAnyResult && (
            <a href={`/event/${id}/leaderboard`} target="_blank" rel="noreferrer" style={{ ...btnSecondary, textDecoration: 'none' }}>
              View Leaderboard ↗
            </a>
          )}
        </div>

        {waves.map(wave => {
          const waveTeams = teams.filter(t => t.waveId === wave.id)
          if (waveTeams.length === 0) return null
          return (
            <div key={wave.id} style={{ marginBottom: 36 }}>
              <h3 style={{ fontSize: 16, marginBottom: 10, color: 'var(--color-text-muted)' }}>{wave.label} — {wave.startTime}</h3>
              <table>
                <thead>
                  <tr>
                    {hasAnyResult && <SortHeader col="rank" style={{ width: 50 }}>Rank</SortHeader>}
                    <SortHeader col="bib">Bib</SortHeader>
                    <SortHeader col="name">Name</SortHeader>
                    <th>Athlete(s)</th>
                    <SortHeader col="time">Finish Time (HH:MM:SS)</SortHeader>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {sortTeams(waveTeams).map(team => (
                    <tr key={team.id}>
                      {hasAnyResult && (
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: team.rank === 1 ? 'var(--color-warning)' : 'var(--color-text-muted)' }}>
                          {team.rank ? `#${team.rank}` : '—'}
                        </td>
                      )}
                      <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent)', fontWeight: 500 }}>{team.bibNumber}</td>
                      <td style={{ fontWeight: 600 }}>{team.name}</td>
                      <td style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                        {team.athlete1?.firstName} {team.athlete1?.lastName}
                        {team.athlete2?.firstName && <> / {team.athlete2.firstName}</>}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <input
                            value={inputs[team.id] || ''}
                            onChange={e => handleInputChange(team.id, e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && saveTime(team)}
                            onBlur={() => {
                              if (inputs[team.id] && !isValidTimeInput(inputs[team.id])) {
                                setErrors(prev => ({ ...prev, [team.id]: true }))
                              }
                            }}
                            placeholder="00:00:00"
                            style={{
                              ...timeInput,
                              borderColor: errors[team.id] ? 'var(--color-accent)' : 'var(--color-border)',
                            }}
                          />
                          {errors[team.id] && <span style={{ color: 'var(--color-accent)', fontSize: 11 }}>Invalid</span>}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <button onClick={() => saveTime(team)} style={btnSave}>Save</button>
                          <SaveConfirmation trigger={saved[team.id]} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        })}

        {waves.length === 0 && (
          <p style={{ color: 'var(--color-text-muted)' }}>No waves configured for this event.</p>
        )}
      </div>
    </div>
  )
}

const timeInput = { width: 110, padding: '6px 10px', background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)', fontFamily: 'var(--font-mono)', fontSize: 15, textAlign: 'center' }
const btnSave = { padding: '6px 16px', background: 'var(--color-accent)', color: '#fff', border: 'none', fontFamily: 'var(--font-heading)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer' }
const btnSecondary = { padding: '8px 18px', background: 'transparent', color: 'var(--color-text)', border: '1px solid var(--color-border)', fontFamily: 'var(--font-heading)', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', display: 'inline-block' }
