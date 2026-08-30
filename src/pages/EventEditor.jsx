import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  doc, getDoc, setDoc, collection, getDocs, query, where,
  addDoc, serverTimestamp, deleteDoc, updateDoc,
} from 'firebase/firestore'
import { db } from '../firebase'
import NavBar from '../components/NavBar'
import CalendarPicker from '../components/CalendarPicker'
import ChecklistPanel from '../components/ChecklistPanel'
import TeamForm from '../components/TeamForm'
import SaveConfirmation from '../components/SaveConfirmation'
import { generateSlug } from '../utils/slugUtils'
import { getOrCreateConfig, buildDefaultStations, getCategoryAverages } from '../utils/firestoreUtils'
import { secondsToHHMMSS } from '../utils/timeUtils'

const TABS = ['Info', 'Teams', 'Checklist', 'Event Setup', 'Overlap Risk']

export default function EventEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = id === 'new'

  const [tab, setTab] = useState(0)
  const [config, setConfig] = useState(null)
  const [saved, setSaved] = useState(0)
  const [eventId, setEventId] = useState(isNew ? null : id)

  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [eventType, setEventType] = useState('Full HYROX')
  const [links, setLinks] = useState([])
  const [waves, setWaves] = useState([])
  const [lanes, setLanes] = useState(4)
  const [timeSlots, setTimeSlots] = useState([])
  const [checklist, setChecklist] = useState({})
  const [maps, setMaps] = useState({})
  const [selectedStaffIds, setSelectedStaffIds] = useState([])
  const [stationOverrides, setStationOverrides] = useState({})
  const [publicSlug, setPublicSlug] = useState('')
  const [publicAdminEnabled, setPublicAdminEnabled] = useState(false)
  const [publicChecklistEnabled, setPublicChecklistEnabled] = useState(false)

  useEffect(() => {
    getOrCreateConfig().then(setConfig)
    if (!isNew) loadEvent()
  }, [id])

  async function loadEvent() {
    const snap = await getDoc(doc(db, 'events', id))
    if (!snap.exists()) return
    const d = snap.data()
    setName(d.name || '')
    setDate(d.date || '')
    setEventType(d.eventType || 'Full HYROX')

    setLinks(d.links || [])
    setWaves(d.waves || [])
    setLanes(d.lanes || (d.waves?.[0]?.lanes) || 4)
    setTimeSlots(d.timeSlots || [])
    setChecklist(d.checklist || {})
    setMaps(d.maps || {})
    setSelectedStaffIds(d.selectedStaffIds || [])
    setStationOverrides(d.stationOverrides || {})
    setPublicSlug(d.publicSlug || '')
    setPublicAdminEnabled(d.publicAdminEnabled === true)
    setPublicChecklistEnabled(d.publicChecklistEnabled === true)
  }

  function buildData(slug) {
    const today = new Date().toISOString().substring(0, 10)
    const status = date < today ? 'past' : date === today ? 'live' : 'future'
    return { name, date, eventType, status, links, waves, lanes, timeSlots, checklist, maps, selectedStaffIds, stationOverrides, publicSlug: slug, publicAdminEnabled, publicChecklistEnabled }
  }

  async function saveEvent() {
    const slug = publicSlug || generateSlug(name, date)
    const data = buildData(slug)
    if (!eventId) {
      data.createdAt = serverTimestamp()
      const docRef = await addDoc(collection(db, 'events'), data)
      setEventId(docRef.id)
      setPublicSlug(slug)
      navigate(`/event/${docRef.id}`, { replace: true })
    } else {
      await setDoc(doc(db, 'events', eventId), data, { merge: true })
    }
    setSaved(s => s + 1)
  }

  async function togglePublicAdmin() {
    const next = !publicAdminEnabled
    setPublicAdminEnabled(next)
    if (eventId) {
      await updateDoc(doc(db, 'events', eventId), { publicAdminEnabled: next })
    }
  }

  async function togglePublicChecklist() {
    const next = !publicChecklistEnabled
    setPublicChecklistEnabled(next)
    if (eventId) {
      await updateDoc(doc(db, 'events', eventId), { publicChecklistEnabled: next })
    }
  }

  async function saveGlobalConfig(updated) {
    await setDoc(doc(db, 'config', 'main'), updated)
    setConfig(updated)
  }

  return (
    <div>
      <NavBar />
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <button onClick={() => navigate('/')} style={backBtn}>← Events</button>
          <h1 style={{ fontSize: 28 }}>{isNew ? 'New Event' : (name || 'Event Editor')}</h1>
          {!isNew && (
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
              <a
                href={`/event/${eventId}/qr`}
                style={{ ...actionBtn, textDecoration: 'none' }}
              >QR Code</a>
              {publicSlug && (
                <a
                  href={`/e/${publicSlug}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ ...actionBtn, textDecoration: 'none' }}
                >Public ↗</a>
              )}
            </div>
          )}
        </div>

        <div className="hide-scrollbar" style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', marginBottom: 32, overflowX: 'auto' }}>
          {TABS.map((t, i) => (
            <button
              key={t}
              onClick={() => setTab(i)}
              style={{
                padding: '10px 20px',
                background: 'transparent',
                border: 'none',
                borderBottom: tab === i ? '2px solid var(--color-accent)' : '2px solid transparent',
                color: tab === i ? 'var(--color-text)' : 'var(--color-text-muted)',
                fontFamily: 'var(--font-heading)',
                fontSize: 14,
                fontWeight: tab === i ? 700 : 400,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                cursor: 'pointer',
                marginBottom: -1,
                whiteSpace: 'nowrap',
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 0 && (
          <InfoTab
            name={name} setName={setName}
            date={date} setDate={setDate}
            eventType={eventType} setEventType={setEventType}
            lanes={lanes} setLanes={setLanes}
            links={links} setLinks={setLinks}
            onSave={saveEvent} saved={saved}
            eventId={eventId}
            publicAdminEnabled={publicAdminEnabled}
            onTogglePublicAdmin={togglePublicAdmin}
            publicChecklistEnabled={publicChecklistEnabled}
            onTogglePublicChecklist={togglePublicChecklist}
          />
        )}
        {tab === 1 && (
          <TeamsTab eventId={eventId} lanes={lanes} config={config} eventType={eventType} timeSlots={timeSlots} setTimeSlots={setTimeSlots} />
        )}
        {tab === 2 && (
          <ChecklistPanel
            checklist={checklist} setChecklist={setChecklist}
            config={config}
            onSave={saveEvent} saved={saved}
          />
        )}
        {tab === 3 && (
          <EventSetupTab
            maps={maps} setMaps={setMaps}
            selectedStaffIds={selectedStaffIds} setSelectedStaffIds={setSelectedStaffIds}
            stationOverrides={stationOverrides} setStationOverrides={setStationOverrides}
            config={config}
            onSave={saveEvent} saved={saved}
            eventId={eventId}
          />
        )}
        {tab === 4 && (
          <RiskTab
            eventId={eventId}
            eventName={name}
            date={date}
            lanes={lanes}
            config={config}
            onSaveConfig={saveGlobalConfig}
          />
        )}
      </div>
    </div>
  )
}

function InfoTab({
  name, setName, date, setDate, eventType, setEventType, lanes, setLanes, links, setLinks, onSave, saved, eventId,
  publicAdminEnabled, onTogglePublicAdmin, publicChecklistEnabled, onTogglePublicChecklist,
}) {
  return (
    <div style={{ maxWidth: 620 }}>
      <Field label="Event Name">
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. May Simulation 2026"
          style={inputStyle}
        />
      </Field>
      <Field label="Date">
        <CalendarPicker value={date} onChange={setDate} />
      </Field>
      <Field label="Event Type">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['Full HYROX', 'Hybrid', 'Custom'].map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setEventType(t)}
              style={{
                padding: '8px 18px',
                background: eventType === t ? 'var(--color-accent)' : 'transparent',
                border: '1px solid ' + (eventType === t ? 'var(--color-accent)' : 'var(--color-border)'),
                color: eventType === t ? '#fff' : 'var(--color-text)',
                fontFamily: 'var(--font-heading)',
                fontSize: 13,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                cursor: 'pointer',
              }}
            >{t}</button>
          ))}
        </div>
      </Field>
      <Field label="Simultaneous Lanes">
        <div style={{ display: 'flex', gap: 8 }}>
          {[1, 2, 3, 4].map(n => (
            <button
              key={n}
              type="button"
              onClick={() => setLanes(n)}
              style={{
                padding: '8px 22px',
                background: lanes === n ? 'var(--color-accent)' : 'transparent',
                border: '1px solid ' + (lanes === n ? 'var(--color-accent)' : 'var(--color-border)'),
                color: lanes === n ? '#fff' : 'var(--color-text)',
                fontFamily: 'var(--font-heading)',
                fontSize: 13,
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >{n}</button>
          ))}
        </div>
      </Field>
      <Field label="Custom Links">
        {links.map((link, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input
              value={link.label}
              onChange={e => setLinks(ls => ls.map((l, j) => j === i ? { ...l, label: e.target.value } : l))}
              style={{ ...inputStyle, width: 160 }}
              placeholder="Label"
            />
            <input
              value={link.url}
              onChange={e => setLinks(ls => ls.map((l, j) => j === i ? { ...l, url: e.target.value } : l))}
              style={{ ...inputStyle, flex: 1 }}
              placeholder="https://..."
            />
            <button type="button" onClick={() => setLinks(ls => ls.filter((_, j) => j !== i))} style={iconBtn}>✕</button>
          </div>
        ))}
        <button type="button" onClick={() => setLinks(ls => [...ls, { label: '', url: '' }])} style={btnSecondary}>
          + Add Link
        </button>
      </Field>
      <Field label="Admin Access">
        {!eventId ? (
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Save the event first to enable link-based admin access.</p>
        ) : (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <button
                type="button"
                onClick={() => publicAdminEnabled && onTogglePublicAdmin()}
                style={{
                  padding: '8px 18px',
                  background: !publicAdminEnabled ? 'var(--color-accent)' : 'transparent',
                  border: '1px solid ' + (!publicAdminEnabled ? 'var(--color-accent)' : 'var(--color-border)'),
                  color: !publicAdminEnabled ? '#fff' : 'var(--color-text)',
                  fontFamily: 'var(--font-heading)',
                  fontSize: 13,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  cursor: 'pointer',
                }}
              >Login Required</button>
              <button
                type="button"
                onClick={() => !publicAdminEnabled && onTogglePublicAdmin()}
                style={{
                  padding: '8px 18px',
                  background: publicAdminEnabled ? 'var(--color-success)' : 'transparent',
                  border: '1px solid ' + (publicAdminEnabled ? 'var(--color-success)' : 'var(--color-border)'),
                  color: publicAdminEnabled ? '#fff' : 'var(--color-text)',
                  fontFamily: 'var(--font-heading)',
                  fontSize: 13,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  cursor: 'pointer',
                }}
              >Link Access (No Login)</button>
            </div>
            {publicAdminEnabled && <LinkCopy path={`/event/${eventId}/admin`} />}
          </div>
        )}
      </Field>
      <Field label="Checklist Access">
        {!eventId ? (
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Save the event first to enable link-based checklist access.</p>
        ) : (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <button
                type="button"
                onClick={() => publicChecklistEnabled && onTogglePublicChecklist()}
                style={{
                  padding: '8px 18px',
                  background: !publicChecklistEnabled ? 'var(--color-accent)' : 'transparent',
                  border: '1px solid ' + (!publicChecklistEnabled ? 'var(--color-accent)' : 'var(--color-border)'),
                  color: !publicChecklistEnabled ? '#fff' : 'var(--color-text)',
                  fontFamily: 'var(--font-heading)',
                  fontSize: 13,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  cursor: 'pointer',
                }}
              >Login Required</button>
              <button
                type="button"
                onClick={() => !publicChecklistEnabled && onTogglePublicChecklist()}
                style={{
                  padding: '8px 18px',
                  background: publicChecklistEnabled ? 'var(--color-success)' : 'transparent',
                  border: '1px solid ' + (publicChecklistEnabled ? 'var(--color-success)' : 'var(--color-border)'),
                  color: publicChecklistEnabled ? '#fff' : 'var(--color-text)',
                  fontFamily: 'var(--font-heading)',
                  fontSize: 13,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  cursor: 'pointer',
                }}
              >Link Access (No Login)</button>
            </div>
            {publicChecklistEnabled && <LinkCopy path={`/event/${eventId}/checklist`} />}
          </div>
        )}
      </Field>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 32 }}>
        <button type="button" onClick={onSave} style={btnPrimary}>Save</button>
        <SaveConfirmation trigger={saved} />
      </div>
    </div>
  )
}

function LinkCopy({ path }) {
  const [copied, setCopied] = useState(false)
  const baseUrl = import.meta.env.VITE_PUBLIC_BASE_URL || window.location.origin
  const url = `${baseUrl}${path}`

  function handleCopy() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <input readOnly value={url} style={{ ...inputStyle, width: 'auto', flex: 1, minWidth: 200, color: 'var(--color-text-muted)' }} onFocus={e => e.target.select()} />
      <button type="button" onClick={handleCopy} style={btnSecondary}>{copied ? 'Copied!' : 'Copy Link'}</button>
    </div>
  )
}

const MINUTES = ['00','05','10','15','20','25','30','35','40','45','50','55']
const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2,'0'))

function SlotTimePicker({ value, onChange }) {
  const [h, m] = (value || '09:00').split(':')
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <select
        value={h}
        onChange={e => onChange(`${e.target.value}:${m}`)}
        style={timeSelectStyle}
      >
        {HOURS.map(hh => <option key={hh} value={hh}>{hh}</option>)}
      </select>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700, color: 'var(--color-text)', userSelect: 'none' }}>:</span>
      <select
        value={MINUTES.includes(m) ? m : '00'}
        onChange={e => onChange(`${h}:${e.target.value}`)}
        style={timeSelectStyle}
      >
        {MINUTES.map(mm => <option key={mm} value={mm}>{mm}</option>)}
      </select>
    </div>
  )
}

const timeSelectStyle = {
  padding: '10px 8px',
  background: 'var(--color-bg)',
  border: '1px solid var(--color-border)',
  color: 'var(--color-text)',
  fontFamily: 'var(--font-mono)',
  fontSize: 18,
  fontWeight: 700,
  cursor: 'pointer',
  textAlign: 'center',
  minWidth: 64,
}

function addMinutes(timeStr, mins) {
  const [h, m] = (timeStr || '00:00').split(':').map(Number)
  const total = h * 60 + m + mins
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

function TeamsTab({ eventId, lanes, config, eventType, timeSlots, setTimeSlots }) {
  const [teams, setTeams] = useState([])
  const [adding, setAdding] = useState(null) // { time, laneIndex }
  const [editing, setEditing] = useState(null) // teamId
  const [moving, setMoving] = useState(null) // teamId
  const [moveTo, setMoveTo] = useState('')
  const [newSlotTime, setNewSlotTime] = useState('09:00')

  useEffect(() => {
    if (eventId) fetchTeams()
  }, [eventId])

  async function fetchTeams() {
    const q = query(collection(db, 'teams'), where('eventId', '==', eventId))
    const snap = await getDocs(q)
    setTeams(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  }

  async function deleteTeam(teamId) {
    if (!confirm('Delete this athlete/team?')) return
    await deleteDoc(doc(db, 'teams', teamId))
    setTeams(ts => ts.filter(t => t.id !== teamId))
  }

  async function addTimeSlot(time) {
    if (timeSlots.includes(time)) return
    const next = [...timeSlots, time].sort()
    setTimeSlots(next)
    await updateDoc(doc(db, 'events', eventId), { timeSlots: next })
  }

  async function removeTimeSlot(time) {
    const next = timeSlots.filter(t => t !== time)
    setTimeSlots(next)
    await updateDoc(doc(db, 'events', eventId), { timeSlots: next })
  }

  async function doMoveTeam(team) {
    const dest = moveTo.trim()
    if (!dest) return
    const usedAtDest = new Set(teams.filter(t => t.id !== team.id && t.scheduledTime === dest).map(t => t.laneIndex).filter(v => v != null))
    let laneIndex = 0
    while (usedAtDest.has(laneIndex)) laneIndex++
    await updateDoc(doc(db, 'teams', team.id), { scheduledTime: dest, laneIndex })
    setTeams(ts => ts.map(t => t.id === team.id ? { ...t, scheduledTime: dest, laneIndex } : t))
    setMoving(null)
    setMoveTo('')
  }

  const timeMap = {}
  for (const team of teams) {
    const t = team.scheduledTime || '__unknown__'
    if (!timeMap[t]) timeMap[t] = []
    timeMap[t].push(team)
  }
  const sortedTimes = Object.keys(timeMap).filter(t => t !== '__unknown__').sort()
  const unknownTeams = timeMap['__unknown__'] || []
  const effectiveLanes = lanes || 4

  // A slot can exist with no athletes yet (added as a scheduling break via +5/+10/custom)
  const allTimes = [...new Set([...sortedTimes, ...(timeSlots || [])])].sort()
  const lastTime = allTimes[allTimes.length - 1] || null

  if (!eventId) return <p style={{ color: 'var(--color-text-muted)', padding: '24px 0' }}>Save the event first before adding teams.</p>

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, paddingBottom: 6, borderBottom: '2px solid var(--color-border)', marginBottom: 2 }}>
        <div style={{ width: 54, flexShrink: 0, fontSize: 10, fontFamily: 'var(--font-heading)', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-text-muted)' }}>Time</div>
        {Array.from({ length: effectiveLanes }, (_, i) => (
          <div key={i} style={{ flex: 1, fontSize: 10, fontFamily: 'var(--font-heading)', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-text-muted)' }}>Lane {i + 1}</div>
        ))}
      </div>

      {allTimes.length === 0 && (
        <p style={{ color: 'var(--color-text-muted)', padding: '24px 0' }}>No time slots yet. Add one below.</p>
      )}

      {allTimes.map(time => {
        const slotTeams = [...(timeMap[time] || [])].sort((a, b) => (a.laneIndex ?? 0) - (b.laneIndex ?? 0))
        const emptyLanes = Math.max(0, effectiveLanes - slotTeams.length)
        const isAddingHere = adding?.time === time

        // Find which lane indices (0, 1, 2, …) are already occupied in this slot
        const usedIndices = new Set(slotTeams.map(t => t.laneIndex).filter(v => v != null))
        // Build the list of free indices for the empty-lane buttons
        const freeIndices = []
        for (let idx = 0; freeIndices.length < emptyLanes + 4; idx++) {
          if (!usedIndices.has(idx)) freeIndices.push(idx)
        }

        return (
          <div key={time}>
            <div style={{ display: 'flex', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--color-border)', alignItems: 'stretch', minHeight: 60 }}>
              <div style={{ width: 54, flexShrink: 0, fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--color-text-muted)', paddingTop: 10 }}>
                {time}
                {slotTeams.length === 0 && (
                  <button
                    onClick={() => removeTimeSlot(time)}
                    title="Remove empty slot"
                    style={{ display: 'block', marginTop: 4, background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: 11, padding: 0 }}
                  >✕</button>
                )}
              </div>
              {slotTeams.map(team => (
                <div key={team.id} style={{ flex: 1, background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', padding: '8px 10px', minWidth: 0, position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-start', gap: 4 }}>
                    <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                      <button onClick={() => setEditing(editing === team.id ? null : team.id)} title="Edit team" style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: 13, padding: '0 2px', lineHeight: 1 }}>✎</button>
                      <button onClick={() => { setMoving(moving === team.id ? null : team.id); setMoveTo(team.scheduledTime || '') }} title="Move to another slot" style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: 13, padding: '0 2px', lineHeight: 1 }}>⏱</button>
                      <button onClick={() => deleteTeam(team.id)} style={{ background: 'transparent', border: 'none', color: 'var(--color-accent)', cursor: 'pointer', fontSize: 12, padding: '0 2px', lineHeight: 1 }}>✕</button>
                    </div>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 13, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{team.name}</div>
                  {team.competitionName && <div style={{ fontSize: 10, color: 'var(--color-accent)', fontFamily: 'var(--font-heading)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 1 }}>{team.competitionName}</div>}
                  {team.weight && <div style={{ fontSize: 10, color: '#f59e0b', fontFamily: 'var(--font-heading)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 1 }}>{team.weight}</div>}
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {team.athlete1?.firstName} {team.athlete1?.lastName}
                    {team.athlete2?.firstName && ` / ${team.athlete2.firstName}`}
                  </div>
                  {team.checkedIn && <span style={{ fontSize: 10, color: 'var(--color-success)', fontFamily: 'var(--font-heading)', textTransform: 'uppercase', display: 'inline-block', marginTop: 2 }}>✓ In</span>}
                  {moving === team.id && (
                    <div style={{ marginTop: 8, borderTop: '1px solid var(--color-border)', paddingTop: 8 }}>
                      <div style={{ fontSize: 10, color: 'var(--color-text-muted)', fontFamily: 'var(--font-heading)', textTransform: 'uppercase', marginBottom: 6 }}>Move to slot</div>
                      <input
                        list={`move-times-${team.id}`}
                        value={moveTo}
                        onChange={e => setMoveTo(e.target.value)}
                        placeholder="HH:MM"
                        style={{ width: '100%', padding: '5px 8px', marginBottom: 6, background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)', fontFamily: 'var(--font-mono)', fontSize: 13, boxSizing: 'border-box' }}
                      />
                      <datalist id={`move-times-${team.id}`}>
                        {sortedTimes.filter(t => t !== time).map(t => <option key={t} value={t} />)}
                      </datalist>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => doMoveTeam(team)} disabled={!moveTo.trim()} style={{ padding: '5px 12px', background: 'var(--color-accent)', color: '#fff', border: 'none', fontFamily: 'var(--font-heading)', fontSize: 11, textTransform: 'uppercase', cursor: 'pointer', opacity: moveTo.trim() ? 1 : 0.5 }}>Move</button>
                        <button onClick={() => setMoving(null)} style={{ padding: '5px 10px', background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)', fontFamily: 'var(--font-heading)', fontSize: 11, textTransform: 'uppercase', cursor: 'pointer' }}>Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {Array.from({ length: emptyLanes }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setAdding(isAddingHere && adding?.laneIndex === freeIndices[i] ? null : { time, laneIndex: freeIndices[i] })}
                  style={{ flex: 1, background: 'transparent', border: '1px dashed var(--color-border)', color: 'var(--color-text-muted)', cursor: 'pointer', padding: '8px', fontSize: 12, fontFamily: 'var(--font-heading)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >+ Add</button>
              ))}
            </div>
            {isAddingHere && (
              <TeamForm
                eventId={eventId}
                scheduledTime={adding.time}
                laneIndex={adding.laneIndex || 0}
                config={config}
                eventType={eventType}
                onSaved={(newTeam) => { setTeams(ts => [...ts, newTeam]); setAdding(null) }}
                onCancel={() => setAdding(null)}
              />
            )}
            {slotTeams.filter(t => t.id === editing).map(editTeam => (
              <TeamForm
                key={editTeam.id}
                eventId={eventId}
                scheduledTime={editTeam.scheduledTime}
                config={config}
                eventType={eventType}
                team={editTeam}
                onSaved={(updatedTeam) => { setTeams(ts => ts.map(t => t.id === updatedTeam.id ? updatedTeam : t)); setEditing(null) }}
                onCancel={() => setEditing(null)}
              />
            ))}
          </div>
        )
      })}

      {unknownTeams.length > 0 && (
        <div style={{ marginTop: 16, padding: 12, border: '1px solid var(--color-border)', background: 'var(--color-surface-raised)' }}>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'var(--font-heading)', textTransform: 'uppercase', marginBottom: 8 }}>No time assigned</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {unknownTeams.map(team => (
              <div key={team.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--color-bg)', border: '1px solid var(--color-border)', padding: '6px 10px' }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{team.name}</span>
                <button onClick={() => deleteTeam(team.id)} style={{ background: 'transparent', border: 'none', color: 'var(--color-accent)', cursor: 'pointer', fontSize: 12, padding: 0 }}>✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: 32, paddingTop: 20, borderTop: '1px solid var(--color-border)' }}>
        <div style={{ fontSize: 11, fontFamily: 'var(--font-heading)', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-text-muted)', marginBottom: 14 }}>
          {lastTime ? 'Add next time slot' : 'Add first time slot'}
        </div>

        {lastTime ? (
          /* Subsequent slots: +5 / +10 as primary CTAs */
          <div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              {[5, 10].map(mins => {
                const t = addMinutes(lastTime, mins)
                return (
                  <button
                    key={mins}
                    onClick={() => addTimeSlot(t)}
                    style={{
                      flex: 1, padding: '14px 10px', background: 'var(--color-surface-raised)',
                      border: '1px solid var(--color-border)', color: 'var(--color-text)',
                      cursor: 'pointer', fontFamily: 'var(--font-heading)', textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: 20, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>+{mins} min</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--color-accent)', marginTop: 4 }}>{t}</div>
                  </button>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'var(--font-heading)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>or custom:</span>
              <SlotTimePicker value={newSlotTime} onChange={setNewSlotTime} />
              <button onClick={() => addTimeSlot(newSlotTime)} style={btnPrimary}>Add</button>
            </div>
          </div>
        ) : (
          /* First slot: time picker is the focus */
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <SlotTimePicker value={newSlotTime} onChange={setNewSlotTime} />
            <button onClick={() => addTimeSlot(newSlotTime)} style={btnPrimary}>Add Slot</button>
          </div>
        )}
      </div>
    </div>
  )
}

function buildScheduleContext(teams, config, averages) {
  const map = {}
  for (const t of teams) {
    const catLabel = (config?.categories || []).find(c => c.id === t.categoryId)?.label || t.competitionName || 'Unknown'
    const key = `${t.scheduledTime || '?'}|${catLabel}`
    if (!map[key]) map[key] = { time: t.scheduledTime || '?', category: catLabel, categoryId: t.categoryId, count: 0 }
    map[key].count++
  }
  return Object.values(map)
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''))
    .map(row => {
      const avg = (row.categoryId && averages[row.categoryId]) || averages[row.category]
      return {
        ...row,
        avgSeconds: avg?.avgSeconds ?? null,
        avgLabel: avg ? secondsToHHMMSS(avg.avgSeconds) : 'No historical data yet',
      }
    })
}

function RiskTab({ eventId, eventName, date, lanes, config, onSaveConfig }) {
  const [teams, setTeams] = useState([])
  const [averages, setAverages] = useState({})
  const [loading, setLoading] = useState(true)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [notes, setNotes] = useState(config?.riskNotes || '')
  const [notesSaved, setNotesSaved] = useState(0)

  useEffect(() => {
    if (!eventId) { setLoading(false); return }
    async function load() {
      setLoading(true)
      const [teamsSnap, avg] = await Promise.all([
        getDocs(query(collection(db, 'teams'), where('eventId', '==', eventId))),
        getCategoryAverages(),
      ])
      setTeams(teamsSnap.docs.map(d => ({ id: d.id, ...d.data() })))
      setAverages(avg)
      setLoading(false)
    }
    load()
  }, [eventId])

  useEffect(() => { setNotes(config?.riskNotes || '') }, [config?.riskNotes])

  const schedule = buildScheduleContext(teams, config, averages)

  async function saveNotes() {
    await onSaveConfig({ ...config, riskNotes: notes })
    setNotesSaved(s => s + 1)
  }

  function saveReplyToNotes(content) {
    const stamped = `— ${new Date().toISOString().slice(0, 10)} (${eventName || 'event'}): ${content}`
    setNotes(prev => (prev ? prev + '\n\n' : '') + stamped)
  }

  async function send() {
    if (!input.trim() || sending) return
    const next = [...messages, { role: 'user', content: input.trim() }]
    setMessages(next)
    setInput('')
    setSending(true)
    try {
      const res = await fetch('/api/risk-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: next,
          context: {
            eventName, eventDate: date, lanes,
            waves: schedule.map(({ time, category, count, avgSeconds, avgLabel }) => ({ time, category, athletes: count, avgFinishTime: avgLabel, avgFinishSeconds: avgSeconds })),
            stationCapacities: config?.stationCapacities || {},
            riskNotes: notes,
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Request failed')
      setMessages(m => [...m, { role: 'assistant', content: data.reply }])
    } catch (err) {
      setMessages(m => [...m, { role: 'assistant', content: `⚠️ ${err.message}` }])
    } finally {
      setSending(false)
    }
  }

  if (!eventId) return <p style={{ color: 'var(--color-text-muted)', padding: '24px 0' }}>Save the event first.</p>

  return (
    <div>
      <Section title="Wave Schedule & Historical Pace">
        {loading ? (
          <p style={{ color: 'var(--color-text-muted)' }}>Loading...</p>
        ) : schedule.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)' }}>No teams scheduled yet — add teams in the Teams tab first.</p>
        ) : (
          <div style={{ overflowX: 'auto', marginBottom: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--color-text-muted)', fontSize: 11, fontFamily: 'var(--font-heading)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '6px 8px' }}>Time</th>
                  <th style={{ padding: '6px 8px' }}>Category</th>
                  <th style={{ padding: '6px 8px' }}>Athletes</th>
                  <th style={{ padding: '6px 8px' }}>Avg. Finish Time</th>
                </tr>
              </thead>
              <tbody>
                {schedule.map((row, i) => (
                  <tr key={i} style={{ borderTop: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '6px 8px', fontFamily: 'var(--font-mono)' }}>{row.time}</td>
                    <td style={{ padding: '6px 8px' }}>{row.category}</td>
                    <td style={{ padding: '6px 8px' }}>{row.count}</td>
                    <td style={{ padding: '6px 8px', fontFamily: 'var(--font-mono)', color: row.avgSeconds ? 'var(--color-text)' : 'var(--color-text-muted)' }}>{row.avgLabel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="Rules of Thumb (persistent notes)">
        <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8 }}>
          Shared across every event — also editable in <a href="/settings" style={{ color: 'var(--color-accent)' }}>Settings → Risk Planning</a>, alongside station capacities.
          The assistant below reads these every time, so you don't need to re-explain your venue.
        </p>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={5}
          style={{ ...inputStyle, width: '100%', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8 }}>
          <button type="button" onClick={saveNotes} style={btnSecondary}>Save Notes</button>
          <SaveConfirmation trigger={notesSaved} />
        </div>
      </Section>

      <Section title="Discuss Overlap Risk">
        <div style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)', padding: 16, marginBottom: 12, maxHeight: 440, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {messages.length === 0 && (
            <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
              Ask about this event's wave schedule — e.g. "Is the 08:10 Half Single Men wave going to catch the 08:00 Single Women wave at the sleds?"
            </p>
          )}
          {messages.map((m, i) => (
            <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
              <div style={{
                background: m.role === 'user' ? 'var(--color-accent)' : 'var(--color-surface-raised)',
                color: m.role === 'user' ? '#fff' : 'var(--color-text)',
                border: m.role === 'user' ? 'none' : '1px solid var(--color-border)',
                padding: '10px 14px', fontSize: 14, whiteSpace: 'pre-wrap',
              }}>{m.content}</div>
              {m.role === 'assistant' && (
                <button type="button" onClick={() => saveReplyToNotes(m.content)} style={{ ...btnSecondary, marginTop: 4, fontSize: 10, padding: '4px 10px' }}>+ Save to notes</button>
              )}
            </div>
          ))}
          {sending && <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Thinking…</p>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Ask about wave overlap risk..."
            style={{ ...inputStyle, flex: 1 }}
          />
          <button type="button" onClick={send} disabled={sending || !input.trim()} style={{ ...btnPrimary, opacity: (sending || !input.trim()) ? 0.5 : 1 }}>Send</button>
        </div>
      </Section>
    </div>
  )
}

function EventSetupTab({ maps, setMaps, selectedStaffIds, setSelectedStaffIds, stationOverrides, setStationOverrides, config, onSave, saved, eventId }) {
  const [pickerOpen, setPickerOpen] = useState(null) // 'gymLayout' | 'runRoute' | null

  async function selectMap(type, url) {
    setMaps(m => ({ ...m, [type]: url }))
    setPickerOpen(null)
    if (eventId) {
      await updateDoc(doc(db, 'events', eventId), { [`maps.${type}`]: url })
    }
  }

  async function clearMap(type) {
    setMaps(m => ({ ...m, [type]: null }))
    if (eventId) {
      await updateDoc(doc(db, 'events', eventId), { [`maps.${type}`]: null })
    }
  }

  function toggleStaff(id) {
    setSelectedStaffIds(ids => ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id])
  }

  const pictures = config?.pictures || []

  return (
    <div>
      <Section title="Maps">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 8 }}>
          <MapPicker
            label="Gym Layout"
            url={maps.gymLayout}
            onChoose={() => setPickerOpen('gymLayout')}
            onClear={() => clearMap('gymLayout')}
          />
          <MapPicker
            label="Run Route"
            url={maps.runRoute}
            onChoose={() => setPickerOpen('runRoute')}
            onClear={() => clearMap('runRoute')}
          />
        </div>
        {pictures.length === 0 && (
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 8 }}>
            No pictures in library yet. Add them in <a href="/settings" style={{ color: 'var(--color-accent)' }}>Settings → Pictures</a>.
          </p>
        )}
      </Section>
      {pickerOpen && (
        <PictureLibraryModal
          pictures={pictures}
          onSelect={url => selectMap(pickerOpen, url)}
          onClose={() => setPickerOpen(null)}
        />
      )}

      <Section title={`Staff (${selectedStaffIds.length} selected)`}>
        {(config?.staff || []).length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
            No staff in database. Add staff members in <a href="/settings" style={{ color: 'var(--color-accent)' }}>Settings → Staff</a>.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(config?.staff || []).map(member => {
              const active = selectedStaffIds.includes(member.id)
              return (
                <div
                  key={member.id}
                  onClick={() => toggleStaff(member.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                    background: active ? 'rgba(229,57,53,0.08)' : 'var(--color-surface-raised)',
                    border: `1px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
                    cursor: 'pointer', userSelect: 'none',
                  }}
                >
                  {member.photoUrl && (
                    <img src={member.photoUrl} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{member.name}</div>
                    {(member.role || member.station) && (
                      <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                        {[member.role, member.station].filter(Boolean).join(' · ')}
                      </div>
                    )}
                  </div>
                  <span style={{
                    width: 20, height: 20, border: `2px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
                    background: active ? 'var(--color-accent)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: 12, flexShrink: 0,
                  }}>
                    {active ? '✓' : ''}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </Section>

      <Section title="Stations">
        <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 12 }}>
          Pulled live from Settings → Stations by default. Click "Customize for This Event" on a category to override it for this event only.
        </p>
        <StationOverridesEditor config={config} overrides={stationOverrides} setOverrides={setStationOverrides} />
      </Section>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 24 }}>
        <button type="button" onClick={onSave} style={btnPrimary}>Save</button>
        <SaveConfirmation trigger={saved} />
      </div>
    </div>
  )
}

function StationOverridesEditor({ config, overrides, setOverrides }) {
  const [expandedId, setExpandedId] = useState(null)
  const categories = (config?.categories || []).filter(c => c.enabled !== false)

  function globalStationsFor(catId) {
    return config?.categoryStations?.[catId] || buildDefaultStations(catId, config?.weightCheatSheet?.[catId])
  }

  function enableOverride(catId) {
    setOverrides(prev => ({ ...prev, [catId]: globalStationsFor(catId).map(s => ({ ...s })) }))
  }

  function revertToGlobal(catId) {
    setOverrides(prev => {
      const next = { ...prev }
      delete next[catId]
      return next
    })
  }

  function updateStation(catId, idx, field, value) {
    setOverrides(prev => ({
      ...prev,
      [catId]: prev[catId].map((s, i) => i === idx ? { ...s, [field]: value } : s),
    }))
  }

  function addStation(catId) {
    setOverrides(prev => ({
      ...prev,
      [catId]: [...(prev[catId] || []), { order: (prev[catId]?.length || 0) + 1, label: '', value: '' }],
    }))
  }

  function removeStation(catId, idx) {
    setOverrides(prev => ({
      ...prev,
      [catId]: prev[catId].filter((_, i) => i !== idx),
    }))
  }

  return (
    <div>
      {categories.map(cat => {
        const overridden = Object.prototype.hasOwnProperty.call(overrides || {}, cat.id)
        const rows = overridden ? (overrides[cat.id] || []) : globalStationsFor(cat.id)
        const isOpen = expandedId === cat.id
        return (
          <div key={cat.id} style={{ marginBottom: 8, background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <div
              style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
              onClick={() => setExpandedId(isOpen ? null : cat.id)}
            >
              <span style={{ fontFamily: 'var(--font-heading)', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{cat.label}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 11, color: overridden ? 'var(--color-accent)' : 'var(--color-text-muted)' }}>
                  {overridden ? 'Custom for this event' : 'Using global default'}
                </span>
                <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>{isOpen ? '▲' : '▼'}</span>
              </span>
            </div>
            {isOpen && (
              <div style={{ borderTop: '1px solid var(--color-border)', padding: 16 }}>
                {!overridden && (
                  <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 12 }}>
                    Showing the live global default from Settings → Stations.
                  </p>
                )}
                {rows.map((st, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-muted)', minWidth: 22, textAlign: 'right' }}>{st.order || i + 1}</span>
                    <input
                      value={st.label}
                      disabled={!overridden}
                      onChange={e => updateStation(cat.id, i, 'label', e.target.value)}
                      style={{ ...stationInputStyle, flex: 1, opacity: overridden ? 1 : 0.6 }}
                      placeholder="Station name"
                    />
                    <input
                      value={st.value}
                      disabled={!overridden}
                      onChange={e => updateStation(cat.id, i, 'value', e.target.value)}
                      style={{ ...stationInputStyle, width: 160, opacity: overridden ? 1 : 0.6 }}
                      placeholder="e.g. 1000m / 102kg"
                    />
                    {overridden && (
                      <button onClick={() => removeStation(cat.id, i)} style={iconBtnRed}>✕</button>
                    )}
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                  {overridden ? (
                    <>
                      <button onClick={() => addStation(cat.id)} style={btnSecondary}>+ Add Station</button>
                      <button onClick={() => revertToGlobal(cat.id)} style={btnSecondary}>Revert to Global Default</button>
                    </>
                  ) : (
                    <button onClick={() => enableOverride(cat.id)} style={btnSecondary}>Customize for This Event</button>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

const stationInputStyle = {
  padding: '8px 10px',
  background: 'var(--color-bg)',
  border: '1px solid var(--color-border)',
  color: 'var(--color-text)',
  fontSize: 13,
}

function MapPicker({ label, url, onChoose, onClear }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontFamily: 'var(--font-heading)', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-text-muted)', marginBottom: 8 }}>
        {label}
      </div>
      {url ? (
        <div>
          <img src={url} alt={label} style={{ width: '100%', maxHeight: 200, objectFit: 'cover', marginBottom: 8, display: 'block' }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={onChoose} style={btnSecondary}>Change</button>
            <button type="button" onClick={onClear} style={btnSecondary}>Remove</button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={onChoose}
          style={{
            width: '100%', height: 120,
            background: 'var(--color-surface-raised)',
            border: '2px dashed var(--color-border)',
            color: 'var(--color-text-muted)',
            fontFamily: 'var(--font-heading)', fontSize: 13,
            textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer',
          }}
        >
          Choose from Library
        </button>
      )}
    </div>
  )
}

function PictureLibraryModal({ pictures, onSelect, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', width: '100%', maxWidth: 720, maxHeight: '80vh', overflow: 'auto', padding: 24 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 16, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Choose from Library</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>✕</button>
        </div>
        {pictures.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
            No pictures yet. Go to <a href="/settings" style={{ color: 'var(--color-accent)' }}>Settings → Pictures</a> to upload some.
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
            {pictures.map(pic => (
              <div
                key={pic.id}
                onClick={() => onSelect(pic.url)}
                style={{ cursor: 'pointer', border: '2px solid var(--color-border)', overflow: 'hidden', transition: 'border-color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--color-accent)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
              >
                <img src={pic.url} alt={pic.name} style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }} />
                <div style={{ padding: '6px 10px', fontSize: 12, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pic.name}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <h3 style={{ fontSize: 16, marginBottom: 16, paddingBottom: 8, borderBottom: '1px solid var(--color-border)' }}>{title}</h3>
      {children}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        fontSize: 11,
        fontFamily: 'var(--font-heading)',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        color: 'var(--color-text-muted)',
        marginBottom: 8,
      }}>{label}</div>
      {children}
    </div>
  )
}

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  background: 'var(--color-bg)',
  border: '1px solid var(--color-border)',
  color: 'var(--color-text)',
  fontSize: 14,
}

const btnPrimary = {
  padding: '10px 24px',
  background: 'var(--color-accent)',
  color: '#fff',
  border: 'none',
  fontFamily: 'var(--font-heading)',
  fontSize: 14,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  cursor: 'pointer',
}

const btnSecondary = {
  padding: '8px 18px',
  background: 'transparent',
  color: 'var(--color-text-muted)',
  border: '1px solid var(--color-border)',
  fontFamily: 'var(--font-heading)',
  fontSize: 12,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  cursor: 'pointer',
}

const iconBtn = {
  background: 'transparent',
  border: '1px solid var(--color-border)',
  color: 'var(--color-text-muted)',
  padding: '6px 10px',
  cursor: 'pointer',
  fontSize: 14,
}

const iconBtnRed = {
  background: 'transparent',
  border: 'none',
  color: 'var(--color-accent)',
  fontFamily: 'var(--font-heading)',
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  cursor: 'pointer',
  padding: '4px 8px',
}

const backBtn = {
  background: 'transparent',
  border: 'none',
  color: 'var(--color-text-muted)',
  fontFamily: 'var(--font-heading)',
  fontSize: 13,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  cursor: 'pointer',
  padding: 0,
}

const actionBtn = {
  padding: '6px 14px',
  border: '1px solid var(--color-border)',
  color: 'var(--color-text)',
  fontFamily: 'var(--font-heading)',
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  fontWeight: 600,
  display: 'inline-block',
  background: 'transparent',
  cursor: 'pointer',
}
