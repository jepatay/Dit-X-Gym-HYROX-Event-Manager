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
import WaveBuilder from '../components/WaveBuilder'
import ChecklistPanel from '../components/ChecklistPanel'
import TeamForm from '../components/TeamForm'
import HelperCard from '../components/HelperCard'
import WeightCheatSheet from '../components/WeightCheatSheet'
import SaveConfirmation from '../components/SaveConfirmation'
import { generateSlug } from '../utils/slugUtils'
import { getOrCreateConfig } from '../utils/firestoreUtils'
import { slotTime } from '../utils/timeUtils'

const TABS = ['Info', 'Waves', 'Teams', 'Checklist', 'Event Setup']

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
  const [status, setStatus] = useState('future')
  const [links, setLinks] = useState([])
  const [waves, setWaves] = useState([])
  const [checklist, setChecklist] = useState({})
  const [maps, setMaps] = useState({})
  const [helpers, setHelpers] = useState([])
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
    setStatus(d.status || 'future')
    setLinks(d.links || [])
    setWaves(d.waves || [])
    setChecklist(d.checklist || {})
    setMaps(d.maps || {})
    setHelpers(d.helpers || [])
    setWeightOverrides(d.weightOverrides || {})
    setPublicSlug(d.publicSlug || '')
  }

  function buildData(slug) {
    return { name, date, eventType, status, links, waves, checklist, maps, helpers, weightOverrides, publicSlug: slug }
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

        <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', marginBottom: 32, overflowX: 'auto' }}>
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
            status={status} setStatus={setStatus}
            links={links} setLinks={setLinks}
            onSave={saveEvent} saved={saved}
          />
        )}
        {tab === 1 && (
          <WaveBuilder
            waves={waves} setWaves={setWaves}
            config={config}
            onSave={saveEvent} saved={saved}
          />
        )}
        {tab === 2 && (
          <TeamsTab eventId={eventId} waves={waves} config={config} />
        )}
        {tab === 3 && (
          <ChecklistPanel
            checklist={checklist} setChecklist={setChecklist}
            config={config}
            onSave={saveEvent} saved={saved}
          />
        )}
        {tab === 4 && (
          <EventSetupTab
            maps={maps} setMaps={setMaps}
            helpers={helpers} setHelpers={setHelpers}
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

function InfoTab({ name, setName, date, setDate, eventType, setEventType, status, setStatus, links, setLinks, onSave, saved }) {
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
      <Field label="Status">
        <div style={{ display: 'flex', gap: 8 }}>
          {['future', 'live', 'past'].map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              style={{
                padding: '8px 18px',
                background: 'transparent',
                border: '1px solid ' + (status === s ? 'var(--color-accent)' : 'var(--color-border)'),
                color: status === s ? 'var(--color-accent)' : 'var(--color-text-muted)',
                fontFamily: 'var(--font-heading)',
                fontSize: 13,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                cursor: 'pointer',
              }}
            >{s}</button>
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

function TeamsTab({ eventId, waves, config }) {
  const [teams, setTeams] = useState([])
  const [adding, setAdding] = useState(null)
  const [editingTeam, setEditingTeam] = useState(null)

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

  const activeWaves = waves.filter(w => !w.isRestWave)

  if (!eventId) {
    return <p style={{ color: 'var(--color-text-muted)', padding: '24px 0' }}>Save the event first before adding teams.</p>
  }

  return (
    <div>
      {activeWaves.length === 0 && (
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 24 }}>
          Add waves in the Waves tab first, then return here to add athletes.
        </p>
      )}
      {activeWaves.map(wave => {
        const waveTeams = teams.filter(t => t.waveId === wave.id).sort((a, b) => a.bibNumber - b.bibNumber)
        const category = config?.categories?.find(c => c.id === wave.categoryId)
        const isDouble = category?.type === 'double'

        return (
          <div key={wave.id} style={{ marginBottom: 40 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <h3 style={{ fontSize: 18 }}>
                {wave.label}
                <span style={{ fontWeight: 400, color: 'var(--color-text-muted)', marginLeft: 12, fontSize: 14 }}>
                  {wave.startTime} — {category?.label || wave.categoryId}
                </span>
              </h3>
              <button onClick={() => setAdding(wave.id)} style={btnSecondary}>
                + Add {isDouble ? 'Team' : 'Athlete'}
              </button>
            </div>

            {adding === wave.id && (
              <TeamForm
                wave={wave}
                eventId={eventId}
                isDouble={isDouble}
                teams={teams}
                config={config}
                onSaved={(newTeam) => { setTeams(ts => [...ts, newTeam]); setAdding(null) }}
                onCancel={() => setAdding(null)}
              />
            )}

            {waveTeams.length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)', fontSize: 13, padding: '10px 0', borderBottom: '1px solid var(--color-border)' }}>
                No athletes in this wave
              </p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Bib</th>
                    <th>Name</th>
                    <th>Time</th>
                    <th>Athlete(s)</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {waveTeams.map(team => (
                    <tr key={team.id}>
                      <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent)', fontWeight: 500 }}>{team.bibNumber}</td>
                      <td style={{ fontWeight: 600 }}>{team.name}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{team.scheduledTime}</td>
                      <td style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                        {team.athlete1?.firstName} {team.athlete1?.lastName}
                        {team.athlete2?.firstName && (
                          <span> / {team.athlete2.firstName} {team.athlete2.lastName}</span>
                        )}
                        {isDouble && !team.athlete2Confirmed && (
                          <span style={{
                            marginLeft: 8,
                            fontSize: 10,
                            background: 'rgba(245,158,11,0.15)',
                            color: 'var(--color-warning)',
                            padding: '2px 6px',
                            fontFamily: 'var(--font-heading)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                          }}>Partner pending</span>
                        )}
                      </td>
                      <td>
                        {team.checkedIn ? (
                          <span style={{ color: 'var(--color-success)', fontFamily: 'var(--font-heading)', fontSize: 11, textTransform: 'uppercase' }}>✓ Checked in</span>
                        ) : (
                          <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>—</span>
                        )}
                      </td>
                      <td>
                        <button onClick={() => deleteTeam(team.id)} style={iconBtnRed}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )
      })}
    </div>
  )
}

function EventSetupTab({ maps, setMaps, helpers, setHelpers, weightOverrides, setWeightOverrides, config, onSave, saved, eventId }) {
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
    } finally {
      setUploading(u => ({ ...u, [type]: false }))
    }
  }

  function addHelper() {
    setHelpers(hs => [...hs, { name: '', role: '', station: '', photoUrl: '' }])
  }

  function updateHelper(i, val) {
    setHelpers(hs => hs.map((h, j) => j === i ? val : h))
  }

  function deleteHelper(i) {
    setHelpers(hs => hs.filter((_, j) => j !== i))
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

      <Section title={`Helpers (${helpers.length})`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
          {helpers.map((h, i) => (
            <HelperCard key={i} helper={h} index={i} onUpdate={updateHelper} onDelete={deleteHelper} />
          ))}
        </div>
        <button type="button" onClick={addHelper} style={btnSecondary}>+ Add Helper</button>
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
