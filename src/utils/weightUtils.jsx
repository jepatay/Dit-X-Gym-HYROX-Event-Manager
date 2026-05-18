export const WEIGHT_OPTIONS = [
  { value: 'Women Weight', label: 'Women'      },
  { value: 'Men Weight',   label: 'Men'        },
  { value: 'Pro Weight',   label: 'Pro'        },
  { value: 'Family >10',   label: 'Family >10' },
  { value: 'Family <10',   label: 'Family <10' },
]

const WEIGHT_COLORS = {
  'Women Weight': '#f59e0b',
  'Men Weight':   '#3b82f6',
  'Pro Weight':   '#ef4444',
  'Family >10':   '#22c55e',
  'Family <10':   '#22c55e',
}

export function weightColor(weight) {
  return WEIGHT_COLORS[weight] ?? null
}

// Inline coloured text label — shows e.g. "Women" in amber
export function WeightLabel({ weight }) {
  const color = weightColor(weight)
  const opt = WEIGHT_OPTIONS.find(o => o.value === weight)
  if (!color || !opt) return null
  return (
    <span style={{
      fontSize: 11,
      fontFamily: 'var(--font-heading, sans-serif)',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      color,
    }}>
      {opt.label}
    </span>
  )
}
