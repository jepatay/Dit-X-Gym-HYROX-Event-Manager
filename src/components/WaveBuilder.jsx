import { useState } from 'react'
import { waveEndTime, wavesOverlap } from '../utils/timeUtils'
import SaveConfirmation from './SaveConfirmation'

function newId() {
  return `wave_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

function getDefaultStart(waves) {
  if (waves.length === 0) return '10:00'
  return waveEndTime(waves[waves.length - 1])
}

function validateWaves(waves) {
  for (let i = 0; i < waves.length; i++) {
    for (let j = i + 1; j < waves.length; j++) {
      if (wavesOverlap(waves[i], waves[j])) {
        return `"${waves[i].label}" overlaps with "${waves[j].label}"`
      }
    }
  }
  return null
}

export default function WaveBuilder({ waves, setWaves, config, onSave, saved }) {
  const [showActiveForm, setShowActiveForm] = useState(false)
  const [showRestForm, setShowRestForm] = useState(false)
  const [conflict, setConflict] = useState(null)

  const [aLabel, setALabel] = useState('')
  const [aCategoryId, setACategoryId] = useState(config?.categories?.[0]?.id || '')
  const [aStart, setAStart] = useState(getDefaultStart(waves))
  const [aInterval, setAInterval] = useState(5)
  const [aTeamCount, setATeamCount] = useState(10)
  const [aLanes, setALanes] = useState(2)

  const [rStart, setRStart] = useState(getDefaultStart(waves))
  const [rDuration, setRDuration] = useState(10)
  const [rLabel, setRLabel] = useState('Pause')

  const [editingId, setEditingId] = useState(null)

  const categories = (config?.categories || []).filter(c => c.enabled !== false)

  function addActiveWave() {
    const wave = {
      id: newId(),
      label: aLabel || `Wave ${waves.filter(w => !w.isRestWave).length + 1}`,
      categoryId: aCategoryId,
      startTime: aStart,
      intervalMinutes: Number(aInterval),
      teamCount: Number(aTeamCount),
      lanes: Number(aLanes),
      isRestWave: false,
      stations: [],
    }
    const next = [...waves, wave].sort((a, b) => a.startTime.localeCompare(b.startTime))
    const err = validateWaves(next)
    if (err) { setConflict(err); return }
    setConflict(null)
    setWaves(next)
    setShowActiveForm(false)
    setALabel('')
    setALanes(2)
    setAStart(getDefaultStart(next))
  }

  function addRestWave() {
    const wave = {
      id: newId(),
      label: rLabel || 'Pause',
      startTime: rStart,
      durationMinutes: Number(rDuration),
      isRestWave: true,
    }
    const next = [...waves, wave].sort((a, b) => a.startTime.localeCompare(b.startTime))
    const err = validateWaves(next)
    if (err) { setConflict(err); return }
    setConflict(null)
    setWaves(next)
    setShowRestForm(false)
    setRStart(getDefaultStart(next))
  }

  function deleteWave(id) {
    if (!confirm('Delete this wave?')) return
    setWaves(ws => ws.filter(w => w.id !== id))
  }

  function moveUp(index) {
    if (index === 0) return
    const next = [...waves]
    ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
    setConflict(validateWaves(next))
    setWaves(next)
  }

  function moveDown(index) {
    if (index === waves.length - 1) return
    const next = [...waves]
    ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
    setConflict(validateWaves(next))
    setWaves(next)
  }

  function handleSave() {
    const err = validateWaves(waves)
    if (err) { setConflict(err); return }
    setConflict(null)
    onSave()
  }

  function updateWaveField(id, field, value) {
    const next = waves.map(w => w.id === id ? { ...w, [field]: value } : w)
    setConflict(validateWaves(next))
    setWaves(next)
  }

  const totalMinutes = waves.reduce((sum, w) => {
    if (w.isRestWave) return sum + (w.durationMinutes || 0)
    return sum + (w.teamCount || 0) * (w.intervalMinutes || 0)
  }, 0)

  return (
    <div>
      {conflict && (
        <div style={{
          background: 'rgba(230,51,41,0.1)',
          border: '1px solid var(--color-accent)',
          color: 'var(--color-accent)',
          padding: '10px 16px',
          marginBottom: 16,
          fontSize: 13,
          fontFamily: 'var(--font-heading)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>
          ⚠ Conflict: {conflict}
        </div>
      )}

      {waves.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontFamily: 'var(--font-heading)', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-text-muted)', marginBottom: 8 }}>
            Timeline — Total: {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m
          </div>
          <div style={{ display: 'flex', height: 28, background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
            {waves.map(w => {
              const dur = w.isRestWave ? (w.durationMinutes || 0) : (w.teamCount || 0) * (w.intervalMinutes || 0)
              const pct = totalMinutes > 0 ? (dur / totalMinutes) * 100 : 0
              return (
                <div
                  key={w.id}
                  title={`${w.label} (${dur}min)`}
                  style={{
                    width: `${pct}%`,
                    background: w.isRestWave ? 'var(--color-border)' : 'var(--color-accent)',
                    borderRight: '1px solid var(--color-surface-raised)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    fontSize: 10,
                    fontFamily: 'var(--font-heading)',
                    color: w.isRestWave ? 'var(--color-text-muted)' : '#fff',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  {pct > 5 ? w.label : ''}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
        {waves.map((wave, index) => (
          <div key={wave.id} style={{
            background: wave.isRestWave ? 'var(--color-surface)' : 'var(--color-surface-raised)',
            border: '1px solid ' + (wave.isRestWave ? 'var(--color-border)' : 'var(--color-border)'),
            padding: '12px 16px',
          }}>
            {editingId === wave.id ? (
              <WaveEditForm
                wave={wave}
                categories={categories}
                onChange={(field, val) => updateWaveField(wave.id, field, val)}
                onClose={() => setEditingId(null)}
              />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <button onClick={() => moveUp(index)} style={arrowBtn} disabled={index === 0}>▲</button>
                  <button onClick={() => moveDown(index)} style={arrowBtn} disabled={index === waves.length - 1}>▼</button>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--color-text-muted)', minWidth: 44 }}>{wave.startTime}</span>
                    <span style={{ fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 700 }}>{wave.label}</span>
                    {wave.isRestWave ? (
                      <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'var(--font-heading)', textTransform: 'uppercase' }}>
                        {wave.durationMinutes}min pause
                      </span>
                    ) : (
                      <>
                        <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'var(--font-heading)', textTransform: 'uppercase' }}>
                          {categories.find(c => c.id === wave.categoryId)?.label || wave.categoryId}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                          {wave.teamCount} slots × {wave.intervalMinutes}min → ends {waveEndTime(wave)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setEditingId(wave.id)} style={actionBtn}>Edit</button>
                  <button onClick={() => deleteWave(wave.id)} style={{ ...actionBtn, color: 'var(--color-accent)' }}>Delete</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <button
          onClick={() => {
            setShowActiveForm(true)
            setShowRestForm(false)
            setAStart(getDefaultStart(waves))
            setALabel(`Wave ${waves.filter(w => !w.isRestWave).length + 1}`)
          }}
          style={btnSecondary}
        >
          + Add Wave
        </button>
        <button
          onClick={() => { setShowRestForm(true); setShowActiveForm(false); setRStart(getDefaultStart(waves)); setRLabel('Pause'); setRDuration(10) }}
          style={btnSecondary}
        >
          + Add Pause
        </button>
      </div>

      {showActiveForm && (
        <div style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', padding: 20, marginBottom: 20 }}>
          <h4 style={{ fontSize: 14, marginBottom: 14 }}>New Wave</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 14 }}>
            <div>
              <FieldLabel>Label</FieldLabel>
              <input value={aLabel} onChange={e => setALabel(e.target.value)} placeholder="Wave 1" style={inputStyle} />
            </div>
            <div>
              <FieldLabel>Category</FieldLabel>
              <select value={aCategoryId} onChange={e => setACategoryId(e.target.value)} style={inputStyle}>
                {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <FieldLabel>Start Time</FieldLabel>
              <input value={aStart} onChange={e => setAStart(e.target.value)} style={{ ...inputStyle, fontFamily: 'var(--font-mono)' }} />
            </div>
            <div>
              <FieldLabel>Interval (min)</FieldLabel>
              <input type="number" value={aInterval} onChange={e => setAInterval(e.target.value)} min={1} style={inputStyle} />
            </div>
            <div>
              <FieldLabel>Starts</FieldLabel>
              <input type="number" value={aTeamCount} onChange={e => setATeamCount(e.target.value)} min={1} style={inputStyle} />
            </div>
            <div>
              <FieldLabel>Lanes (per start)</FieldLabel>
              <input type="number" value={aLanes} onChange={e => setALanes(e.target.value)} min={1} max={6} style={inputStyle} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={addActiveWave} style={btnPrimary}>Add Wave</button>
            <button onClick={() => setShowActiveForm(false)} style={btnSecondary}>Cancel</button>
          </div>
        </div>
      )}

      {showRestForm && (
        <div style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', padding: 20, marginBottom: 20 }}>
          <h4 style={{ fontSize: 14, marginBottom: 14 }}>New Pause</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 14 }}>
            <div>
              <FieldLabel>Label</FieldLabel>
              <input value={rLabel} onChange={e => setRLabel(e.target.value)} placeholder="Pause" style={inputStyle} />
            </div>
            <div>
              <FieldLabel>Start Time</FieldLabel>
              <input value={rStart} onChange={e => setRStart(e.target.value)} style={{ ...inputStyle, fontFamily: 'var(--font-mono)' }} />
            </div>
            <div>
              <FieldLabel>Duration (min)</FieldLabel>
              <input type="number" value={rDuration} onChange={e => setRDuration(e.target.value)} min={1} style={inputStyle} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={addRestWave} style={btnPrimary}>Add Pause</button>
            <button onClick={() => setShowRestForm(false)} style={btnSecondary}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8 }}>
        <button onClick={handleSave} style={btnPrimary} disabled={!!conflict}>Save Waves</button>
        <SaveConfirmation trigger={saved} />
      </div>
    </div>
  )
}

function WaveEditForm({ wave, categories, onChange, onClose }) {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10, marginBottom: 12 }}>
        <div>
          <FieldLabel>Label</FieldLabel>
          <input value={wave.label} onChange={e => onChange('label', e.target.value)} style={inputStyle} />
        </div>
        <div>
          <FieldLabel>Start Time</FieldLabel>
          <input value={wave.startTime} onChange={e => onChange('startTime', e.target.value)} style={{ ...inputStyle, fontFamily: 'var(--font-mono)' }} />
        </div>
        {wave.isRestWave ? (
          <div>
            <FieldLabel>Duration (min)</FieldLabel>
            <input type="number" value={wave.durationMinutes} onChange={e => onChange('durationMinutes', Number(e.target.value))} min={1} style={inputStyle} />
          </div>
        ) : (
          <>
            <div>
              <FieldLabel>Category</FieldLabel>
              <select value={wave.categoryId} onChange={e => onChange('categoryId', e.target.value)} style={inputStyle}>
                {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <FieldLabel>Interval (min)</FieldLabel>
              <input type="number" value={wave.intervalMinutes} onChange={e => onChange('intervalMinutes', Number(e.target.value))} min={1} style={inputStyle} />
            </div>
            <div>
              <FieldLabel>Starts</FieldLabel>
              <input type="number" value={wave.teamCount} onChange={e => onChange('teamCount', Number(e.target.value))} min={1} style={inputStyle} />
            </div>
            <div>
              <FieldLabel>Lanes (per start)</FieldLabel>
              <input type="number" value={wave.lanes || 1} onChange={e => onChange('lanes', Number(e.target.value))} min={1} max={6} style={inputStyle} />
            </div>
          </>
        )}
      </div>
      <button onClick={onClose} style={btnSecondary}>Done</button>
    </div>
  )
}

function FieldLabel({ children }) {
  return (
    <div style={{
      fontSize: 10,
      fontFamily: 'var(--font-heading)',
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
      color: 'var(--color-text-muted)',
      marginBottom: 4,
    }}>{children}</div>
  )
}

const inputStyle = {
  width: '100%',
  padding: '8px 10px',
  background: 'var(--color-bg)',
  border: '1px solid var(--color-border)',
  color: 'var(--color-text)',
  fontSize: 13,
}

const arrowBtn = {
  background: 'transparent',
  border: 'none',
  color: 'var(--color-text-muted)',
  fontSize: 10,
  cursor: 'pointer',
  padding: '1px 4px',
  display: 'block',
}

const actionBtn = {
  background: 'transparent',
  border: '1px solid var(--color-border)',
  color: 'var(--color-text-muted)',
  fontFamily: 'var(--font-heading)',
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  padding: '4px 12px',
  cursor: 'pointer',
}

const btnPrimary = {
  padding: '9px 20px',
  background: 'var(--color-accent)',
  color: '#fff',
  border: 'none',
  fontFamily: 'var(--font-heading)',
  fontSize: 13,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  cursor: 'pointer',
}

const btnSecondary = {
  padding: '9px 20px',
  background: 'transparent',
  color: 'var(--color-text-muted)',
  border: '1px solid var(--color-border)',
  fontFamily: 'var(--font-heading)',
  fontSize: 13,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  cursor: 'pointer',
}
