import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { doc, getDoc, collection, getDocs, query, where, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import NavBar from '../components/NavBar'

const FILTERS = ['All', 'Checked In', 'Not Yet', 'No-shows']

export default function CheckIn() {
  const { id } = useParams()
  const [event, setEvent] = useState(null)
  const [teams, setTeams] = useState([])
  const [filter, setFilter] = useState('All')
  const [partnerModal, setPartnerModal] = useState(null)
  const [partnerForm, setPartnerForm] = useState({ firstName: '', lastName: '', email: '' })
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
    setTeams(teamsSnap.docs.map(d => ({ id: d.id, ...d.data() })))
    setLoading(false)
  }

  async function checkIn(team) {
    const isDouble = team.athlete2 !== undefined
    if (isDouble && !team.athlete2Confirmed) {
      setPartnerModal(team)
      setPartnerForm({ firstName: '', lastName: '', email: '' })
      return
    }
    await performCheckIn(team.id)
  }

  async function performCheckIn(teamId, extraData = {}) {
    const update = { checkedIn: true, checkedInAt: serverTimestamp(), ...extraData }
    await updateDoc(doc(db, 'teams', teamId), update)
    setTeams(ts => ts.map(t => t.id === teamId ? { ...t, ...update, checkedInAt: new Date() } : t))
  }

  async function undoCheckIn(teamId) {
    await updateDoc(doc(db, 'teams', teamId), { checkedIn: false, checkedInAt: null })
    setTeams(ts => ts.map(t => t.id === teamId ? { ...t, checkedIn: false, checkedInAt: null } : t))
  }

  async function confirmPartner() {
    const team = partnerModal
    await performCheckIn(team.id, {
      athlete2: { ...partnerForm },
      athlete2Confirmed: true,
    })
    setPartnerModal(null)
  }

  const now = new Date()

  function getFilteredTeams(waveTeams) {
    switch (filter) {
      case 'Checked In': return waveTeams.filter(t => t.checkedIn)
      case 'Not Yet': return waveTeams.filter(t => !t.checkedIn)
      case 'No-shows': return waveTeams.filter(t => {
        if (t.checkedIn) return false
        const [h, m] = (t.scheduledTime || '00:00').split(':').map(Number)
        const slotDate = new Date()
        slotDate.setHours(h, m, 0, 0)
        return now > slotDate
      })
      default: return waveTeams
    }
  }

  const waves = (event?.waves || []).filter(w => !w.isRestWave).sort((a, b) => a.startTime?.localeCompare(b.startTime))
  const checkedInCount = teams.filter(t => t.checkedIn).length

  if (loading) return <div><NavBar /><p style={{ padding: 32, color: 'var(--color-text-muted)' }}>Loading...</p></div>

  return (
    <div>
      <NavBar />
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
          <div>
            <Link to={`/event/${id}`} style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-heading)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              ← {event?.name || 'Event'}
            </Link>
            <h1 style={{ fontSize: 28, marginTop: 4 }}>Check-in</h1>
          </div>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 28,
            color: checkedInCount === teams.length && teams.length > 0 ? 'var(--color-success)' : 'var(--color-text)',
          }}>
            {checkedInCount} / {teams.length}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '1px solid var(--color-border)', paddingBottom: 0 }}>
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '8px 16px',
                background: 'transparent',
                border: 'none',
                borderBottom: filter === f ? '2px solid var(--color-accent)' : '2px solid transparent',
                color: filter === f ? 'var(--color-text)' : 'var(--color-text-muted)',
                fontFamily: 'var(--font-heading)',
                fontSize: 13,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                cursor: 'pointer',
                marginBottom: -1,
              }}
            >{f}</button>
          ))}
        </div>

        {waves.map(wave => {
          const waveTeams = getFilteredTeams(teams.filter(t => t.waveId === wave.id).sort((a, b) => a.bibNumber - b.bibNumber))
          if (waveTeams.length === 0) return null
          return (
            <div key={wave.id} style={{ marginBottom: 32 }}>
              <h3 style={{ fontSize: 16, marginBottom: 10, color: 'var(--color-text-muted)' }}>
                {wave.label} — {wave.startTime}
              </h3>
              <table>
                <thead>
                  <tr>
                    <th>Bib</th>
                    <th>Name</th>
                    <th>Time</th>
                    <th>Athlete(s)</th>
                    <th>Status</th>
                    <th style={{ width: 160 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {waveTeams.map(team => (
                    <tr key={team.id} style={{ background: team.checkedIn ? 'rgba(34,197,94,0.04)' : 'transparent' }}>
                      <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent)', fontWeight: 500 }}>{team.bibNumber}</td>
                      <td style={{ fontWeight: 600 }}>{team.name}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{team.scheduledTime}</td>
                      <td style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                        {team.athlete1?.firstName} {team.athlete1?.lastName}
                        {team.athlete2?.firstName && <> / {team.athlete2.firstName} {team.athlete2.lastName}</>}
                      </td>
                      <td>
                        {team.checkedIn
                          ? <span style={{ color: 'var(--color-success)', fontFamily: 'var(--font-heading)', fontSize: 11, textTransform: 'uppercase' }}>✓ Checked In</span>
                          : <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>Pending</span>
                        }
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 8 }}>
                          {team.checkedIn ? (
                            <button onClick={() => undoCheckIn(team.id)} style={btnUndo}>Undo</button>
                          ) : (
                            <button onClick={() => checkIn(team)} style={btnCheckIn}>Check In</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        })}
      </div>

      {partnerModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500,
        }}>
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', padding: 32, width: '100%', maxWidth: 440 }}>
            <h3 style={{ fontSize: 20, marginBottom: 4 }}>Partner Details Required</h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginBottom: 20 }}>
              Athlete 2 for <strong>{partnerModal.name}</strong> has not been confirmed yet.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              <input value={partnerForm.firstName} onChange={e => setPartnerForm(f => ({ ...f, firstName: e.target.value }))} placeholder="First name" style={inputStyle} />
              <input value={partnerForm.lastName} onChange={e => setPartnerForm(f => ({ ...f, lastName: e.target.value }))} placeholder="Last name" style={inputStyle} />
              <input value={partnerForm.email} onChange={e => setPartnerForm(f => ({ ...f, email: e.target.value }))} placeholder="Email" type="email" style={inputStyle} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={confirmPartner} disabled={!partnerForm.firstName} style={btnPrimary}>Confirm & Check In</button>
              <button onClick={() => setPartnerModal(null)} style={btnSecondary}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const inputStyle = { width: '100%', padding: '10px 12px', background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)', fontSize: 14 }
const btnPrimary = { padding: '10px 20px', background: 'var(--color-accent)', color: '#fff', border: 'none', fontFamily: 'var(--font-heading)', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer' }
const btnSecondary = { padding: '10px 20px', background: 'transparent', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)', fontFamily: 'var(--font-heading)', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer' }
const btnCheckIn = { padding: '6px 16px', background: 'var(--color-accent)', color: '#fff', border: 'none', fontFamily: 'var(--font-heading)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer' }
const btnUndo = { padding: '6px 16px', background: 'transparent', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)', fontFamily: 'var(--font-heading)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer' }
