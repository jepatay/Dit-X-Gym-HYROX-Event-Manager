// Helpers for aggregating event/team data into statistics charts.

export function isTestEvent(event) {
  return (event?.name || '').toLowerCase().includes('test')
}

function classifyCategory(cat) {
  const label = (cat?.label || '').toLowerCase()
  let gender = 'mixed'
  if (label.includes('mixed')) gender = 'mixed'
  else if (label.includes('women')) gender = 'women'
  else if (label.includes('men')) gender = 'men'
  const isPro = label.includes('pro')
  const type = cat?.type === 'double' ? 'double' : 'single'
  return { gender, isPro, type }
}

// Resolves a team's category info against the global config, falling back to
// text-matching (same approach as AdminPage.catLabel) for legacy teams whose
// categoryId is missing or stale.
export function resolveCategory(team, config) {
  const cats = config?.categories || []
  let cat = team.categoryId ? cats.find(c => c.id === team.categoryId) : null

  if (!cat) {
    const norm = s => (s || '').replace(/[^\w\s]/gu, '').toLowerCase().trim()
    const stored = norm(team.competitionName)
    if (stored) cat = cats.find(c => norm(c.label) === stored)
  }

  if (!cat) {
    const hasAthlete2 = !!(team.athlete2 && (team.athlete2.firstName || team.athlete2.lastName))
    return {
      label: team.competitionName || 'Unknown',
      gender: 'mixed',
      isPro: false,
      type: hasAthlete2 ? 'double' : 'single',
    }
  }

  const { gender, isPro, type } = classifyCategory(cat)
  return { label: cat.label, gender, isPro, type }
}

// Number of athletes on a team, preferring the resolved category type over
// raw athlete2 presence (more reliable for teams with incomplete athlete2 data).
export function teamSize(team, catType) {
  if (catType === 'double') return 2
  if (catType === 'single') return 1
  return team.athlete2 && (team.athlete2.firstName || team.athlete2.lastName) ? 2 : 1
}

export function compositionKey({ gender, type }) {
  if (type === 'single') return gender === 'women' ? 'Single Women' : 'Single Men'
  if (gender === 'mixed') return 'Double Mixed'
  return gender === 'women' ? 'Double Women' : 'Double Men'
}

// Finish-time stats (count, best/average/worst) per resolved category label.
// Only teams with a recorded finishTimeSeconds are counted. Sorted fastest average first.
export function resultsByCategory(enrichedTeams) {
  const buckets = {}
  for (const { team, cat } of enrichedTeams) {
    if (team.finishTimeSeconds == null) continue
    const key = cat.label
    if (!buckets[key]) buckets[key] = { label: key, times: [] }
    buckets[key].times.push(team.finishTimeSeconds)
  }
  return Object.values(buckets)
    .map(({ label, times }) => ({
      label,
      count: times.length,
      avgSeconds: Math.round(times.reduce((a, s) => a + s, 0) / times.length),
      bestSeconds: Math.min(...times),
      worstSeconds: Math.max(...times),
    }))
    .sort((a, b) => a.avgSeconds - b.avgSeconds)
}

export function monthLabel(dateStr) {
  if (!dateStr) return 'Unknown'
  const d = new Date(`${dateStr}T00:00:00`)
  if (isNaN(d.getTime())) return 'Unknown'
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}
