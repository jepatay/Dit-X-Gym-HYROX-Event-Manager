import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  doc, getDoc, setDoc, collection, getDocs, query, where,
  addDoc, serverTimestamp, deleteDoc, updateDoc,
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../firebase'
import NavBar from '../components/NavBar'
import CalendarPicker from '../components/CalendarPicker'
import ChecklistPanel from '../components/ChecklistPanel'
import TeamForm from '../components/TeamForm'
import WeightCheatSheet from '../components/WeightCheatSheet'
import SaveConfirmation from '../components/SaveConfirmation'
import { generateSlug } from '../utils/slugUtils'
import { getOrCreateConfig } from '../utils/firestoreUtils'
import { generateRef } from '../utils/bibUtils'

const TABS = ['Info', 'Teams', 'Checklist', 'Event Setup']

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
  const [checklist, setChecklist] = useState({})
  const [maps, setMaps] = useState({})
  const [selectedStaffIds, setSelectedStaffIds] = useState([])
  const [weightOverrides, setWeightOverrides] = useState({})
  const [publicSlug, setPublicSlug] = useState('')

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
    setChecklist(d.checklist || {})
    setMaps(d.maps || {})
    setSelectedStaffIds(d.selectedStaffIds || [])
    setWeightOverrides(d.weightOverrides || {})
    setPublicSlug(d.publicSlug || '')
  }

  function buildData(slug) {
    const today = new Date().toISOString().substring(0, 10)
    const status = date < today ? 'past' : date === today ? 'live' : 'future'
    return { name, date, eventType, status, links, waves, lanes, checklist, maps, selectedStaffIds, weightOverrides, publicSlug: slug }
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
          />
        )}
        {tab === 1 && (
          <TeamsTab eventId={eventId} lanes={lanes} config={config} />
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
            weightOverrides={weightOverrides} setWeightOverrides={setWeightOverrides}
            config={config}
            onSave={saveEvent} saved={saved}
            eventId={eventId}
          />
        )}
      </div>
    </div>
  )
}

function InfoTab({ name, setName, date, setDate, eventType, setEventType, lanes, setLanes, links, setLinks, onSave, saved }) {
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 32 }}>
        <button type="button" onClick={onSave} style={btnPrimary}>Save</button>
        <SaveConfirmation trigger={saved} />
      </div>
    </div>
  )
}

function addMinutes(timeStr, mins) {
  const [h, m] = (timeStr || '00:00').split(':').map(Number)
  const total = h * 60 + m + mins
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

function TeamsTab({ eventId, lanes, config }) {
  const [teams, setTeams] = useState([])
  const [adding, setAdding] = useState(null) // { time, laneIndex }
  const [moving, setMoving] = useState(null) // teamId
  const [moveTo, setMoveTo] = useState('')
  const [newSlotTime, setNewSlotTime] = useState('')

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

  async function doMoveTeam(team) {
    const dest = moveTo.trim()
    if (!dest) return
    const teamsAtDest = teams.filter(t => t.id !== team.id && t.scheduledTime === dest)
    const laneIndex = teamsAtDest.length
    const newRef = generateRef(dest, laneIndex)
    await updateDoc(doc(db, 'teams', team.id), { scheduledTime: dest, ref: newRef })
    setTeams(ts => ts.map(t => t.id === team.id ? { ...t, scheduledTime: dest, ref: newRef } : t))
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
  const lastTime = sortedTimes[sortedTimes.length - 1] || null
  const effectiveLanes = lanes || 4

  if (!eventId) return <p style={{ color: 'var(--color-text-muted)', padding: '24px 0' }}>Save the event first before adding teams.</p>

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, paddingBottom: 6, borderBottom: '2px solid var(--color-border)', marginBottom: 2 }}>
        <div style={{ width: 54, flexShrink: 0, fontSize: 10, fontFamily: 'var(--font-heading)', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-text-muted)' }}>Time</div>
        {Array.from({ length: effectiveLanes }, (_, i) => (
          <div key={i} style={{ flex: 1, fontSize: 10, fontFamily: 'var(--font-heading)', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-text-muted)' }}>Lane {i + 1}</div>
        ))}
      </div>

      {sortedTimes.length === 0 && (
        <p style={{ color: 'var(--color-text-muted)', padding: '24px 0' }}>No time slots yet. Add one below.</p>
      )}

      {sortedTimes.map(time => {
        const slotTeams = [...timeMap[time]].sort((a, b) => (a.ref || '').localeCompare(b.ref || '') || (a.bibNumber || 0) - (b.bibNumber || 0))
        const emptyLanes = Math.max(0, effectiveLanes - slotTeams.length)
        const isAddingHere = adding?.time === time

        return (
          <div key={time}>
            <div style={{ display: 'flex', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--color-border)', alignItems: 'stretch', minHeight: 60 }}>
              <div style={{ width: 54, flexShrink: 0, fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--color-text-muted)', paddingTop: 10 }}>{time}</div>
              {slotTeams.map(team => (
                <div key={team.id} style={{ flex: 1, background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', padding: '8px 10px', minWidth: 0, position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 4 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent)', fontWeight: 700, fontSize: 13 }}>{team.ref || `#${team.bibNumber}`}</span>
                    <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
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
                  onClick={() => setAdding(isAddingHere && adding?.laneIndex === slotTeams.length + i ? null : { time, laneIndex: slotTeams.length + i })}
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
                onSaved={(newTeam) => { setTeams(ts => [...ts, newTeam]); setAdding(null) }}
                onCancel={() => setAdding(null)}
              />
            )}
          </div>
        )
      })}

      {unknownTeams.length > 0 && (
        <div style={{ marginTop: 16, padding: 12, border: '1px solid var(--color-border)', background: 'var(--color-surface-raised)' }}>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'var(--font-heading)', textTransform: 'uppercase', marginBottom: 8 }}>No time assigned</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {unknownTeams.map(team => (
              <div key={team.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--color-bg)', border: '1px solid var(--color-border)', padding: '6px 10px' }}>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent)', fontWeight: 700, fontSize: 13 }}>{team.ref || `#${team.bibNumber}`}</span>
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
            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              {[5, 10].map(mins => {
                const t = addMinutes(lastTime, mins)
                return (
                  <button
                    key={mins}
                    onClick={() => setAdding({ time: t, laneIndex: 0 })}
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
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'var(--font-heading)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>or custom:</span>
              <input
                type="time"
                value={newSlotTime}
                onChange={e => setNewSlotTime(e.target.value)}
                style={{ padding: '7px 10px', background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)', fontFamily: 'var(--font-mono)', fontSize: 13 }}
              />
              <button
                onClick={() => { if (newSlotTime) { setAdding({ time: newSlotTime, laneIndex: 0 }); setNewSlotTime('') } }}
                disabled={!newSlotTime}
                style={{ ...btnPrimary, opacity: newSlotTime ? 1 : 0.5 }}
              >Add</button>
            </div>
          </div>
        ) : (
          /* First slot: time picker is the focus */
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input
              type="time"
              value={newSlotTime}
              onChange={e => setNewSlotTime(e.target.value)}
              style={{ padding: '10px 14px', background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)', fontFamily: 'var(--font-mono)', fontSize: 16, minWidth: 140 }}
            />
            <button
              onClick={() => { if (newSlotTime) { setAdding({ time: newSlotTime, laneIndex: 0 }); setNewSlotTime('') } }}
              disabled={!newSlotTime}
              style={{ ...btnPrimary, opacity: newSlotTime ? 1 : 0.5 }}
            >Add Slot</button>
          </div>
        )}
      </div>
    </div>
  )
}

function EventSetupTab({ maps, setMaps, selectedStaffIds, setSelectedStaffIds, weightOverrides, setWeightOverrides, config, onSave, saved, eventId }) {
  const gymRef = useRef()
  const runRef = useRef()
  const [uploading, setUploading] = useState({})

  async function uploadMap(type, file) {
    if (!file) return
    setUploading(u => ({ ...u, [type]: true }))
    try {
      const storageRef = ref(storage, `maps/${eventId}/${type}-${Date.now()}-${file.name}`)
      await uploadBytes(storageRef, file)
      const url = await getDownloadURL(storageRef)
      setMaps(m => ({ ...m, [type]: url }))
      if (eventId) {
        await updateDoc(doc(db, 'events', eventId), { [`maps.${type}`]: url })
      }
    } finally {
      setUploading(u => ({ ...u, [type]: false }))
    }
  }

  function toggleStaff(id) {
    setSelectedStaffIds(ids => ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id])
  }

  return (
    <div>
      <Section title="Maps">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 8 }}>
          <MapUpload
            label="Gym Layout"
            url={maps.gymLayout}
            uploading={uploading.gymLayout}
            fileRef={gymRef}
            onFile={f => uploadMap('gymLayout', f)}
          />
          <MapUpload
            label="Run Route"
            url={maps.runRoute}
            uploading={uploading.runRoute}
            fileRef={runRef}
            onFile={f => uploadMap('runRoute', f)}
          />
        </div>
        <input ref={gymRef} type="file" accept="image/*" onChange={e => uploadMap('gymLayout', e.target.files[0])} style={{ display: 'none' }} />
        <input ref={runRef} type="file" accept="image/*" onChange={e => uploadMap('runRoute', e.target.files[0])} style={{ display: 'none' }} />
      </Section>

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

      <Section title="Weight Cheat Sheet">
        <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 12 }}>
          Overrides apply to this event only. Leave blank to use global defaults.
        </p>
        <WeightCheatSheet config={config} overrides={weightOverrides} setOverrides={setWeightOverrides} />
      </Section>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 24 }}>
        <button type="button" onClick={onSave} style={btnPrimary}>Save</button>
        <SaveConfirmation trigger={saved} />
      </div>
    </div>
  )
}

function MapUpload({ label, url, uploading, fileRef, onFile }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontFamily: 'var(--font-heading)', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-text-muted)', marginBottom: 8 }}>
        {label}
      </div>
      {url ? (
        <div>
          <img src={url} alt={label} style={{ width: '100%', maxHeight: 200, objectFit: 'cover', marginBottom: 8 }} />
          <button type="button" onClick={() => fileRef.current.click()} style={btnSecondary} disabled={uploading}>
            {uploading ? 'Uploading...' : 'Replace'}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current.click()}
          disabled={uploading}
          style={{
            width: '100%',
            height: 120,
            background: 'var(--color-surface-raised)',
            border: '2px dashed var(--color-border)',
            color: 'var(--color-text-muted)',
            fontFamily: 'var(--font-heading)',
            fontSize: 13,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            cursor: 'pointer',
          }}
        >
          {uploading ? 'Uploading...' : '+ Upload Image'}
        </button>
      )}
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
