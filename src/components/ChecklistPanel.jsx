import SaveConfirmation from './SaveConfirmation'

export default function ChecklistPanel({ checklist, setChecklist, config, onSave, saved, hideSaveButton }) {
  const items = config?.checklistItems || []
  const categories = [...new Set(items.map(i => i.category))]

  function toggle(id) {
    setChecklist(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const done = items.filter(i => checklist[i.id]).length

  return (
    <div>
      <div style={{ marginBottom: 20, color: 'var(--color-text-muted)', fontSize: 13 }}>
        {done} / {items.length} completed
      </div>

      {categories.map(cat => (
        <div key={cat} style={{ marginBottom: 28 }}>
          <h3 style={{ fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 10 }}>{cat}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {items.filter(i => i.category === cat).sort((a, b) => a.order - b.order).map(item => (
              <label key={item.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 14px',
                background: checklist[item.id] ? 'rgba(34,197,94,0.06)' : 'var(--color-surface)',
                border: '1px solid ' + (checklist[item.id] ? 'rgba(34,197,94,0.2)' : 'var(--color-border)'),
                cursor: 'pointer',
              }}>
                <input
                  type="checkbox"
                  checked={!!checklist[item.id]}
                  onChange={() => toggle(item.id)}
                  style={{ accentColor: 'var(--color-success)', width: 16, height: 16, cursor: 'pointer' }}
                />
                <span style={{
                  fontSize: 14,
                  color: checklist[item.id] ? 'var(--color-text-muted)' : 'var(--color-text)',
                  textDecoration: checklist[item.id] ? 'line-through' : 'none',
                }}>
                  {item.text}
                </span>
              </label>
            ))}
          </div>
        </div>
      ))}

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8 }}>
        {!hideSaveButton && <button type="button" onClick={onSave} style={btnPrimary}>Save</button>}
        <SaveConfirmation trigger={saved} />
      </div>
    </div>
  )
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
