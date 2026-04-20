import { useEffect, useState } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../firebase'
import NavBar from '../components/NavBar'
import WeightCheatSheet from '../components/WeightCheatSheet'
import SaveConfirmation from '../components/SaveConfirmation'
import { DEFAULT_CONFIG } from '../utils/firestoreUtils'

const TABS = ['Categories', 'Station Templates', 'Checklist', 'Weights', 'Admin Users']

export default function Settings() {
  const [tab, setTab] = useState(0)
  const [config, setConfig] = useState(null)
  const [saved, setSaved] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadConfig()
  }, [])

  async function loadConfig() {
    const snap = await getDoc(doc(db, 'config', 'main'))
    setConfig(snap.exists() ? snap.data() : DEFAULT_CONFIG)
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

        <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', marginBottom: 32, overflowX: 'auto' }}>
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
        {tab === 1 && <TemplatesTab config={config} onSave={saveConfig} saved={saved} />}
        {tab === 2 && <ChecklistTab config={config} onSave={saveConfig} saved={saved} />}
        {tab === 3 && <WeightsTab config={config} onSave={saveConfig} saved={saved} />}
        {tab === 4 && <AdminUsersTab />}
      </div>
    </div>
  )
}

function CategoriesTab({ config, onSave, saved }) {
  const [cats, setCats] = useState(config?.categories || [])

  function toggle(id) {
    setCats(cs => cs.map(c => c.id === id ? { ...c, enabled: !c.enabled } : c))
  }

  function updateLabel(id, label) {
    setCats(cs => cs.map(c => c.id === id ? { ...c, label } : c))
  }

  function resetToDefaults() {
    if (!confirm('Reset categories to defaults? This will restore the standard list and disable any removed categories. Your custom labels will be lost.')) return
    setCats(DEFAULT_CONFIG.categories)
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 13, margin: 0 }}>
          You can rename or disable categories. Use "Reset to Defaults" to restore the standard list.
        </p>
        <button onClick={resetToDefaults} style={btnSecondary}>Reset to Defaults</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
        {cats.map(cat => (
          <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <input
              value={cat.label}
              onChange={e => updateLabel(cat.id, e.target.value)}
              style={{ flex: 1, background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)', padding: '6px 10px', fontSize: 14 }}
            />
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'var(--font-heading)', textTransform: 'uppercase', minWidth: 50 }}>{cat.type}</span>
            <button
              onClick={() => toggle(cat.id)}
              style={{
                padding: '5px 14px',
                background: cat.enabled !== false ? 'rgba(34,197,94,0.1)' : 'transparent',
                border: '1px solid ' + (cat.enabled !== false ? 'rgba(34,197,94,0.3)' : 'var(--color-border)'),
                color: cat.enabled !== false ? 'var(--color-success)' : 'var(--color-text-muted)',
                fontFamily: 'var(--font-heading)',
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                cursor: 'pointer',
              }}
            >{cat.enabled !== false ? 'Enabled' : 'Disabled'}</button>
          </div>
        ))}
      </div>
      <SaveBar onSave={() => onSave({ ...config, categories: cats })} saved={saved} />
    </div>
  )
}

function TemplatesTab({ config, onSave, saved }) {
  const [templates, setTemplates] = useState(config?.stationTemplates || [])
  const [expandedId, setExpandedId] = useState(null)

  function updateStation(tplId, stIdx, field, value) {
    setTemplates(ts => ts.map(t => t.id !== tplId ? t : {
      ...t,
      stations: t.stations.map((s, i) => i === stIdx ? { ...s, [field]: value } : s),
    }))
  }

  function addStation(tplId) {
    setTemplates(ts => ts.map(t => t.id !== tplId ? t : {
      ...t,
      stations: [...t.stations, { order: t.stations.length + 1, type: 'station', label: '', reps_or_distance: '' }],
    }))
  }

  function removeStation(tplId, stIdx) {
    setTemplates(ts => ts.map(t => t.id !== tplId ? t : {
      ...t,
      stations: t.stations.filter((_, i) => i !== stIdx),
    }))
  }

  return (
    <div>
      {templates.map(tpl => (
        <div key={tpl.id} style={{ marginBottom: 20, background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <div
            style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
            onClick={() => setExpandedId(expandedId === tpl.id ? null : tpl.id)}
          >
            <span style={{ fontFamily: 'var(--font-heading)', fontSize: 16 }}>{tpl.label}</span>
            <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>{tpl.stations?.length} stations — {expandedId === tpl.id ? '▲' : '▼'}</span>
          </div>
          {expandedId === tpl.id && (
            <div style={{ borderTop: '1px solid var(--color-border)', padding: 16 }}>
              {tpl.stations?.map((st, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-muted)', minWidth: 24, textAlign: 'right' }}>{st.order}</span>
                  <select value={st.type} onChange={e => updateStation(tpl.id, i, 'type', e.target.value)} style={selectStyle}>
                    <option value="run">Run</option>
                    <option value="station">Station</option>
                  </select>
                  <input value={st.label} onChange={e => updateStation(tpl.id, i, 'label', e.target.value)} style={{ ...inputStyle, flex: 1 }} placeholder="Label" />
                  <input value={st.reps_or_distance} onChange={e => updateStation(tpl.id, i, 'reps_or_distance', e.target.value)} style={{ ...inputStyle, width: 100 }} placeholder="Distance/reps" />
                  <button onClick={() => removeStation(tpl.id, i)} style={iconBtnRed}>✕</button>
                </div>
              ))}
              <button onClick={() => addStation(tpl.id)} style={btnSecondary}>+ Add Station</button>
            </div>
          )}
        </div>
      ))}
      <SaveBar onSave={() => onSave({ ...config, stationTemplates: templates })} saved={saved} />
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

function WeightsTab({ config, onSave, saved }) {
  const [overrides, setOverrides] = useState({})

  return (
    <div>
      <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginBottom: 20 }}>
        These are the global default weights used for all events. Each event can further override these.
      </p>
      <WeightCheatSheet config={config} overrides={overrides} setOverrides={setOverrides} />
      <div style={{ marginTop: 20 }}>
        <SaveBar
          onSave={() => {
            const merged = { ...config, weightCheatSheet: { ...(config.weightCheatSheet || {}), ...overrides } }
            onSave(merged)
          }}
          saved={saved}
        />
      </div>
    </div>
  )
}

function AdminUsersTab() {
  return (
    <div style={{ maxWidth: 600 }}>
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', padding: '20px 24px' }}>
        <h3 style={{ fontSize: 16, marginBottom: 12 }}>Admin Users</h3>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>
          Admin accounts are managed directly in Firebase Console. To add or remove admins:
        </p>
        <ol style={{ color: 'var(--color-text-muted)', fontSize: 14, lineHeight: 2, paddingLeft: 20 }}>
          <li>Go to <strong style={{ color: 'var(--color-text)' }}>console.firebase.google.com</strong></li>
          <li>Select your project → Authentication → Users</li>
          <li>Add or delete individual coach accounts</li>
        </ol>
      </div>
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
