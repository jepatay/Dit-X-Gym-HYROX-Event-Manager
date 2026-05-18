import { useState, useRef } from 'react'
import { collection, addDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { generateRef } from '../utils/bibUtils'
import { WEIGHT_OPTIONS, weightColor } from '../utils/weightUtils'

export default function TeamForm({ eventId, scheduledTime, laneIndex = 0, config, eventType, onSaved, onCancel }) {
  const teamRef = generateRef(scheduledTime, laneIndex)

  const [name, setName] = useState('')
  const [competitionName, setCompetitionName] = useState('')
  const [weight, setWeight] = useState('')
  const [a1First, setA1First] = useState('')
  const [a1Last, setA1Last] = useState('')
  const [a1Email, setA1Email] = useState('')
  const [a2First, setA2First] = useState('')
  const [a2Last, setA2Last] = useState('')
  const [a2Email, setA2Email] = useState('')
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)

  async function handleSave() {
    if (!name.trim() || savingRef.current) return
    savingRef.current = true
    setSaving(true)
    try {
      const hasAthlete2 = !!(a2First || a2Last)
      const matchedCat = categories.find(c => c.label === competitionName.trim())
      const data = {
        eventId,
        scheduledTime,
        ref: teamRef,
        name: name.trim(),
        competitionName: competitionName.trim(),
        categoryId: matchedCat?.id ?? null,
        weight: weight || null,
        athlete1: { firstName: a1First, lastName: a1Last, email: a1Email },
        checkedIn: false,
        checkedInAt: null,
        finishTimeSeconds: null,
        rank: null,
      }
      if (hasAthlete2) {
        data.athlete2 = { firstName: a2First, lastName: a2Last, email: a2Email }
        data.athlete2Confirmed = !!(a2First && a2Last)
      }
      const docRef = await addDoc(collection(db, 'teams'), data)
      onSaved({ id: docRef.id, ...data })
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  const catType = eventType === 'Hybrid' ? 'hybrid' : 'hyrox'
  const categories = (config?.categories || []).filter(c => (c.eventType || 'hyrox') === catType)

  return (
    <div style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', padding: 20, marginBottom: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
        <div>
          <Label>Ref</Label>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 500, color: 'var(--color-accent)' }}>{teamRef}</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>{scheduledTime}</div>
        </div>
        <div>
          <Label>Team / Athlete Name</Label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Jonas Berg" style={inputStyle} autoFocus />
        </div>
        <div>
          <Label>Competition</Label>
          <input
            list="competition-options"
            value={competitionName}
            onChange={e => setCompetitionName(e.target.value)}
            placeholder="e.g. Single Men"
            style={inputStyle}
          />
          <datalist id="competition-options">
            {categories.map(c => <option key={c.id} value={c.label} />)}
          </datalist>
        </div>
        <div>
          <Label>Weight</Label>
          <div style={{ display: 'flex', gap: 6 }}>
            {WEIGHT_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setWeight(weight === opt.value ? '' : opt.value)}
                style={{
                  padding: '6px 10px',
                  background: weight === opt.value ? weightColor(opt.value) : 'transparent',
                  border: `1px solid ${weight === opt.value ? weightColor(opt.value) : 'var(--color-border)'}`,
                  color: weight === opt.value ? '#fff' : 'var(--color-text-muted)',
                  fontFamily: 'var(--font-heading)',
                  fontSize: 11,
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                }}
              >{opt.label}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 16, marginBottom: 16 }}>
        <Label>Athlete 1</Label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 6 }}>
          <input value={a1First} onChange={e => setA1First(e.target.value)} placeholder="First name" style={inputStyle} />
          <input value={a1Last} onChange={e => setA1Last(e.target.value)} placeholder="Last name" style={inputStyle} />
          <input value={a1Email} onChange={e => setA1Email(e.target.value)} placeholder="Email" style={inputStyle} type="email" />
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Label>Athlete 2 <span style={{ color: 'var(--color-warning)', fontSize: 11 }}>(optional — for doubles)</span></Label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 6 }}>
          <input value={a2First} onChange={e => setA2First(e.target.value)} placeholder="First name" style={inputStyle} />
          <input value={a2Last} onChange={e => setA2Last(e.target.value)} placeholder="Last name" style={inputStyle} />
          <input value={a2Email} onChange={e => setA2Email(e.target.value)} placeholder="Email" style={inputStyle} type="email" />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={handleSave} disabled={saving || !name.trim()} style={btnPrimary}>
          {saving ? 'Saving...' : 'Add'}
        </button>
        <button onClick={onCancel} style={btnSecondary}>Cancel</button>
      </div>
    </div>
  )
}

function Label({ children }) {
  return (
    <div style={{ fontSize: 11, fontFamily: 'var(--font-heading)', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-text-muted)', marginBottom: 4 }}>{children}</div>
  )
}

const inputStyle = { width: '100%', padding: '8px 10px', background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)', fontSize: 13 }
const btnPrimary = { padding: '8px 20px', background: 'var(--color-accent)', color: '#fff', border: 'none', fontFamily: 'var(--font-heading)', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer' }
const btnSecondary = { padding: '8px 20px', background: 'transparent', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)', fontFamily: 'var(--font-heading)', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer' }
