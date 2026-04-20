const WEIGHT_FIELDS = [
  { key: 'sledPush', label: 'Sled Push' },
  { key: 'sledPull', label: 'Sled Pull' },
  { key: 'sandbag', label: 'Sandbag' },
  { key: 'wallBall', label: 'Wall Ball' },
  { key: 'farmerCarry', label: 'Farmer Carry' },
  { key: 'run', label: 'Run' },
  { key: 'burpee', label: 'Burpee Broad Jump' },
]

export default function WeightCheatSheet({ config, overrides, setOverrides, readOnly }) {
  const globalWeights = config?.weightCheatSheet || {}

  function handleChange(catId, field, val) {
    setOverrides(prev => ({
      ...prev,
      [catId]: { ...(prev[catId] || {}), [field]: val },
    }))
  }

  const categories = (config?.categories || []).filter(c => c.enabled !== false)

  return (
    <div style={{ overflowX: 'auto' }}>
      <table>
        <thead>
          <tr>
            <th>Category</th>
            {WEIGHT_FIELDS.map(f => <th key={f.key}>{f.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {categories.map(cat => {
            const global = globalWeights[cat.id] || {}
            const override = overrides?.[cat.id] || {}
            return (
              <tr key={cat.id}>
                <td style={{ fontFamily: 'var(--font-heading)', fontSize: 13, fontWeight: 600 }}>
                  {cat.label}
                </td>
                {WEIGHT_FIELDS.map(f => {
                  const val = override[f.key] !== undefined ? override[f.key] : (global[f.key] || '')
                  return (
                    <td key={f.key}>
                      {readOnly ? (
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{val}</span>
                      ) : (
                        <input
                          value={val}
                          onChange={e => handleChange(cat.id, f.key, e.target.value)}
                          style={{
                            background: 'var(--color-bg)',
                            border: '1px solid var(--color-border)',
                            color: 'var(--color-text)',
                            padding: '4px 8px',
                            fontFamily: 'var(--font-mono)',
                            fontSize: 13,
                            width: 100,
                          }}
                        />
                      )}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
