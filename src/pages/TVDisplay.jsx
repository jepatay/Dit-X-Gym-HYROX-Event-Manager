import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { collection, onSnapshot, query, where, doc, getDocFromServer, getDocsFromServer } from 'firebase/firestore'
import { QRCodeSVG } from 'qrcode.react'
import { db } from '../firebase'
import { secondsToHHMMSS } from '../utils/timeUtils'

const BG      = '#0f1923'
const SURFACE = '#1e2d45'
const SURFACE2= '#243352'
const BORDER  = '#2d4060'
const BORDER2 = '#1a2840'
const ACCENT  = '#e8621a'
const TEXT    = '#f0f4f8'
const MUTED   = '#7a9abe'
const MUTED2  = '#5a7090'
const SUCCESS = '#22c55e'
const GOLD    = '#f59e0b'
const SILVER  = '#9ca3af'
const BRONZE  = '#b45309'

export default function TVDisplay() {
  const { id } = useParams()
  const [event, setEvent]   = useState(null)
  const [teams, setTeams]   = useState([])
  const [config, setConfig] = useState(null)
  const [time, setTime]     = useState(new Date())
  const [fullscreen, setFullscreen] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)

  useEffect(() => {
    // Force fresh server data on initial load — bypasses IndexedDB cache
    async function freshLoad() {
      try {
        const teamsQuery = query(collection(db, 'teams'), where('eventId', '==', id))
        const [evSnap, teamsSnap, configSnap] = await Promise.all([
          getDocFromServer(doc(db, 'events', id)),
          getDocsFromServer(teamsQuery),
          getDocFromServer(doc(db, 'config', 'main')),
        ])
        if (evSnap.exists()) { setEvent(evSnap.data()); setLastUpdated(new Date()) }
        setTeams(teamsSnap.docs.map(d => ({ id: d.id, ...d.data() })))
        if (configSnap.exists()) setConfig(configSnap.data())
      } catch (_) {}
    }
    freshLoad()

    // Real-time listener for ongoing updates after initial load
    const unsubs = [
      onSnapshot(doc(db, 'events', id),
        snap => { if (snap.exists() && !snap.metadata.fromCache) { setEvent(snap.data()); setLastUpdated(new Date()) } },
        () => {},
      ),
      onSnapshot(
        query(collection(db, 'teams'), where('eventId', '==', id)),
        snap => { if (!snap.metadata.fromCache) setTeams(snap.docs.map(d => ({ id: d.id, ...d.data() }))) },
        () => {},
      ),
      onSnapshot(doc(db, 'config', 'main'),
        snap => { if (snap.exists() && !snap.metadata.fromCache) setConfig(snap.data()) },
        () => {},
      ),
    ]
    const clock = setInterval(() => setTime(new Date()), 1000)
    return () => { unsubs.forEach(u => u()); clearInterval(clock) }
  }, [id])

  useEffect(() => {
    const handler = () => setFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  function toggleFullscreen() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen()
    else document.exitFullscreen()
  }

  if (!event) return (
    <div style={{ background: BG, width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: MUTED, fontFamily: 'Barlow Condensed, sans-serif', fontSize: 24, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Loading...</p>
    </div>
  )

  const now = `${String(time.getHours()).padStart(2,'0')}:${String(time.getMinutes()).padStart(2,'0')}`
  const isToday = event.date === new Date().toISOString().slice(0, 10)

  const hasWaves = (event.waves || []).length > 0
  const validWaveIds = new Set((event.waves || []).map(w => w.id))
  const validTeams = hasWaves
    ? teams.filter(t => !t.waveId || validWaveIds.has(t.waveId))
    : teams

  const allSorted = [...validTeams].sort((a, b) =>
    (a.scheduledTime || '').localeCompare(b.scheduledTime || '') || (a.ref || '').localeCompare(b.ref || '') || (a.bibNumber || 0) - (b.bibNumber || 0)
  )

  const thirtyMinsAhead = (() => {
    const d = new Date(time); d.setMinutes(d.getMinutes() + 30)
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
  })()
  let nextAthletes
  if (isToday) {
    const inWindow = allSorted.filter(t => {
      const st = t.scheduledTime || '99:99'
      return st >= now && st <= thirtyMinsAhead
    })
    nextAthletes = inWindow.length > 0 ? inWindow : allSorted.filter(t => (t.scheduledTime || '99:99') >= now).slice(0, 20)
  } else {
    nextAthletes = allSorted.slice(0, 20)
  }

  const recentFinishers = [...validTeams]
    .filter(t => t.finishTimeSeconds != null)
    .sort((a, b) => b.finishTimeSeconds - a.finishTimeSeconds)
    .slice(0, 20)

  const staff = (config?.staff || []).filter(s => (event.selectedStaffIds || []).includes(s.id))
  const baseUrl = import.meta.env.VITE_PUBLIC_BASE_URL || window.location.origin
  const publicUrl = event.publicSlug ? `${baseUrl}/e/${event.publicSlug}` : ''
  const clockStr = time.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  return (
    <div style={{ background: BG, color: TEXT, width: '100vw', height: '100vh', overflow: 'hidden', fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column' }}>

      {/* ── Header ── */}
      <div style={{ background: SURFACE, borderBottom: `3px solid ${ACCENT}`, padding: '0 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 68, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 18 }}>
          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: 14, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.12em' }}>DIT X-GYM</span>
          <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: 30, textTransform: 'uppercase', letterSpacing: '0.04em', color: TEXT, margin: 0 }}>{event.name}</h1>
          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 14, color: MUTED }}>{event.date}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: 56, color: TEXT, lineHeight: 1, letterSpacing: '-0.01em' }}>{clockStr}</span>
          <button onClick={toggleFullscreen} style={{ background: 'transparent', border: `1px solid ${BORDER}`, color: MUTED, padding: '6px 14px', cursor: 'pointer', fontFamily: 'Barlow Condensed, sans-serif', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {fullscreen ? '⊠ Exit' : '⊡ Fullscreen'}
          </button>
        </div>
      </div>

      {/* ── 3-column grid ── */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '5fr 5fr 3fr', gap: 2, background: BORDER2, overflow: 'hidden', minHeight: 0 }}>

        {/* Panel 1 — Next Up */}
        <Panel title="Next To Start" subtitle={isToday ? `next 30 min from ${now}` : event.date}>
          {nextAthletes.length === 0 ? (
            <Empty>No upcoming starts</Empty>
          ) : <>
            <Row header>
              <Cell w={56} muted>Ref</Cell>
              <Cell w={48} muted>Time</Cell>
              <Cell flex muted>Team</Cell>
              <Cell w={80} muted right>Status</Cell>
            </Row>
            {nextAthletes.map(team => (
              <Row key={team.id}>
                <Cell w={56} accent mono bold size={14}>{team.ref || team.bibNumber}</Cell>
                <Cell w={48} muted mono size={12}>{team.scheduledTime}</Cell>
                <Cell flex>
                  <div style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.2 }}>{team.name}</div>
                  {team.competitionName && (
                    <div style={{ fontSize: 10, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 1 }}>{team.competitionName}</div>
                  )}
                  <div style={{ fontSize: 11, color: MUTED2, marginTop: 1 }}>
                    {team.athlete1?.firstName} {team.athlete1?.lastName}
                    {team.athlete2?.firstName && ` / ${team.athlete2.firstName}`}
                  </div>
                </Cell>
                <Cell w={80} right>
                  {team.checkedIn
                    ? <Badge color={SUCCESS}>✓ In</Badge>
                    : <Badge color={MUTED2}>Pending</Badge>}
                </Cell>
              </Row>
            ))}
          </>}
        </Panel>

        {/* Panel 2 — Recent Finishers */}
        <Panel title="Results" subtitle="most recent">
          {recentFinishers.length === 0 ? (
            <Empty>No results yet</Empty>
          ) : <>
            <Row header>
              <Cell w={56} muted>Ref</Cell>
              <Cell flex muted>Athlete</Cell>
              <Cell w={80} muted right>Time</Cell>
            </Row>
            {recentFinishers.map(team => (
              <Row key={team.id}>
                <Cell w={56} accent mono bold size={14}>{team.ref || team.bibNumber}</Cell>
                <Cell flex>
                  <div style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.2 }}>{team.name}</div>
                  <div style={{ fontSize: 11, color: MUTED2, marginTop: 1 }}>
                    {team.athlete1?.firstName} {team.athlete1?.lastName}
                    {team.athlete2?.firstName && ` / ${team.athlete2.firstName}`}
                  </div>
                  {team.weight && <div style={{ fontSize: 10, color: GOLD, fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 1 }}>{team.weight}</div>}
                </Cell>
                <Cell w={80} mono bold size={13} right style={{ color: SUCCESS }}>{secondsToHHMMSS(team.finishTimeSeconds)}</Cell>
              </Row>
            ))}
          </>}
        </Panel>

        {/* Panel 3 — QR + Staff */}
        <div style={{ background: BG, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* QR */}
          <div style={{ padding: '16px', borderBottom: `1px solid ${BORDER}`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', color: ACCENT }}>Scan to follow live</span>
            {publicUrl
              ? <div style={{ background: '#fff', padding: 10 }}><QRCodeSVG value={publicUrl} size={120} bgColor="#ffffff" fgColor="#000000" level="M" /></div>
              : <p style={{ color: MUTED2, fontSize: 12 }}>No public URL</p>}
          </div>

          {/* Staff */}
          <div style={{ padding: '14px 16px', flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: 16, textTransform: 'uppercase', letterSpacing: '0.08em', color: ACCENT, paddingBottom: 8, borderBottom: `2px solid ${ACCENT}`, marginBottom: 10, flexShrink: 0 }}>Staff</div>
            {staff.length === 0
              ? <Empty>No staff assigned</Empty>
              : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {staff.map(s => (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {s.photoUrl
                        ? <img src={s.photoUrl} alt={s.name} style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                        : <div style={{ width: 38, height: 38, borderRadius: '50%', background: SURFACE2, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: MUTED2, fontSize: 16 }}>?</div>}
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>{s.name}</div>
                        {(s.role || s.station) && <div style={{ fontSize: 11, color: MUTED2, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{[s.role, s.station].filter(Boolean).join(' · ')}</div>}
                      </div>
                    </div>
                  ))}
                </div>}
          </div>
        </div>
      </div>

      {/* ── Live indicator ── */}
      <div style={{ position: 'fixed', bottom: 8, right: 14, fontSize: 10, color: BORDER, fontFamily: 'DM Mono, monospace', pointerEvents: 'none' }}>
        {lastUpdated ? `Live · updated ${lastUpdated.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : ''}
      </div>
    </div>
  )
}

/* ── small layout helpers ── */

function Panel({ title, subtitle, children }) {
  return (
    <div style={{ background: BG, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px 10px', borderBottom: `2px solid ${ACCENT}`, flexShrink: 0 }}>
        <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, fontSize: 22, textTransform: 'uppercase', letterSpacing: '0.06em', color: ACCENT }}>{title}</span>
        {subtitle && <span style={{ marginLeft: 10, fontSize: 11, color: MUTED2, fontFamily: 'DM Mono, monospace' }}>{subtitle}</span>}
      </div>
      <div style={{ flex: 1, padding: '10px 20px', overflowY: 'hidden' }}>
        {children}
      </div>
    </div>
  )
}

function Row({ children, header, compact, tight }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: tight ? '2px 0' : compact ? '5px 0' : '8px 0',
      borderBottom: header ? `1px solid ${BORDER}` : `1px solid ${BORDER2}`,
      marginBottom: header ? 4 : 0,
    }}>
      {children}
    </div>
  )
}

function Cell({ children, w, flex, muted, accent, mono, bold, size, right, compact, style }) {
  return (
    <div style={{
      width: w, flex: flex ? 1 : undefined, minWidth: 0,
      color: muted ? MUTED2 : accent ? ACCENT : undefined,
      fontFamily: mono ? 'DM Mono, monospace' : undefined,
      fontWeight: bold ? 700 : undefined,
      fontSize: size,
      textAlign: right ? 'right' : undefined,
      flexShrink: w ? 0 : undefined,
      ...style,
    }}>
      {children}
    </div>
  )
}

function Badge({ children, color }) {
  return (
    <span style={{ fontSize: 11, color, fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
      {children}
    </span>
  )
}

function Empty({ children }) {
  return <p style={{ color: MUTED2, fontSize: 13, fontFamily: 'DM Mono, monospace', padding: '12px 0' }}>{children}</p>
}
