export const WEIGHT_OPTIONS = [
  { value: 'Women Weight', label: 'Women' },
  { value: 'Men Weight',   label: 'Men'   },
  { value: 'Pro Weight',   label: 'Pro'   },
  { value: 'Family >10',   label: 'Family >10' },
  { value: 'Family <10',   label: 'Family <10' },
]

const WEIGHT_COLORS = {
  'Women Weight': '#f59e0b',  // amber
  'Men Weight':   '#3b82f6',  // blue
  'Pro Weight':   '#ef4444',  // red
  'Family >10':   '#22c55e',  // green
  'Family <10':   '#22c55e',  // green
}

export function weightColor(weight) {
  return WEIGHT_COLORS[weight] ?? null
}

// Small inline coloured square — drop-in replacement for the old text badge
export function WeightDot({ weight, size = 10 }) {
  const color = weightColor(weight)
  if (!color) return null
  return (
    <span
      title={weight}
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        background: color,
        flexShrink: 0,
        verticalAlign: 'middle',
        marginLeft: 4,
      }}
    />
  )
}
