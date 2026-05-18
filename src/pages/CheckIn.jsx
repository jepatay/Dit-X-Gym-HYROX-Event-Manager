import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { doc, getDoc, collection, getDocs, query, where, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import EventNav from '../components/EventNav'
import { BibRef } from '../components/BibRef'

const FILTERS = ['All', 'Not Yet', 'Checked In', 'No-shows']

export default function CheckIn() {
  const { id } = useParams()
  const [event, setEvent] = useState(null)
  const [teams, setTeams] = useState([])
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [partnerModal, setPartnerModal] = useState(null)
  const [partnerForm, setPartnerForm] = useState({ firstName: '', lastName: '', email: '' })
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadAll() }, [id])

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
    if (isDouble && !team.athlete2Confirmed && !team.athlete2?.firstName) {
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
    await performCheckIn(partnerModal.id, {
      athlete2: { ...partnerForm },
      athlete2Confirmed: true,
    })
    setPartnerModal(null)
  }

  const now = new Date()
  const checkedInCount = teams.filter(t => t.checkedIn).length

  function applyFilter(list) {
    let filtered = list
    if (filter === 'Checked In') filtered = filtered.filter(t => t.checkedIn)
    else if (filter === 'Not Yet') filtered = filtered.filter(t => !t.checkedIn)
    else if (filter === 'No-shows') filtered = filtered.filter(t => {
      if (t.checkedIn) return false
      const [h, m] = (t.scheduledTime || '00:00').split(':').map(Number)
      const slotDate = new Date(); slotDate.setHours(h, m, 0, 0)
      return now > slotDate
    })
    if (search.trim()) {
      const q = search.toLowerCase()
      filtered = filtered.filter(t =>
        (t.ref || '').toLowerCase().includes(q) ||
        String(t.bibNumber).includes(q) ||
        (t.name || '').toLowerCase().includes(q) ||
        (t.competitionName || '').toLowerCase().includes(q) ||
        (t.athlete1?.firstName || '').toLowerCase().includes(q) ||
        (t.athlete1?.lastName || '').toLowerCase().includes(q) ||
        (t.athlete2?.firstName || '').toLowerCase().includes(q) ||
        (t.athlete2?.lastName || '').toLowerCase().includes(q)
      )
    }
    return filtered
  }

  const waves = (event?.waves || []).filter(w => !w.isRestWave).sort((a, b) => a.startTime?.localeCompare(b.startTime))

  if (loading) return <div><EventNav id={id} /><p style={{ padding: 32, color: 'var(--color-text-muted)' }}>Loading...</p></div>

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 40 }}>
      <EventNav id={id} eventName={event?.name} publicSlug={event?.publicSlug} />
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '16px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 24, marginTop: 2 }}>Check-in</h1>
          </div>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 36,
            fontWeight: 700,
            color: checkedInCount === teams.length && teams.length > 0 ? 'var(--color-success)' : 'var(--color-text)',
            lineHeight: 1,
            textAlign: 'right',
          }}>
            {checkedInCount}
            <div style={{ fontSize: 13, color: 'var(--color-text-muted)', fontFamily: 'var(--font-heading)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>of {teams.length}</div>
          </div>
        </div>

        {/* Search */}
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by bib, name or athlete..."
          style={{
            width: '100%',
            padding: '12px 14px',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text)',
            fontSize: 16,
            marginBottom: 12,
            borderRadius: 0,
          }}
        />

        {/* Filter tabs */}
        <div className="hide-scrollbar" style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '1px solid var(--color-border)', overflowX: 'auto' }}>
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '10px 16px',
              background: 'transparent',
              border: 'none',
              borderBottom: filter === f ? '2px solid var(--color-accent)' : '2px solid transparent',
              color: filter === f ? 'var(--color-text)' : 'var(--color-text-muted)',
              fontFamily: 'var(--font-heading)',
              fontSize: 12,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              cursor: 'pointer',
              marginBottom: -1,
              whiteSpace: 'nowrap',
            }}>{f}</button>
          ))}
        </div>

        {/* Wave sections */}
        {waves.map(wave => {
          const waveTeams = applyFilter(teams.filter(t => t.waveId === wave.id).sort((a, b) => (a.ref || '').localeCompare(b.ref || '') || a.bibNumber - b.bibNumber))
          if (waveTeams.length === 0) return null
          return (
            <div key={wave.id} style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 12, fontFamily: 'var(--font-heading)', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-text-muted)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                {wave.label} <span style={{ fontFamily: 'var(--font-mono)' }}>{wave.startTime}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {waveTeams.map(team => (
                  <div key={team.id} style={{
                    background: team.checkedIn ? 'rgba(34,197,94,0.07)' : 'var(--color-surface)',
                    border: `1px solid ${team.checkedIn ? 'rgba(34,197,94,0.25)' : 'var(--color-border)'}`,
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                  }}>
                    {/* Ref */}
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 18, minWidth: 52, lineHeight: 1 }}>
                      <BibRef value={team.ref} bibNumber={team.bibNumber} color="var(--color-accent)" />
                    </div>
                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 16, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{team.name}</div>
                      {team.competitionName && (
                        <div style={{ fontSize: 11, color: 'var(--color-accent)', fontFamily: 'var(--font-heading)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 2 }}>{team.competitionName}</div>
                      )}
                      <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {team.athlete1?.firstName} {team.athlete1?.lastName}
                        {team.athlete2?.firstName && ` / ${team.athlete2.firstName} ${team.athlete2.lastName}`}
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{team.scheduledTime}</div>
                    </div>
                    {/* Action */}
                    {team.checkedIn ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: 'var(--color-success)', fontFamily: 'var(--font-heading)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>✓ In</span>
                        <button onClick={() => undoCheckIn(team.id)} style={btnUndo}>Undo</button>
                      </div>
                    ) : (
                      <button onClick={() => checkIn(team)} style={btnCheckIn}>
                        Check In
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Partner modal */}
      {partnerModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 500 }}>
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', padding: 24, width: '100%', maxWidth: 500, borderRadius: '8px 8px 0 0' }}>
            <h3 style={{ fontSize: 18, marginBottom: 4 }}>Partner Details</h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginBottom: 20 }}>
              Enter Athlete 2 for <strong>{partnerModal.name}</strong>
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              <input value={partnerForm.firstName} onChange={e => setPartnerForm(f => ({ ...f, firstName: e.target.value }))} placeholder="First name" style={inputStyle} />
              <input value={partnerForm.lastName} onChange={e => setPartnerForm(f => ({ ...f, lastName: e.target.value }))} placeholder="Last name" style={inputStyle} />
              <input value={partnerForm.email} onChange={e => setPartnerForm(f => ({ ...f, email: e.target.value }))} placeholder="Email (optional)" type="email" style={inputStyle} />
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

const inputStyle = { width: '100%', padding: '12px 14px', background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)', fontSize: 16, borderRadius: 0 }
const btnPrimary = { flex: 1, padding: '12px 20px', background: 'var(--color-accent)', color: '#fff', border: 'none', fontFamily: 'var(--font-heading)', fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer' }
const btnSecondary = { padding: '12px 20px', background: 'transparent', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)', fontFamily: 'var(--font-heading)', fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer' }
const btnCheckIn = { padding: '14px 18px', background: 'var(--color-accent)', color: '#fff', border: 'none', fontFamily: 'var(--font-heading)', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }
const btnUndo = { padding: '6px 12px', background: 'transparent', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)', fontFamily: 'var(--font-heading)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', whiteSpace: 'nowrap' }
