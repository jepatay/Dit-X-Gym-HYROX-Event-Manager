import { useEffect, useState } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { collection, onSnapshot, query, where, doc, getDocFromServer, getDocsFromServer, updateDoc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { secondsToHHMMSS, parseTimeInput } from '../utils/timeUtils'
import { WeightLabel } from '../utils/weightUtils'
import { BibRef } from '../components/BibRef'

function catLabel(team, config) {
  const cats = config?.categories
  if (!cats) return team.competitionName || ''
  // Match by stored categoryId (new teams)
  if (team.categoryId) {
    const cat = cats.find(c => c.id === team.categoryId)
    if (cat) return cat.label
  }
  // Match old teams by normalising label text (strips emoji/punctuation)
  const norm = s => (s || '').replace(/[^\w\s]/gu, '').toLowerCase().trim()
  const stored = norm(team.competitionName)
  if (stored) {
    const cat = cats.find(c => norm(c.label) === stored)
    if (cat) return cat.label
  }
  // Final fallback: strip emoji from stored name
  return (team.competitionName || '').replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').replace(/\s+/g, ' ').trim()
}

const BG      = '#0f1923'
const SURFACE = '#1e2d45'
const SURFACE2= '#243352'
const BORDER  = '#2d4060'
const ACCENT  = '#e8621a'
const TEXT     = '#f0f4f8'
const MUTED    = '#7a9abe'
const MUTED2   = '#5a7090'
const SUCCESS  = '#22c55e'
const GOLD     = '#f59e0b'

function timeStrToSecs(hhmm) {
  if (!hhmm) return Infinity
  const [h, m] = hhmm.split(':').map(Number)
  return h * 3600 + m * 60
}

function formatCountdown(diffSecs) {
  if (!isFinite(diffSecs) || diffSecs <= 0) return null
  const total = Math.ceil(diffSecs)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}

export default function AdminPage() {
  const { id } = useParams()
  const user = useAuth()
  const [event, setEvent] = useState(null)
  const [eventLoaded, setEventLoaded] = useState(false)
  const [teams, setTeams] = useState([])
  const [config, setConfig] = useState(null)
  const [time, setTime] = useState(new Date())
  const [tab, setTab] = useState(0)
  const [search, setSearch] = useState('')
  const [timeInputs, setTimeInputs] = useState({})
  const [saving, setSaving] = useState({})
  const [justSaved, setJustSaved] = useState({})

  useEffect(() => {
    async function freshLoad() {
      try {
        const teamsQuery = query(collection(db, 'teams'), where('eventId', '==', id))
        const [evSnap, teamsSnap, configSnap] = await Promise.all([
          getDocFromServer(doc(db, 'events', id)),
          getDocsFromServer(teamsQuery),
          getDoc(doc(db, 'config', 'main')),
        ])
        if (evSnap.exists()) setEvent({ id: evSnap.id, ...evSnap.data() })
        setTeams(teamsSnap.docs.map(d => ({ id: d.id, ...d.data() })))
        if (configSnap.exists()) setConfig(configSnap.data())
      } catch (_) {
      } finally {
        setEventLoaded(true)
      }
    }
    freshLoad()

    const unsubs = [
      onSnapshot(doc(db, 'events', id),
        snap => { if (snap.exists() && !snap.metadata.fromCache) setEvent({ id: snap.id, ...snap.data() }) },
        () => {},
      ),
      onSnapshot(
        query(collection(db, 'teams'), where('eventId', '==', id)),
        snap => { if (!snap.metadata.fromCache) setTeams(snap.docs.map(d => ({ id: d.id, ...d.data() }))) },
        () => {},
      ),
    ]
    const clock = setInterval(() => setTime(new Date()), 1000)
    return () => { unsubs.forEach(u => u()); clearInterval(clock) }
  }, [id])

  // Coaches (logged in) always get in. Everyone else needs the event's
  // organizer-controlled "no login" admin access switched on.
  if (user === undefined || !eventLoaded) {
    return <div style={{ background: BG, minHeight: '100vh' }} />
  }
  if (!event) {
    return <div style={{ background: BG, color: TEXT, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Event not found.</div>
  }
  if (!user && event.publicAdminEnabled !== true) {
    return <Navigate to="/login" replace />
  }

  const clockStr = time.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const nowHHMM = `${String(time.getHours()).padStart(2,'0')}:${String(time.getMinutes()).padStart(2,'0')}`
  const nowSecs = time.getHours() * 3600 + time.getMinutes() * 60 + time.getSeconds()

  const sortedTeams = [...teams].sort((a, b) =>
    (a.scheduledTime || '').localeCompare(b.scheduledTime || '') || (a.ref || '').localeCompare(b.ref || '')
  )

  // --- Check-in tab ---
  const filtered = sortedTeams.filter(t => {
    if (!search.trim()) return true
    const s = search.toLowerCase()
    return (
      (t.name || '').toLowerCase().includes(s) ||
      (t.ref || '').toLowerCase().includes(s) ||
      (t.athlete1?.firstName || '').toLowerCase().includes(s) ||
      (t.athlete1?.lastName || '').toLowerCase().includes(s)
    )
  })
  const notCheckedIn = filtered.filter(t => !t.checkedIn)
  const checkedIn = filtered.filter(t => t.checkedIn)

  async function toggleCheckIn(team) {
    const newVal = !team.checkedIn
    await updateDoc(doc(db, 'teams', team.id), {
      checkedIn: newVal,
      checkedInAt: newVal ? new Date().toISOString() : null,
    })
    setTeams(ts => ts.map(t => t.id === team.id ? { ...t, checkedIn: newVal, checkedInAt: newVal ? new Date().toISOString() : null } : t))
  }

  // --- Start tab: group by scheduledTime, show 15s grace after start ---
  // Time comparisons are only valid on the actual event day — on other days treat all slots as future.
  const isEventToday = event?.date === new Date().toISOString().substring(0, 10)

  const startGroups = (() => {
    const map = {}
    for (const t of sortedTeams) {
      const key = t.scheduledTime || ''
      if (!map[key]) map[key] = []
      map[key].push(t)
    }
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([slotTime, members]) => {
        // Use full date+time so countdown works on any day, not just today
        const slotMs = event?.date && slotTime
          ? new Date(`${event.date}T${slotTime}:00`).getTime()
          : null
        const diffSecs = slotMs != null ? (slotMs - time.getTime()) / 1000 : Infinity
        const started = diffSecs <= 0
        const graceOver = diffSecs < -15
        return { slotTime, members, diffSecs, started, graceOver }
      })
      .filter(g => !g.graceOver)
  })()

  // --- Results tab ---
  const startedTeams = (() => {
    if (!event?.date) return []
    return sortedTeams.filter(t => {
      if (!t.scheduledTime) return false
      return new Date(`${event.date}T${t.scheduledTime}:00`).getTime() <= time.getTime()
    })
  })()

  function adjustTime(team, deltaSecs) {
    const current = team.finishTimeSeconds != null ? team.finishTimeSeconds : 0
    const next = Math.max(0, current + deltaSecs)
    const str = secondsToHHMMSS(next)
    setTimeInputs(prev => ({ ...prev, [team.id]: str }))
    saveTime(team, str)
  }

  function captureNow(team) {
    const [sh, sm] = (team.scheduledTime || '00:00').split(':').map(Number)
    const startSecs = sh * 3600 + sm * 60
    const elapsed = Math.max(0, nowSecs - startSecs)
    const str = secondsToHHMMSS(elapsed)
    setTimeInputs(prev => ({ ...prev, [team.id]: str }))
    saveTime(team, str)
  }

  async function saveTime(team, timeStr) {
    const parsed = timeStr ? parseTimeInput(timeStr) : null
    setSaving(s => ({ ...s, [team.id]: true }))
    try {
      await updateDoc(doc(db, 'teams', team.id), { finishTimeSeconds: parsed ?? null })
      setTeams(ts => ts.map(t => t.id === team.id ? { ...t, finishTimeSeconds: parsed ?? null } : t))
      setJustSaved(s => ({ ...s, [team.id]: true }))
      setTimeout(() => setJustSaved(s => ({ ...s, [team.id]: false })), 2000)
    } finally {
      setSaving(s => ({ ...s, [team.id]: false }))
    }
  }

  function getInput(team) {
    if (team.id in timeInputs) return timeInputs[team.id]
    return team.finishTimeSeconds != null ? secondsToHHMMSS(team.finishTimeSeconds) : ''
  }

  const TABS = ['Check-In', 'Start', 'Results']

  return (
    <div style={{ background: BG, color: TEXT, minHeight: '100vh', fontFamily: 'Inter, sans-serif', maxWidth: 620, margin: '0 auto' }}>

      {/* Sticky header with clock */}
      <div style={{ background: SURFACE, borderBottom: `3px solid ${ACCENT}`, padding: '10px 16px', position: 'sticky', top: 0, zIndex: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: 11, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Admin</div>
            <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: 20, color: TEXT, lineHeight: 1.1 }}>{event?.name || '...'}</div>
          </div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontWeight: 700, fontSize: 32, color: ACCENT, lineHeight: 1 }}>{clockStr}</div>
        </div>
      </div>

      {/* Sticky tabs */}
      <div style={{ display: 'flex', borderBottom: `2px solid ${BORDER}`, background: '#192438', position: 'sticky', top: 68, zIndex: 19 }}>
        {TABS.map((label, i) => (
          <button
            key={i}
            onClick={() => setTab(i)}
            style={{
              flex: 1, padding: '13px 8px', background: 'transparent', border: 'none',
              borderBottom: tab === i ? `2px solid ${ACCENT}` : '2px solid transparent',
              marginBottom: -2,
              color: tab === i ? ACCENT : MUTED,
              fontFamily: 'Barlow Condensed, sans-serif', fontSize: 16, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.07em', cursor: 'pointer',
            }}
          >{label}</button>
        ))}
      </div>

      {/* ── Check-In Tab ── */}
      {tab === 0 && (
        <div>
          <div style={{ padding: '12px 16px', position: 'sticky', top: 116, zIndex: 18, background: BG, borderBottom: `1px solid ${BORDER}` }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or ref..."
              style={{ width: '100%', padding: '10px 14px', background: SURFACE, border: `1px solid ${BORDER}`, color: TEXT, fontSize: 15, boxSizing: 'border-box', borderRadius: 0 }}
            />
          </div>

          {notCheckedIn.length > 0 && (
            <div>
              <SectionHeader>{notCheckedIn.length} Not Checked In</SectionHeader>
              {notCheckedIn.map(team => (
                <CheckInRow key={team.id} team={team} config={config} onToggle={() => toggleCheckIn(team)} />
              ))}
            </div>
          )}

          {checkedIn.length > 0 && (
            <div>
              <SectionHeader style={{ color: SUCCESS }}>{checkedIn.length} Checked In ✓</SectionHeader>
              {checkedIn.map(team => (
                <CheckInRow key={team.id} team={team} config={config} checked onToggle={() => toggleCheckIn(team)} />
              ))}
            </div>
          )}

          {filtered.length === 0 && (
            <p style={{ padding: '32px 16px', color: MUTED2, textAlign: 'center' }}>No athletes found</p>
          )}
        </div>
      )}

      {/* ── Start Tab ── */}
      {tab === 1 && (
        <div>
          {startGroups.length === 0 && (
            <p style={{ padding: '32px 16px', color: MUTED2, textAlign: 'center' }}>No groups scheduled</p>
          )}
          {startGroups.map(({ slotTime, members, diffSecs, started }) => {
            const countdown = formatCountdown(diffSecs)
            return (
              <div key={slotTime} style={{ marginBottom: 0 }}>
                {/* Group header */}
                <div style={{
                  padding: '10px 16px',
                  background: started ? 'rgba(34,197,94,0.08)' : SURFACE2,
                  borderTop: `2px solid ${started ? SUCCESS : BORDER}`,
                  borderBottom: `1px solid ${started ? SUCCESS + '55' : BORDER}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontFamily: 'DM Mono, monospace', fontWeight: 700, fontSize: 20, color: started ? SUCCESS : TEXT }}>{slotTime}</span>
                    <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: MUTED2 }}>{members.length} team{members.length !== 1 ? 's' : ''}</span>
                  </div>
                  {started ? (
                    <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: SUCCESS }}>Started ✓</span>
                  ) : countdown ? (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontWeight: 700, fontSize: 22, color: diffSecs < 120 ? ACCENT : TEXT, lineHeight: 1 }}>{countdown}</div>
                      <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 10, color: MUTED2, textTransform: 'uppercase', letterSpacing: '0.08em' }}>to start</div>
                    </div>
                  ) : null}
                </div>
                {/* Members */}
                {members.map(team => (
                  <div key={team.id} style={{
                    borderBottom: `1px solid ${BORDER}`,
                    padding: '10px 16px',
                    display: 'flex', alignItems: 'center', gap: 12,
                    opacity: started ? 0.6 : 1,
                    background: team.checkedIn ? 'rgba(34,197,94,0.04)' : 'transparent',
                  }}>
                    <span style={{ fontFamily: 'DM Mono, monospace', fontWeight: 700, fontSize: 14, flexShrink: 0, minWidth: 52 }}><BibRef value={team.ref} bibNumber={team.bibNumber} color={ACCENT} /></span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.2 }}>{team.name}</div>
                      {catLabel(team, config) && <div style={{ fontSize: 11, color: ACCENT, fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{catLabel(team, config)}</div>}
                      <WeightLabel weight={team.weight} />
                      <div style={{ fontSize: 12, color: MUTED2, marginTop: 2 }}>
                        {team.athlete1?.firstName} {team.athlete1?.lastName}
                        {team.athlete2?.firstName && ` / ${team.athlete2.firstName}`}
                      </div>
                    </div>
                    {team.checkedIn && (
                      <span style={{ fontSize: 11, fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: SUCCESS, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', padding: '3px 8px', flexShrink: 0 }}>✓ IN</span>
                    )}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Results Tab ── */}
      {tab === 2 && (
        <div>
          <SectionHeader>Started athletes — tap to record finish time</SectionHeader>
          {startedTeams.length === 0 && (
            <p style={{ padding: '32px 16px', color: MUTED2, textAlign: 'center' }}>No athletes have started yet</p>
          )}
          {startedTeams.map(team => {
            const val = getInput(team)
            const isSaving = saving[team.id]
            const hasTime = team.finishTimeSeconds != null
            return (
              <div key={team.id} style={{ borderBottom: `1px solid ${BORDER}`, padding: '12px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                  <span style={{ fontFamily: 'DM Mono, monospace', fontWeight: 700, fontSize: 15, flexShrink: 0, minWidth: 56 }}><BibRef value={team.ref} bibNumber={team.bibNumber} color={ACCENT} /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{team.name}</div>
                    <div style={{ fontSize: 12, color: MUTED2 }}>
                      {team.athlete1?.firstName} {team.athlete1?.lastName}
                      {team.athlete2?.firstName && ` / ${team.athlete2.firstName}`}
                    </div>
                    <WeightLabel weight={team.weight} />
                  </div>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: MUTED2, flexShrink: 0 }}>Start: {team.scheduledTime}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button
                    onClick={() => captureNow(team)}
                    style={{
                      padding: '10px 16px', background: ACCENT, color: '#fff', border: 'none',
                      fontFamily: 'Barlow Condensed, sans-serif', fontSize: 15, fontWeight: 700,
                      textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', flexShrink: 0,
                    }}
                  >NOW</button>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <input
                      value={val}
                      onChange={e => setTimeInputs(prev => ({ ...prev, [team.id]: e.target.value }))}
                      onBlur={e => saveTime(team, e.target.value)}
                      placeholder="HH:MM:SS"
                      style={{ width: '100%', padding: '10px 12px', paddingRight: justSaved[team.id] ? 36 : 12, background: SURFACE, border: `1px solid ${hasTime ? SUCCESS : BORDER}`, color: hasTime ? SUCCESS : TEXT, fontFamily: 'DM Mono, monospace', fontSize: 15, fontWeight: hasTime ? 700 : 400, boxSizing: 'border-box' }}
                    />
                    {justSaved[team.id] && (
                      <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: SUCCESS, fontSize: 18, fontWeight: 700, pointerEvents: 'none' }}>✓</span>
                    )}
                  </div>
                  {hasTime && (
                    <>
                      <button onClick={() => adjustTime(team, -1)} style={btnAdjust}>−</button>
                      <button onClick={() => adjustTime(team, +1)} style={btnAdjust}>+</button>
                    </>
                  )}
                  {isSaving && <span style={{ fontSize: 12, color: MUTED2, flexShrink: 0 }}>Saving...</span>}
                </div>
              </div>
            )
          })}

          {/* Teams not yet started — show below as dimmed */}
          {(() => {
            const notStarted = sortedTeams.filter(t => (t.scheduledTime || '99:99') > nowHHMM)
            if (notStarted.length === 0) return null
            return (
              <div>
                <SectionHeader style={{ color: MUTED2 }}>Not yet started ({notStarted.length})</SectionHeader>
                {notStarted.map(team => (
                  <div key={team.id} style={{ borderBottom: `1px solid ${BORDER}`, padding: '10px 16px', opacity: 0.5, display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ fontFamily: 'DM Mono, monospace', fontWeight: 700, fontSize: 14, flexShrink: 0, minWidth: 56 }}><BibRef value={team.ref} bibNumber={team.bibNumber} color={MUTED} /></span>
                    <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: MUTED2, flexShrink: 0 }}>{team.scheduledTime}</span>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{team.name}</span>
                    <WeightLabel weight={team.weight} />
                  </div>
                ))}
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}

function SectionHeader({ children, style }) {
  return (
    <div style={{ padding: '8px 16px', background: SURFACE2, borderBottom: `1px solid ${BORDER}`, borderTop: `1px solid ${BORDER}`, fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.08em', color: MUTED, ...style }}>
      {children}
    </div>
  )
}

function CheckInRow({ team, checked, config, onToggle }) {
  return (
    <div
      onClick={onToggle}
      style={{ borderBottom: `1px solid ${BORDER}`, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', background: checked ? 'rgba(34,197,94,0.05)' : 'transparent', userSelect: 'none' }}
    >
      <span style={{ fontFamily: 'DM Mono, monospace', fontWeight: 700, fontSize: 15, flexShrink: 0, minWidth: 56 }}><BibRef value={team.ref} bibNumber={team.bibNumber} color={ACCENT} /></span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 15, lineHeight: 1.2 }}>{team.name}</div>
        {catLabel(team, config) && <div style={{ fontSize: 11, color: ACCENT, fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 1 }}>{catLabel(team, config)}</div>}
        <WeightLabel weight={team.weight} />
        <div style={{ fontSize: 12, color: MUTED2, marginTop: 2 }}>
          {team.scheduledTime && <span style={{ fontFamily: 'DM Mono, monospace' }}>{team.scheduledTime} · </span>}
          {team.athlete1?.firstName} {team.athlete1?.lastName}
          {team.athlete2?.firstName && ` / ${team.athlete2.firstName}`}
        </div>
      </div>
      {checked
        ? <span style={{ fontSize: 11, fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: SUCCESS, background: 'rgba(34,197,94,0.12)', border: `1px solid rgba(34,197,94,0.3)`, padding: '3px 8px', flexShrink: 0 }}>✓ IN</span>
        : <div style={{ width: 28, height: 28, border: `2px solid ${BORDER}`, flexShrink: 0 }} />
      }
    </div>
  )
}

const btnAdjust = {
  width: 40, height: 40, borderRadius: '50%', border: `2px solid #f59e0b`,
  background: 'transparent', color: '#f59e0b', fontSize: 22, fontWeight: 700,
  cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
  lineHeight: 1, padding: 0,
}
