import { useEffect, useRef, useState } from 'react'
import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, firebaseConfig, storage } from '../firebase'
import NavBar from '../components/NavBar'
import SaveConfirmation from '../components/SaveConfirmation'
import { DEFAULT_CONFIG, getOrCreateConfig, buildDefaultStations } from '../utils/firestoreUtils'

const TABS = ['Categories', 'Stations', 'Checklist', 'Staff', 'Admin Users', 'Pictures']

export default function Settings() {
  const [tab, setTab] = useState(0)
  const [config, setConfig] = useState(null)
  const [saved, setSaved] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadConfig()
  }, [])

  async function loadConfig() {
    const data = await getOrCreateConfig()
    setConfig(data)
    setLoading(false)
  }

  async function saveConfig(updated) {
    await setDoc(doc(db, 'config', 'main'), updated)
    setConfig(updated)
    setSaved(s => s + 1)
  }

  if (loading) return <div><NavBar /><p style={{ padding: 32, color: 'var(--color-text-muted)' }}>Loading...</p></div>

  return (
    <div>
      <NavBar />
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px' }}>
        <h1 style={{ fontSize: 32, marginBottom: 24 }}>Settings</h1>

        <div className="hide-scrollbar" style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', marginBottom: 32, overflowX: 'auto' }}>
          {TABS.map((t, i) => (
            <button key={t} onClick={() => setTab(i)} style={{
              padding: '10px 18px',
              background: 'transparent',
              border: 'none',
              borderBottom: tab === i ? '2px solid var(--color-accent)' : '2px solid transparent',
              color: tab === i ? 'var(--color-text)' : 'var(--color-text-muted)',
              fontFamily: 'var(--font-heading)',
              fontSize: 13,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              cursor: 'pointer',
              marginBottom: -1,
              whiteSpace: 'nowrap',
            }}>{t}</button>
          ))}
        </div>

        {tab === 0 && <CategoriesTab config={config} onSave={saveConfig} saved={saved} />}
        {tab === 1 && <StationsTab config={config} onSave={saveConfig} saved={saved} />}
        {tab === 2 && <ChecklistTab config={config} onSave={saveConfig} saved={saved} />}
        {tab === 3 && <StaffTab config={config} onSave={saveConfig} saved={saved} />}
        {tab === 4 && <AdminUsersTab />}
        {tab === 5 && <PicturesTab config={config} onSave={saveConfig} />}
      </div>
    </div>
  )
}

function CategoriesTab({ config, onSave, saved }) {
  const [cats, setCats] = useState(config?.categories || [])
  const [newLabel, setNewLabel] = useState('')
  const [newAthleteType, setNewAthleteType] = useState('single')
  const [newEventType, setNewEventType] = useState('hyrox')

  function updateLabel(id, label) {
    setCats(cs => cs.map(c => c.id === id ? { ...c, label } : c))
  }

  function removeCategory(id) {
    if (!confirm('Remove this category?')) return
    setCats(cs => cs.filter(c => c.id !== id))
  }

  function resetToDefaults() {
    if (!confirm('Reset categories to defaults? Custom categories will be lost.')) return
    setCats(DEFAULT_CONFIG.categories)
  }

  function addCategory() {
    if (!newLabel.trim()) return
    const id = 'custom_' + newLabel.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') + '_' + Date.now()
    setCats(cs => [...cs, { id, label: newLabel.trim(), type: newAthleteType, eventType: newEventType, enabled: true }])
    setNewLabel('')
  }

  const EVENT_TYPES = [
    { id: 'hyrox', label: 'HYROX', color: '#e8621a' },
    { id: 'hybrid', label: 'HYBRID', color: '#3b82f6' },
    { id: 'custom', label: 'CUSTOM', color: '#7a9abe' },
  ]

  const grouped = EVENT_TYPES.map(et => ({
    ...et,
    cats: cats.filter(c => (c.eventType || 'hyrox') === et.id),
  })).filter(g => g.cats.length > 0)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 13, margin: 0 }}>
          Categories are grouped by event type and appear in wave selection accordingly.
        </p>
        <button onClick={resetToDefaults} style={btnSecondary}>Reset to Defaults</button>
      </div>

      {grouped.map(group => (
        <div key={group.id} style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, paddingBottom: 6, borderBottom: `2px solid ${group.color}` }}>
            <span style={{ fontFamily: 'var(--font-heading)', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: group.color }}>{group.label}</span>
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{group.cats.length} categories</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {group.cats.map(cat => (
              <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <input
                  value={cat.label}
                  onChange={e => updateLabel(cat.id, e.target.value)}
                  style={{ width: 220, minWidth: 0, background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)', padding: '6px 10px', fontSize: 13 }}
                />
                <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'var(--font-heading)', textTransform: 'uppercase', letterSpacing: '0.05em', background: 'var(--color-surface-raised)', padding: '3px 8px', border: '1px solid var(--color-border)' }}>
                  {cat.type === 'double' ? 'Double' : 'Single'}
                </span>
                <button onClick={() => removeCategory(cat.id)} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: 14, padding: '4px 8px' }}>✕</button>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div style={{ marginTop: 8, padding: '16px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontFamily: 'var(--font-heading)', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-text-muted)', marginBottom: 12 }}>Add Custom Category</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            placeholder="Category name..."
            style={{ ...inputStyle, flex: 1, minWidth: 160 }}
            onKeyDown={e => e.key === 'Enter' && addCategory()}
          />
          <select value={newAthleteType} onChange={e => setNewAthleteType(e.target.value)} style={selectStyle}>
            <option value="single">Single</option>
            <option value="double">Double</option>
          </select>
          <select value={newEventType} onChange={e => setNewEventType(e.target.value)} style={selectStyle}>
            <option value="hyrox">HYROX</option>
            <option value="hybrid">HYBRID</option>
            <option value="custom">CUSTOM</option>
          </select>
          <button onClick={addCategory} style={btnSecondary}>+ Add</button>
        </div>
      </div>

      <SaveBar onSave={() => onSave({ ...config, categories: cats })} saved={saved} />
    </div>
  )
}

function StationsTab({ config, onSave, saved }) {
  const enabledCats = (config?.categories || [])

  function initStations() {
    const result = {}
    for (const cat of enabledCats) {
      const existing = config?.categoryStations?.[cat.id]
      result[cat.id] = existing ? [...existing] : buildDefaultStations(cat.id, config?.weightCheatSheet?.[cat.id])
    }
    return result
  }

  const [stations, setStations] = useState(initStations)
  const [expandedId, setExpandedId] = useState(null)

  function updateStation(catId, idx, field, value) {
    setStations(prev => ({
      ...prev,
      [catId]: prev[catId].map((s, i) => i === idx ? { ...s, [field]: value } : s),
    }))
  }

  function addStation(catId) {
    setStations(prev => ({
      ...prev,
      [catId]: [...(prev[catId] || []), { order: (prev[catId]?.length || 0) + 1, label: '', value: '' }],
    }))
  }

  function removeStation(catId, idx) {
    setStations(prev => ({
      ...prev,
      [catId]: prev[catId].filter((_, i) => i !== idx),
    }))
  }

  return (
    <div>
      <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginBottom: 20 }}>
        Configure stations per category. Pre-filled with standard HYROX defaults. Free-text values (e.g. 1000m / 102kg / 24kg each).
      </p>
      {['hyrox', 'hybrid', 'custom'].map(evType => {
        const typeCats = enabledCats.filter(c => (c.eventType || 'hyrox') === evType)
        if (typeCats.length === 0) return null
        const typeColor = evType === 'hyrox' ? '#e8621a' : evType === 'hybrid' ? '#3b82f6' : '#7a9abe'
        return (
          <div key={evType} style={{ marginBottom: 28 }}>
            <div style={{ paddingBottom: 8, marginBottom: 10, borderBottom: `2px solid ${typeColor}` }}>
              <span style={{ fontFamily: 'var(--font-heading)', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: typeColor }}>{evType.toUpperCase()}</span>
            </div>
            {typeCats.map(cat => {
        const catStations = stations[cat.id] || []
        const isOpen = expandedId === cat.id
        return (
          <div key={cat.id} style={{ marginBottom: 8, background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <div
              style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
              onClick={() => setExpandedId(isOpen ? null : cat.id)}
            >
              <span style={{ fontFamily: 'var(--font-heading)', fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{cat.label}</span>
              <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>{catStations.length} stations — {isOpen ? '▲' : '▼'}</span>
            </div>
            {isOpen && (
              <div style={{ borderTop: '1px solid var(--color-border)', padding: 16 }}>
                {catStations.map((st, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-muted)', minWidth: 22, textAlign: 'right' }}>{st.order || i + 1}</span>
                    <input
                      value={st.label}
                      onChange={e => updateStation(cat.id, i, 'label', e.target.value)}
                      style={{ ...inputStyle, flex: 1 }}
                      placeholder="Station name"
                    />
                    <input
                      value={st.value}
                      onChange={e => updateStation(cat.id, i, 'value', e.target.value)}
                      style={{ ...inputStyle, width: 160 }}
                      placeholder="e.g. 1000m / 102kg"
                    />
                    <button onClick={() => removeStation(cat.id, i)} style={iconBtnRed}>✕</button>
                  </div>
                ))}
                <button onClick={() => addStation(cat.id)} style={btnSecondary}>+ Add Station</button>
              </div>
            )}
          </div>
        )
            })}
          </div>
        )
      })}
      <SaveBar onSave={() => onSave({ ...config, categoryStations: stations })} saved={saved} />
    </div>
  )
}

function ChecklistTab({ config, onSave, saved }) {
  const [items, setItems] = useState(config?.checklistItems || [])
  const [newText, setNewText] = useState('')
  const [newCat, setNewCat] = useState('Setup')

  const categories = [...new Set(items.map(i => i.category))]

  function addItem() {
    if (!newText.trim()) return
    const id = `cl_custom_${Date.now()}`
    setItems(prev => [...prev, { id, category: newCat, order: prev.length + 1, text: newText.trim() }])
    setNewText('')
  }

  function removeItem(id) {
    if (!confirm('Delete this checklist item?')) return
    setItems(prev => prev.filter(i => i.id !== id))
  }

  return (
    <div>
      {categories.map(cat => (
        <div key={cat} style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 10 }}>{cat}</h3>
          {items.filter(i => i.category === cat).sort((a, b) => a.order - b.order).map(item => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, padding: '8px 12px', background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <span style={{ flex: 1, fontSize: 14 }}>{item.text}</span>
              <button onClick={() => removeItem(item.id)} style={iconBtnRed}>✕</button>
            </div>
          ))}
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <select value={newCat} onChange={e => setNewCat(e.target.value)} style={{ ...selectStyle, minWidth: 120 }}>
          {[...categories, 'New Category'].map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input value={newText} onChange={e => setNewText(e.target.value)} placeholder="New checklist item..." style={{ ...inputStyle, flex: 1, minWidth: 200 }} onKeyDown={e => e.key === 'Enter' && addItem()} />
        <button onClick={addItem} style={btnSecondary}>+ Add</button>
      </div>
      <SaveBar onSave={() => onSave({ ...config, checklistItems: items })} saved={saved} />
    </div>
  )
}

function StaffTab({ config, onSave, saved }) {
  const [staff, setStaff] = useState(config?.staff || [])

  function addMember() {
    setStaff(s => [...s, { id: `staff_${Date.now()}`, name: '', role: '', station: '', photoUrl: '' }])
  }

  function updateMember(id, val) {
    setStaff(s => s.map(m => m.id === id ? { ...m, ...val } : m))
  }

  function deleteMember(id) {
    if (!confirm('Remove this staff member?')) return
    setStaff(s => s.filter(m => m.id !== id))
  }

  return (
    <div>
      <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginBottom: 20 }}>
        Manage your staff database here. Then select active staff per event.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
        {staff.map(member => (
          <StaffCard key={member.id} member={member} onUpdate={val => updateMember(member.id, val)} onDelete={() => deleteMember(member.id)} />
        ))}
      </div>
      <button onClick={addMember} style={btnSecondary}>+ Add Staff Member</button>
      <SaveBar onSave={() => onSave({ ...config, staff })} saved={saved} />
    </div>
  )
}

function StaffCard({ member, onUpdate, onDelete }) {
  const fileRef = useRef()
  const [uploading, setUploading] = useState(false)

  async function handlePhoto(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      const storageRef = ref(storage, `staff/${member.id}-${Date.now()}-${file.name}`)
      await uploadBytes(storageRef, file)
      const url = await getDownloadURL(storageRef)
      onUpdate({ photoUrl: url })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', padding: 14, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
      <div style={{ flexShrink: 0 }}>
        {member.photoUrl ? (
          <img src={member.photoUrl} alt={member.name} style={{ width: 56, height: 56, objectFit: 'cover' }} />
        ) : (
          <div style={{ width: 56, height: 56, background: 'var(--color-bg)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: 20 }}>?</div>
        )}
        <button type="button" onClick={() => fileRef.current.click()} disabled={uploading} style={{ marginTop: 4, width: '100%', background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: 10, padding: '3px 6px', cursor: 'pointer', fontFamily: 'var(--font-heading)', textTransform: 'uppercase' }}>
          {uploading ? '...' : 'Photo'}
        </button>
        <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} style={{ display: 'none' }} />
      </div>
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <input value={member.name || ''} onChange={e => onUpdate({ name: e.target.value })} placeholder="Name" style={inputStyle} />
        <input value={member.role || ''} onChange={e => onUpdate({ role: e.target.value })} placeholder="Role" style={inputStyle} />
        <input value={member.station || ''} onChange={e => onUpdate({ station: e.target.value })} placeholder="Station" style={{ ...inputStyle, gridColumn: '1 / -1' }} />
      </div>
      <button type="button" onClick={onDelete} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', fontSize: 16, cursor: 'pointer', padding: 4 }}>✕</button>
    </div>
  )
}

function AdminUsersTab() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [creating, setCreating] = useState(false)
  const [message, setMessage] = useState(null)

  async function createUser() {
    if (!email || !password) return
    setCreating(true)
    setMessage(null)
    try {
      const secondaryApp = getApps().find(a => a.name === 'secondary')
        ? getApp('secondary')
        : initializeApp(firebaseConfig, 'secondary')
      const secondaryAuth = getAuth(secondaryApp)
      await createUserWithEmailAndPassword(secondaryAuth, email, password)
      await secondaryAuth.signOut()
      setMessage({ type: 'success', text: `User ${email} created successfully.` })
      setEmail('')
      setPassword('')
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setCreating(false)
    }
  }

  return (
    <div style={{ maxWidth: 480 }}>
      <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginBottom: 20 }}>
        Create a new admin user. They can log in immediately with the provided credentials.
      </p>
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', padding: '20px 24px' }}>
        <h3 style={{ fontSize: 15, marginBottom: 16, fontFamily: 'var(--font-heading)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Create User</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Email address"
            style={{ ...inputStyle, fontSize: 14, width: '100%' }}
            onKeyDown={e => e.key === 'Enter' && createUser()}
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password (min. 6 characters)"
            style={{ ...inputStyle, fontSize: 14, width: '100%' }}
            onKeyDown={e => e.key === 'Enter' && createUser()}
          />
        </div>
        {message && (
          <p style={{ fontSize: 13, marginBottom: 14, color: message.type === 'success' ? 'var(--color-success)' : 'var(--color-accent)' }}>
            {message.text}
          </p>
        )}
        <button onClick={createUser} disabled={creating || !email || !password} style={{ ...btnPrimary, opacity: (creating || !email || !password) ? 0.5 : 1 }}>
          {creating ? 'Creating...' : 'Create User'}
        </button>
      </div>
    </div>
  )
}

function PicturesTab({ config, onSave }) {
  const fileRef = useRef()
  const [uploading, setUploading] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const pictures = config?.pictures || []

  async function handleUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      const id = `pic_${Date.now()}`
      const storageRef = ref(storage, `pictures/${id}-${file.name}`)
      await uploadBytes(storageRef, file)
      const url = await getDownloadURL(storageRef)
      const name = nameInput.trim() || file.name
      await onSave({ ...config, pictures: [...pictures, { id, name, url }] })
      setNameInput('')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function deletePicture(picId) {
    if (!confirm('Remove this picture from the library?')) return
    await onSave({ ...config, pictures: pictures.filter(p => p.id !== picId) })
  }

  return (
    <div>
      <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginBottom: 20 }}>
        Upload pictures to the shared library. Select them in each event's Event Setup tab (Maps section).
      </p>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 24, flexWrap: 'wrap' }}>
        <input
          value={nameInput}
          onChange={e => setNameInput(e.target.value)}
          placeholder="Optional label..."
          style={{ ...inputStyle, width: 200 }}
        />
        <button onClick={() => fileRef.current.click()} disabled={uploading} style={btnSecondary}>
          {uploading ? 'Uploading...' : '+ Upload Picture'}
        </button>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} style={{ display: 'none' }} />
      </div>
      {pictures.length === 0 ? (
        <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>No pictures yet.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
          {pictures.map(pic => (
            <div key={pic.id} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
              <img src={pic.url} alt={pic.name} style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }} />
              <div style={{ padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{pic.name}</span>
                <button onClick={() => deletePicture(pic.id)} style={iconBtnRed}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SaveBar({ onSave, saved }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 24 }}>
      <button onClick={onSave} style={btnPrimary}>Save Changes</button>
      <SaveConfirmation trigger={saved} />
    </div>
  )
}

const inputStyle = { padding: '8px 10px', background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)', fontSize: 13 }
const selectStyle = { padding: '8px 10px', background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)', fontSize: 13 }
const btnPrimary = { padding: '10px 24px', background: 'var(--color-accent)', color: '#fff', border: 'none', fontFamily: 'var(--font-heading)', fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer' }
const btnSecondary = { padding: '8px 18px', background: 'transparent', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)', fontFamily: 'var(--font-heading)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer' }
const iconBtnRed = { background: 'transparent', border: 'none', color: 'var(--color-accent)', cursor: 'pointer', fontSize: 14, padding: '4px 6px' }
