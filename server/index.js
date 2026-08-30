import 'dotenv/config'
import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import OpenAI from 'openai'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.join(__dirname, '..', 'dist')

const app = express()
app.use(express.json({ limit: '1mb' }))

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null

const STATION_ORDER = [
  'Run', 'SkiErg', 'Run', 'Sled Push', 'Run', 'Sled Pull', 'Run',
  'Burpee Broad Jumps', 'Run', 'Rowing', 'Run', 'Farmers Carry', 'Run',
  'Sandbag Lunges', 'Run', 'Wall Balls',
]

function buildSystemPrompt(context = {}) {
  const { eventName, eventDate, lanes, waves, stationCapacities, riskNotes } = context
  return [
    'You are a HYROX race-day planning assistant helping a gym organizer spot station congestion risk between overlapping waves.',
    `Station order for a Full HYROX event: ${STATION_ORDER.join(' -> ')}.`,
    'Congestion happens when a later-starting wave, whose category has a faster historical average pace, catches up to an earlier, slower wave at a station that has limited capacity (machines / lanes / equipment sets).',
    'You do NOT have exact per-station split times — only each category\'s overall historical average finish time and the wave start schedule. Reason qualitatively and proportionally (e.g. a station further into the course means more time for a pace gap to compound). Say so when data is thin, and ask a clarifying question rather than guessing when it matters.',
    "Treat the organizer's own notes below as authoritative local knowledge about their venue — defer to them over your own assumptions when they conflict.",
    'Be concise and concrete: name the stations/waves at risk, and suggest a specific mitigation (e.g. add a break, reorder waves, add capacity) when you flag a risk.',
    '',
    `EVENT: ${eventName || '(untitled)'} — ${eventDate || '(no date)'} — ${lanes || '?'} simultaneous lanes`,
    '',
    'WAVE SCHEDULE (start time, category, athletes scheduled, that category\'s historical average finish time):',
    JSON.stringify(waves || [], null, 2),
    '',
    'STATION CAPACITIES AT THIS VENUE:',
    JSON.stringify(stationCapacities || {}, null, 2),
    '',
    "ORGANIZER'S RULES OF THUMB / PAST NOTES:",
    riskNotes?.trim() || '(none recorded yet)',
  ].join('\n')
}

app.post('/api/risk-chat', async (req, res) => {
  if (!openai) {
    return res.status(503).json({ error: 'OPENAI_API_KEY is not configured on the server.' })
  }
  const { messages, context } = req.body || {}
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages must be a non-empty array' })
  }
  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: buildSystemPrompt(context) },
        ...messages.map(m => ({ role: m.role, content: m.content })),
      ],
      temperature: 0.4,
    })
    const reply = completion.choices?.[0]?.message?.content || ''
    res.json({ reply })
  } catch (err) {
    console.error('risk-chat error:', err)
    res.status(502).json({ error: 'Failed to reach OpenAI.' })
  }
})

// Serve the built frontend and fall back to index.html for client-side routes
app.use(express.static(distDir))
app.get('*', (req, res) => {
  res.sendFile(path.join(distDir, 'index.html'))
})

const port = process.env.PORT || 3000
app.listen(port, () => console.log(`Server listening on :${port}`))
