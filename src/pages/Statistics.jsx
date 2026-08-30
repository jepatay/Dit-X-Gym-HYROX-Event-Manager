import { useEffect, useMemo, useRef, useState } from 'react'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'
import { Bar, Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js'
import ChartDataLabels from 'chartjs-plugin-datalabels'
import { db } from '../firebase'
import NavBar from '../components/NavBar'
import { getOrCreateConfig } from '../utils/firestoreUtils'
import { WEIGHT_OPTIONS, weightColor } from '../utils/weightUtils'
import { isTestEvent, resolveCategory, teamSize, compositionKey, monthLabel, resultsByCategory } from '../utils/statsUtils'
import { secondsToHHMMSS } from '../utils/timeUtils'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend)

const COLORS = ['#e8621a', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#ef4444', '#14b8a6', '#eab308', '#6366f1', '#84cc16', '#f472b6', '#0ea5e9']
const SURFACE_HEX = '#1e2d45'

export default function Statistics() {
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState([])
  const [testCount, setTestCount] = useState(0)
  const [teams, setTeams] = useState([])
  const [config, setConfig] = useState(null)
  const [mode, setMode] = useState('all')
  const [customIds, setCustomIds] = useState(new Set())
  const [countMode, setCountMode] = useState('teams')

  useEffect(() => { load() }, [])

  async function load() {
    const [evSnap, teamSnap, cfg] = await Promise.all([
      getDocs(query(collection(db, 'events'), orderBy('date', 'desc'))),
      getDocs(collection(db, 'teams')),
      getOrCreateConfig(),
    ])
    const rawEvents = evSnap.docs.map(d => ({ id: d.id, ...d.data() }))
    const cleanEvents = rawEvents.filter(e => !isTestEvent(e))
    setEvents(cleanEvents)
    setTestCount(rawEvents.length - cleanEvents.length)
    setTeams(teamSnap.docs.map(d => ({ id: d.id, ...d.data() })))
    setConfig(cfg)
    setCustomIds(new Set(cleanEvents.map(e => e.id)))
    setLoading(false)
  }

  function toggleCustom(id) {
    setCustomIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => (b.date || '').localeCompare(a.date || '')),
    [events]
  )

  const selectedEvents = useMemo(() => {
    if (mode === 'all') return sortedEvents
    if (mode === 'last2') return sortedEvents.slice(0, 2)
    if (mode === 'last3') return sortedEvents.slice(0, 3)
    if (mode === 'last5') return sortedEvents.slice(0, 5)
    return sortedEvents.filter(e => customIds.has(e.id))
  }, [mode, sortedEvents, customIds])

  const selectedIdSet = useMemo(() => new Set(selectedEvents.map(e => e.id)), [selectedEvents])
  const relevantTeams = useMemo(() => teams.filter(t => selectedIdSet.has(t.eventId)), [teams, selectedIdSet])

  // Resolve category once per team so every chart uses the same classification.
  const enrichedTeams = useMemo(
    () => relevantTeams.map(t => {
      const cat = resolveCategory(t, config)
      return { team: t, cat, count: teamSize(t, cat.type) }
    }),
    [relevantTeams, config, countMode]
  )

  const athleteTotal = useMemo(() => enrichedTeams.reduce((s, e) => s + teamSize(e.team, e.cat.type), 0), [enrichedTeams])
  const countFor = e => (countMode === 'athletes' ? e.count : 1)

  const timeline = useMemo(() => {
    const chronological = [...selectedEvents].sort((a, b) => (a.date || '').localeCompare(b.date || ''))
    const labels = chronological.map(e => monthLabel(e.date))
    const names = chronological.map(e => e.name)
    const values = chronological.map(e => {
      const rows = enrichedTeams.filter(x => x.team.eventId === e.id)
      return rows.reduce((sum, x) => sum + countFor(x), 0)
    })
    return { labels, names, values }
  }, [selectedEvents, enrichedTeams, countMode])

  const composition = useMemo(() => {
    const buckets = {}
    for (const x of enrichedTeams) {
      const key = compositionKey(x.cat)
      buckets[key] = (buckets[key] || 0) + countFor(x)
    }
    const order = ['Single Men', 'Single Women', 'Double Men', 'Double Women', 'Double Mixed']
    const labels = order.filter(k => buckets[k])
    return { labels, values: labels.map(k => buckets[k]) }
  }, [enrichedTeams, countMode])

  const weightSplit = useMemo(() => {
    const buckets = {}
    for (const x of enrichedTeams) {
      const w = x.team.weight || 'Unknown'
      buckets[w] = (buckets[w] || 0) + countFor(x)
    }
    const known = WEIGHT_OPTIONS.map(o => o.value).filter(v => buckets[v])
    const labels = known.map(v => WEIGHT_OPTIONS.find(o => o.value === v).label)
    const colors = known.map(v => weightColor(v) || '#7a9abe')
    const values = known.map(v => buckets[v])
    if (buckets.Unknown) {
      labels.push('Unknown')
      colors.push('#5a7090')
      values.push(buckets.Unknown)
    }
    return { labels, values, colors }
  }, [enrichedTeams, countMode])

  const popularity = useMemo(() => {
    const buckets = {}
    for (const x of enrichedTeams) {
      buckets[x.cat.label] = (buckets[x.cat.label] || 0) + countFor(x)
    }
    const entries = Object.entries(buckets).sort((a, b) => b[1] - a[1])
    return { labels: entries.map(e => e[0]), values: entries.map(e => e[1]) }
  }, [enrichedTeams, countMode])

  const resultStats = useMemo(() => resultsByCategory(enrichedTeams), [enrichedTeams])

  const perEvent = useMemo(() => {
    const chronological = [...selectedEvents].sort((a, b) => (a.date || '').localeCompare(b.date || ''))
    const categorySet = new Set()
    const rows = chronological.map(e => {
      const bucket = {}
      for (const x of enrichedTeams) {
        if (x.team.eventId !== e.id) continue
        categorySet.add(x.cat.label)
        bucket[x.cat.label] = (bucket[x.cat.label] || 0) + countFor(x)
      }
      return bucket
    })
    const categories = [...categorySet]
    const datasets = categories.map((cat, i) => ({
      label: cat,
      data: rows.map(b => b[cat] || 0),
      backgroundColor: COLORS[i % COLORS.length],
    }))
    return { labels: chronological.map(e => e.name), datasets }
  }, [selectedEvents, enrichedTeams, countMode])

  if (loading) return <div><NavBar /><p style={{ padding: 32, color: 'var(--color-text-muted)' }}>Loading...</p></div>

  const unitLabel = countMode === 'athletes' ? 'Athletes' : 'Teams'

  return (
    <div>
      <NavBar />
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px' }}>
        <h1 style={{ fontSize: 32, marginBottom: 24 }}>Statistics</h1>

        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', padding: '18px 20px', marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontFamily: 'var(--font-heading)', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-text-muted)', marginBottom: 12 }}>
            What do you want to analyze?
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <select value={mode} onChange={e => setMode(e.target.value)} style={selectStyle}>
              <option value="all">All Events</option>
              <option value="last2">Last 2 Events</option>
              <option value="last3">Last 3 Events</option>
              <option value="last5">Last 5 Events</option>
              <option value="custom">Choose Specific Events...</option>
            </select>

            <div style={{ display: 'flex', border: '1px solid var(--color-border)' }}>
              <button onClick={() => setCountMode('teams')} style={segBtn(countMode === 'teams')}>Teams</button>
              <button onClick={() => setCountMode('athletes')} style={segBtn(countMode === 'athletes')}>Athletes</button>
            </div>
          </div>

          {mode === 'custom' && (
            <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {sortedEvents.map(e => (
                <label key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, background: 'var(--color-bg)', border: '1px solid var(--color-border)', padding: '6px 10px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={customIds.has(e.id)} onChange={() => toggleCustom(e.id)} />
                  {e.name} <span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>({e.date})</span>
                </label>
              ))}
            </div>
          )}

          <p style={{ marginTop: 14, fontSize: 12, color: 'var(--color-text-muted)' }}>
            {selectedEvents.length} event{selectedEvents.length !== 1 ? 's' : ''} selected · {enrichedTeams.length} team{enrichedTeams.length !== 1 ? 's' : ''} · {athleteTotal} athletes
            {testCount > 0 && ` — ${testCount} test event${testCount !== 1 ? 's' : ''} excluded automatically`}
          </p>
        </div>

        {selectedEvents.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)' }}>No events to show. Pick at least one event above.</p>
        ) : (
          <>
            <ChartCard
              title="Event Timeline"
              description={`${unitLabel} per event, in chronological order.`}
              type="bar"
              data={{
                labels: timeline.labels,
                datasets: [{ label: unitLabel, data: timeline.values, backgroundColor: '#e8621a' }],
              }}
              options={barOptions((idx) => timeline.names[idx])}
            />

            <ChartCard
              title="Team Composition"
              description="Single vs. double, and men / women / mixed split."
              type="doughnut"
              data={{
                labels: composition.labels,
                datasets: [{ data: composition.values, backgroundColor: composition.labels.map((_, i) => COLORS[i % COLORS.length]) }],
              }}
              options={doughnutOptions}
            />

            <ChartCard
              title="Weight Class Split"
              description="Men / Women standard weight vs. Pro vs. Family."
              type="doughnut"
              data={{
                labels: weightSplit.labels,
                datasets: [{ data: weightSplit.values, backgroundColor: weightSplit.colors }],
              }}
              options={doughnutOptions}
            />

            <ChartCard
              title="Competition Type Popularity"
              description={`${unitLabel} by competition type, most popular first.`}
              type="bar"
              data={{
                labels: popularity.labels,
                datasets: [{ label: unitLabel, data: popularity.values, backgroundColor: '#3b82f6' }],
              }}
              options={barOptions()}
              height={Math.max(280, popularity.labels.length * 34)}
            />

            <ChartCard
              title="Competition Type by Event"
              description={`Breakdown of ${unitLabel.toLowerCase()} per event by competition type.`}
              type="bar"
              data={perEvent}
              options={stackedBarOptions}
            />

            {resultStats.length === 0 ? (
              <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', padding: '18px 20px', marginBottom: 20 }}>
                <h3 style={{ fontSize: 16, marginBottom: 4 }}>Results by Category</h3>
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>No recorded finish times for the selected events yet.</p>
              </div>
            ) : (
              <>
                <ChartCard
                  title="Average Finish Time by Category"
                  description="Fastest category average first."
                  type="bar"
                  data={{
                    labels: resultStats.map(r => r.label),
                    datasets: [{ label: 'Average Time', data: resultStats.map(r => r.avgSeconds), backgroundColor: '#e8621a' }],
                  }}
                  options={timeBarOptions()}
                  height={Math.max(280, resultStats.length * 34)}
                />

                <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', padding: '18px 20px', marginBottom: 20 }}>
                  <h3 style={{ fontSize: 16, marginBottom: 2 }}>Results by Category</h3>
                  <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 16 }}>Best, average and worst finish time per category, across the selected events.</p>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ textAlign: 'left', color: 'var(--color-text-muted)', fontSize: 11, fontFamily: 'var(--font-heading)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          <th style={{ padding: '8px 10px' }}>Category</th>
                          <th style={{ padding: '8px 10px' }}>Results</th>
                          <th style={{ padding: '8px 10px' }}>Best</th>
                          <th style={{ padding: '8px 10px' }}>Average</th>
                          <th style={{ padding: '8px 10px' }}>Worst</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resultStats.map(r => (
                          <tr key={r.label} style={{ borderTop: '1px solid var(--color-border)' }}>
                            <td style={{ padding: '8px 10px' }}>{r.label}</td>
                            <td style={{ padding: '8px 10px', color: 'var(--color-text-muted)' }}>{r.count}</td>
                            <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)', color: 'var(--color-success)' }}>{secondsToHHMMSS(r.bestSeconds)}</td>
                            <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)' }}>{secondsToHHMMSS(r.avgSeconds)}</td>
                            <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>{secondsToHHMMSS(r.worstSeconds)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function ChartCard({ title, description, type, data, options, height = 320 }) {
  const chartRef = useRef(null)
  const [status, setStatus] = useState('idle')

  function handleCopy() {
    const chart = chartRef.current
    if (!chart) return
    const source = chart.canvas
    const exportCanvas = document.createElement('canvas')
    exportCanvas.width = source.width
    exportCanvas.height = source.height
    const ctx = exportCanvas.getContext('2d')
    ctx.fillStyle = SURFACE_HEX
    ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height)
    ctx.drawImage(source, 0, 0)
    exportCanvas.toBlob(async blob => {
      if (!blob) return
      try {
        if (navigator.clipboard && window.ClipboardItem) {
          await navigator.clipboard.write([new window.ClipboardItem({ [blob.type]: blob })])
          setStatus('copied')
        } else {
          throw new Error('clipboard unsupported')
        }
      } catch {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${title.replace(/\s+/g, '_').toLowerCase()}.png`
        a.click()
        URL.revokeObjectURL(url)
        setStatus('downloaded')
      }
      setTimeout(() => setStatus('idle'), 2000)
    }, 'image/png')
  }

  const isDoughnut = type === 'doughnut'
  const Comp = isDoughnut ? Doughnut : Bar

  return (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', padding: '18px 20px', marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 4, flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ fontSize: 16, marginBottom: 2 }}>{title}</h3>
          {description && <p style={{ fontSize: 12, color: 'var(--color-text-muted)', textTransform: 'none', letterSpacing: 0 }}>{description}</p>}
        </div>
        <button onClick={handleCopy} style={btnSecondary}>
          {status === 'copied' ? 'Copied!' : status === 'downloaded' ? 'Downloaded' : 'Copy Image'}
        </button>
      </div>
      <div style={{ height, position: 'relative', marginTop: 12 }}>
        <Comp ref={chartRef} data={data} options={options} plugins={isDoughnut ? [ChartDataLabels] : []} />
      </div>
    </div>
  )
}

function barOptions(tooltipLabelFn) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: undefined,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#243352',
        titleColor: '#f0f4f8',
        bodyColor: '#f0f4f8',
        borderColor: '#2d4060',
        borderWidth: 1,
        callbacks: tooltipLabelFn ? { title: (items) => tooltipLabelFn(items[0].dataIndex) } : undefined,
      },
    },
    scales: {
      x: { ticks: { color: '#7a9abe', font: { size: 10 } }, grid: { color: '#2d406055' } },
      y: { ticks: { color: '#7a9abe' }, grid: { color: '#2d406055' }, beginAtZero: true },
    },
  }
}

function timeBarOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#243352',
        titleColor: '#f0f4f8',
        bodyColor: '#f0f4f8',
        borderColor: '#2d4060',
        borderWidth: 1,
        callbacks: { label: (ctx) => secondsToHHMMSS(ctx.parsed.x) },
      },
    },
    scales: {
      x: { ticks: { color: '#7a9abe', font: { size: 10 }, callback: (value) => secondsToHHMMSS(value) }, grid: { color: '#2d406055' }, beginAtZero: true },
      y: { ticks: { color: '#7a9abe' }, grid: { color: '#2d406055' } },
    },
  }
}

const stackedBarOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'bottom', labels: { color: '#f0f4f8', font: { family: 'Inter, sans-serif', size: 11 }, boxWidth: 12 } },
    tooltip: { backgroundColor: '#243352', titleColor: '#f0f4f8', bodyColor: '#f0f4f8', borderColor: '#2d4060', borderWidth: 1 },
  },
  scales: {
    x: { stacked: true, ticks: { color: '#7a9abe', font: { size: 10 } }, grid: { color: '#2d406055' } },
    y: { stacked: true, ticks: { color: '#7a9abe' }, grid: { color: '#2d406055' }, beginAtZero: true },
  },
}

function pctOf(value, allValues) {
  const total = allValues.reduce((a, b) => a + b, 0)
  return total ? Math.round((value / total) * 100) : 0
}

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'bottom', labels: { color: '#f0f4f8', font: { family: 'Inter, sans-serif', size: 11 }, boxWidth: 12 } },
    tooltip: {
      backgroundColor: '#243352', titleColor: '#f0f4f8', bodyColor: '#f0f4f8', borderColor: '#2d4060', borderWidth: 1,
      callbacks: {
        label: (ctx) => `${ctx.label}: ${ctx.parsed} (${pctOf(ctx.parsed, ctx.dataset.data)}%)`,
      },
    },
    datalabels: {
      color: '#fff',
      font: { weight: 700, size: 12, family: 'Inter, sans-serif' },
      formatter: (value, ctx) => {
        const pct = pctOf(value, ctx.chart.data.datasets[0].data)
        return pct > 0 ? `${pct}%` : ''
      },
    },
  },
}

function segBtn(active) {
  return {
    padding: '8px 16px',
    background: active ? 'var(--color-accent)' : 'transparent',
    color: active ? '#fff' : 'var(--color-text-muted)',
    border: 'none',
    fontFamily: 'var(--font-heading)',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    cursor: 'pointer',
  }
}

const selectStyle = { padding: '8px 10px', background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)', fontSize: 13 }
const btnSecondary = { padding: '8px 18px', background: 'transparent', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)', fontFamily: 'var(--font-heading)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', flexShrink: 0 }
