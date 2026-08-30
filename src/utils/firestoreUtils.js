import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase'

export function buildDefaultStations(catId, weights) {
  if (catId.startsWith('hybrid_')) return buildHybridStations(catId, weights)
  const w = weights || {}
  const half = catId.startsWith('half_')
  const r = half ? '500m' : '1000m'
  return [
    { order: 1,  label: 'Run',                value: r },
    { order: 2,  label: 'Ski Erg',            value: w.skiErg || r },
    { order: 3,  label: 'Run',                value: r },
    { order: 4,  label: 'Sled Push',          value: w.sledPush || '' },
    { order: 5,  label: 'Run',                value: r },
    { order: 6,  label: 'Sled Pull',          value: w.sledPull || '' },
    { order: 7,  label: 'Run',                value: r },
    { order: 8,  label: 'Burpee Broad Jump',  value: w.burpee || (half ? '40m' : '80m') },
    { order: 9,  label: 'Run',                value: r },
    { order: 10, label: 'Row Erg',            value: w.rowing || r },
    { order: 11, label: 'Run',                value: r },
    { order: 12, label: 'Farmers Carry',      value: w.farmerCarry || '' },
    { order: 13, label: 'Run',                value: r },
    { order: 14, label: 'Walking Lunges',     value: [w.sandbag, w.lunge || (half ? '50m' : '100m')].filter(Boolean).join(' / ') },
    { order: 15, label: 'Run',                value: r },
    { order: 16, label: 'Wall Ball',          value: w.wallBall ? `${w.wallBall} / 100 reps` : '' },
  ]
}

export function buildHybridStations(catId, weights) {
  const w = weights || {}
  const r = w.run || '650m'
  return [
    { order: 1,  label: 'Run',                value: r },
    { order: 2,  label: 'Bike Erg',           value: w.bikeErg || '1500m' },
    { order: 3,  label: 'Run',                value: r },
    { order: 4,  label: 'Sled Push/Pull',     value: w.sledCombined || '' },
    { order: 5,  label: 'Run',                value: r },
    { order: 6,  label: 'Row Erg',            value: w.rowing || '1000m' },
    { order: 7,  label: 'Run',                value: r },
    { order: 8,  label: 'Farmers Deadlift',   value: w.farmerDeadlift || '' },
    { order: 9,  label: 'Run',                value: r },
    { order: 10, label: 'Ski Erg',            value: w.skiErg || '1000m' },
    { order: 11, label: 'Run',                value: r },
    { order: 12, label: 'Walking Lunges',     value: w.lunge || '200m' },
    { order: 13, label: 'Run',                value: r },
    { order: 14, label: 'Burpee Broad Jump',  value: w.burpee || '100m' },
    { order: 15, label: 'Run',                value: r },
    { order: 16, label: 'Assault Bike',       value: w.assaultBike || '100 cal' },
  ]
}

export const DEFAULT_CONFIG = {
  staff: [],
  categories: [
    { id: 'single_men',               label: 'Single Men',               type: 'single', eventType: 'hyrox', enabled: true },
    { id: 'single_men_pro',           label: 'Single Men Pro',           type: 'single', eventType: 'hyrox', enabled: true },
    { id: 'single_women',             label: 'Single Women',             type: 'single', eventType: 'hyrox', enabled: true },
    { id: 'single_women_pro',         label: 'Single Women Pro',         type: 'single', eventType: 'hyrox', enabled: true },
    { id: 'double_men',               label: 'Double Men',               type: 'double', eventType: 'hyrox', enabled: true },
    { id: 'double_women',             label: 'Double Women',             type: 'double', eventType: 'hyrox', enabled: true },
    { id: 'double_mixed',             label: 'Double Mixed',             type: 'double', eventType: 'hyrox', enabled: true },
    { id: 'half_single_men',          label: 'Half Single Men',          type: 'single', eventType: 'hyrox', enabled: true },
    { id: 'half_single_women',        label: 'Half Single Women',        type: 'single', eventType: 'hyrox', enabled: true },
    { id: 'half_single_double_men',   label: 'Half Single Double Men',   type: 'double', eventType: 'hyrox', enabled: true },
    { id: 'half_single_double_mixed', label: 'Half Single Double Mixed', type: 'double', eventType: 'hyrox', enabled: true },
    { id: 'half_single_double_women', label: 'Half Single Double Women', type: 'double', eventType: 'hyrox', enabled: true },
    { id: 'hybrid_single_men',        label: 'Single Men',               type: 'single', eventType: 'hybrid', enabled: true },
    { id: 'hybrid_single_women',      label: 'Single Women',             type: 'single', eventType: 'hybrid', enabled: true },
    { id: 'hybrid_double_men',        label: 'Double Men',               type: 'double', eventType: 'hybrid', enabled: true },
    { id: 'hybrid_double_women',      label: 'Double Women',             type: 'double', eventType: 'hybrid', enabled: true },
    { id: 'hybrid_double_mixed',      label: 'Double Mixed',             type: 'double', eventType: 'hybrid', enabled: true },
  ],
  weightCheatSheet: {
    single_men:               { run: '1000m', skiErg: '1000m', sledPush: '102kg', sledPull: '78kg', burpee: '80m', rowing: '1000m', farmerCarry: '24kg each', sandbag: '20kg', lunge: '100m', wallBall: '6kg' },
    single_men_pro:           { run: '1000m', skiErg: '1000m', sledPush: '152kg', sledPull: '103kg', burpee: '80m', rowing: '1000m', farmerCarry: '32kg each', sandbag: '30kg', lunge: '100m', wallBall: '9kg' },
    single_women:             { run: '1000m', skiErg: '1000m', sledPush: '72kg', sledPull: '53kg', burpee: '80m', rowing: '1000m', farmerCarry: '16kg each', sandbag: '10kg', lunge: '100m', wallBall: '4kg' },
    single_women_pro:         { run: '1000m', skiErg: '1000m', sledPush: '102kg', sledPull: '78kg', burpee: '80m', rowing: '1000m', farmerCarry: '24kg each', sandbag: '20kg', lunge: '100m', wallBall: '6kg' },
    double_men:               { run: '1000m', skiErg: '1000m', sledPush: '102kg', sledPull: '78kg', burpee: '80m', rowing: '1000m', farmerCarry: '24kg each', sandbag: '20kg', lunge: '100m', wallBall: '6kg' },
    double_women:             { run: '1000m', skiErg: '1000m', sledPush: '72kg', sledPull: '53kg', burpee: '80m', rowing: '1000m', farmerCarry: '16kg each', sandbag: '10kg', lunge: '100m', wallBall: '4kg' },
    double_mixed:             { run: '1000m', skiErg: '1000m', sledPush: '102kg / 72kg', sledPull: '78kg / 53kg', burpee: '80m', rowing: '1000m', farmerCarry: '24kg / 16kg each', sandbag: '20kg / 10kg', lunge: '100m', wallBall: '6kg / 4kg' },
    half_single_men:          { run: '500m', skiErg: '500m', sledPush: '102kg', sledPull: '78kg', burpee: '40m', rowing: '500m', farmerCarry: '24kg each', sandbag: '20kg', lunge: '50m', wallBall: '6kg' },
    half_single_women:        { run: '500m', skiErg: '500m', sledPush: '72kg', sledPull: '53kg', burpee: '40m', rowing: '500m', farmerCarry: '16kg each', sandbag: '10kg', lunge: '50m', wallBall: '4kg' },
    half_single_double_men:   { run: '500m', skiErg: '500m', sledPush: '102kg', sledPull: '78kg', burpee: '40m', rowing: '500m', farmerCarry: '24kg each', sandbag: '20kg', lunge: '50m', wallBall: '6kg' },
    half_single_double_mixed: { run: '500m', skiErg: '500m', sledPush: '102kg / 72kg', sledPull: '78kg / 53kg', burpee: '40m', rowing: '500m', farmerCarry: '24kg / 16kg each', sandbag: '20kg / 10kg', lunge: '50m', wallBall: '6kg / 4kg' },
    half_single_double_women: { run: '500m', skiErg: '500m', sledPush: '72kg', sledPull: '53kg', burpee: '40m', rowing: '500m', farmerCarry: '16kg each', sandbag: '10kg', lunge: '50m', wallBall: '4kg' },
    hybrid_single_men:        { run: '650m', bikeErg: '1500m', sledCombined: '50m / 120kg', rowing: '1000m', farmerDeadlift: '24kg each', skiErg: '1000m', lunge: '200m', burpee: '100m', assaultBike: '100 cal' },
    hybrid_single_women:      { run: '650m', bikeErg: '1500m', sledCombined: '50m / 90kg', rowing: '1000m', farmerDeadlift: '16kg each', skiErg: '1000m', lunge: '200m', burpee: '100m', assaultBike: '100 cal' },
    hybrid_double_men:        { run: '650m', bikeErg: '1500m', sledCombined: '50m / 120kg', rowing: '1000m', farmerDeadlift: '24kg each', skiErg: '1000m', lunge: '200m', burpee: '100m', assaultBike: '100 cal' },
    hybrid_double_women:      { run: '650m', bikeErg: '1500m', sledCombined: '50m / 90kg', rowing: '1000m', farmerDeadlift: '16kg each', skiErg: '1000m', lunge: '200m', burpee: '100m', assaultBike: '100 cal' },
    hybrid_double_mixed:      { run: '650m', bikeErg: '1500m', sledCombined: '50m / 120kg / 90kg', rowing: '1000m', farmerDeadlift: '24kg / 16kg each', skiErg: '1000m', lunge: '200m', burpee: '100m', assaultBike: '100 cal' },
  },
  stationTemplates: [
    {
      id: 'full_hyrox',
      label: 'Full HYROX',
      stations: [
        { order: 1, type: 'run', label: 'Run', reps_or_distance: '1000m' },
        { order: 2, type: 'station', label: 'Ski Erg', reps_or_distance: '1000m' },
        { order: 3, type: 'run', label: 'Run', reps_or_distance: '1000m' },
        { order: 4, type: 'station', label: 'Sled Push', reps_or_distance: '50m' },
        { order: 5, type: 'run', label: 'Run', reps_or_distance: '1000m' },
        { order: 6, type: 'station', label: 'Sled Pull', reps_or_distance: '50m' },
        { order: 7, type: 'run', label: 'Run', reps_or_distance: '1000m' },
        { order: 8, type: 'station', label: 'Burpee Broad Jump', reps_or_distance: '80m' },
        { order: 9, type: 'run', label: 'Run', reps_or_distance: '1000m' },
        { order: 10, type: 'station', label: 'Row Erg', reps_or_distance: '1000m' },
        { order: 11, type: 'run', label: 'Run', reps_or_distance: '1000m' },
        { order: 12, type: 'station', label: 'Farmers Carry', reps_or_distance: '200m' },
        { order: 13, type: 'run', label: 'Run', reps_or_distance: '1000m' },
        { order: 14, type: 'station', label: 'Walking Lunges', reps_or_distance: '100m' },
        { order: 15, type: 'run', label: 'Run', reps_or_distance: '1000m' },
        { order: 16, type: 'station', label: 'Wall Ball', reps_or_distance: '100 reps' },
      ],
    },
  ],
  checklistItems: [
    { id: 'cl_1',  category: 'Common Areas', order: 1,  text: 'Draw event map on blackboard' },
    { id: 'cl_2',  category: 'Common Areas', order: 2,  text: 'Write station order on blackboard (separate board)' },
    { id: 'cl_3',  category: 'Common Areas', order: 3,  text: 'Mark running-direction arrows' },
    { id: 'cl_4',  category: 'Common Areas', order: 4,  text: 'Set up cones for running direction' },
    { id: 'cl_5',  category: 'Common Areas', order: 5,  text: 'Tape/mark start line' },
    { id: 'cl_6',  category: 'Common Areas', order: 6,  text: 'Tape/mark finish line' },
    { id: 'cl_7',  category: 'Common Areas', order: 7,  text: 'Buzzer/finish area: set up box jumps' },
    { id: 'cl_8',  category: 'Common Areas', order: 8,  text: 'Set up hydration table' },
    { id: 'cl_9',  category: 'Common Areas', order: 9,  text: 'Set up post-run table (bars, drinks)' },
    { id: 'cl_10', category: 'Common Areas', order: 10, text: 'Set up HYROX backdrop' },
    { id: 'cl_11', category: 'Common Areas', order: 11, text: 'Set up welcome area (screen + power outlet)' },
    { id: 'cl_12', category: 'Common Areas', order: 12, text: 'Prepare music playlist' },
    { id: 'cl_13', category: 'Common Areas', order: 13, text: 'Clear/relocate other gym equipment (bikes, etc.) out of event space' },

    { id: 'cl_14', category: 'Run', order: 14, text: 'Mark starting line' },
    { id: 'cl_15', category: 'Run', order: 15, text: 'Mark 250m cone' },

    { id: 'cl_16', category: 'Station 1 — SkiErg', order: 16, text: 'Tape instructions' },

    { id: 'cl_17', category: 'Station 2 — Sled Push', order: 17, text: 'Tape instructions' },
    { id: 'cl_18', category: 'Station 2 — Sled Push', order: 18, text: 'Lay down carpet' },
    { id: 'cl_19', category: 'Station 2 — Sled Push', order: 19, text: 'Chalk distance lines' },
    { id: 'cl_20', category: 'Station 2 — Sled Push', order: 20, text: 'Prepare sleds' },

    { id: 'cl_21', category: 'Station 3 — Sled Pull', order: 21, text: 'Tape instructions to ground' },
    { id: 'cl_22', category: 'Station 3 — Sled Pull', order: 22, text: 'Lay down carpet' },
    { id: 'cl_23', category: 'Station 3 — Sled Pull', order: 23, text: 'Chalk lanes' },
    { id: 'cl_24', category: 'Station 3 — Sled Pull', order: 24, text: "Prepare weights (men's/women's)" },

    { id: 'cl_25', category: 'Station 4 — Burpee Broad Jumps', order: 25, text: 'Tape instructions to ground' },
    { id: 'cl_26', category: 'Station 4 — Burpee Broad Jumps', order: 26, text: 'Tape floor to mark lanes' },

    { id: 'cl_27', category: 'Station 5 — Rowing', order: 27, text: 'Tape instructions to ground' },
    { id: 'cl_28', category: 'Station 5 — Rowing', order: 28, text: 'Prepare rowing machines' },

    { id: 'cl_29', category: 'Station 6 — Farmers Carry', order: 29, text: 'Tape instructions to ground (distances/reps by category)' },
    { id: 'cl_30', category: 'Station 6 — Farmers Carry', order: 30, text: 'Tape floor to mark lanes' },
    { id: 'cl_31', category: 'Station 6 — Farmers Carry', order: 31, text: 'Prepare cones (lane limits)' },
    { id: 'cl_32', category: 'Station 6 — Farmers Carry', order: 32, text: 'Prepare kettlebells' },

    { id: 'cl_33', category: 'Station 7 — Lunges (Sandbag)', order: 33, text: 'Tape instructions to ground' },
    { id: 'cl_34', category: 'Station 7 — Lunges (Sandbag)', order: 34, text: 'Tape floor to mark lanes' },
    { id: 'cl_35', category: 'Station 7 — Lunges (Sandbag)', order: 35, text: 'Prepare sandbags' },

    { id: 'cl_36', category: 'Station 8 — Wall Balls', order: 36, text: 'Tape instructions to ground (distances/reps by category)' },
    { id: 'cl_37', category: 'Station 8 — Wall Balls', order: 37, text: 'Prepare wall balls, slam balls' },

    { id: 'cl_38', category: 'Warm-Up Area', order: 38, text: 'Prepare warm-up equipment (rower, wall balls, sandbags, etc.)' },
  ],
  // Physical setup capacity per station — used by the Overlap Risk tab to reason about
  // congestion when a faster wave catches up to a slower one at a shared station.
  stationCapacities: {
    skiErg: 4,
    sledPush: 4,
    sledPull: 4,
    burpee: 4,
    rowing: 8,
    farmersCarryLanes: 10,
    farmersCarryMenSets: 5,
    farmersCarryWomenSets: 5,
    lungesLanes: 6,
    lungesMenSets: 5,
    lungesWomenSets: 5,
    wallBallLocations: 12,
  },
  // Organizer's own persistent notes on wave-overlap risk, reused across every event.
  riskNotes: '',
}

export async function getOrCreateConfig() {
  const ref = doc(db, 'config', 'main')
  const snap = await getDoc(ref)
  if (!snap.exists()) {
    await setDoc(ref, DEFAULT_CONFIG)
    return DEFAULT_CONFIG
  }
  const data = snap.data()
  let dirty = false

  // Sync categories: add missing defaults; migrate eventType onto existing ones
  const defaultIdSet = new Set(DEFAULT_CONFIG.categories.map(c => c.id))
  const existingIdSet = new Set((data.categories || []).map(c => c.id))
  const missingCats = DEFAULT_CONFIG.categories.filter(c => !existingIdSet.has(c.id))
  let categories = (data.categories || []).map(c => {
    const def = DEFAULT_CONFIG.categories.find(d => d.id === c.id)
    if (def && !c.eventType) {
      dirty = true
      return { ...c, eventType: def.eventType }
    }
    if (!defaultIdSet.has(c.id) && !c.eventType) {
      dirty = true
      return { ...c, eventType: 'hyrox' }
    }
    return c
  })
  if (missingCats.length > 0) {
    categories = [...categories, ...missingCats]
    dirty = true
  }

  // Sync weightCheatSheet: add missing entries and missing fields
  const weights = { ...(data.weightCheatSheet || {}) }
  for (const [catId, defaults] of Object.entries(DEFAULT_CONFIG.weightCheatSheet)) {
    if (!weights[catId]) {
      weights[catId] = defaults
      dirty = true
    } else {
      for (const [field, val] of Object.entries(defaults)) {
        if (weights[catId][field] === undefined) {
          weights[catId][field] = val
          dirty = true
        }
      }
    }
  }

  // Seed categoryStations for any category that doesn't have one yet
  const existingStations = data.categoryStations || {}
  const updatedStations = { ...existingStations }
  for (const cat of DEFAULT_CONFIG.categories) {
    if (!updatedStations[cat.id]) {
      updatedStations[cat.id] = buildDefaultStations(cat.id, DEFAULT_CONFIG.weightCheatSheet[cat.id])
      dirty = true
    }
  }

  // Seed station capacities the first time (won't overwrite values the organizer already set)
  let stationCapacities = data.stationCapacities
  if (!stationCapacities) {
    stationCapacities = DEFAULT_CONFIG.stationCapacities
    dirty = true
  }

  if (!dirty) return data
  const updated = { ...data, categories, weightCheatSheet: weights, categoryStations: updatedStations, stationCapacities }
  await setDoc(ref, updated)
  return updated
}

// Historical average finish time per category, across all events, for the Overlap Risk tab.
export async function getCategoryAverages() {
  const snap = await getDocs(collection(db, 'teams'))
  const sums = {}
  snap.docs.forEach(d => {
    const t = d.data()
    if (t.finishTimeSeconds == null) return
    const key = t.categoryId || t.competitionName
    if (!key) return
    if (!sums[key]) sums[key] = { total: 0, count: 0, label: t.competitionName || key }
    sums[key].total += t.finishTimeSeconds
    sums[key].count += 1
  })
  const result = {}
  for (const [key, { total, count, label }] of Object.entries(sums)) {
    result[key] = { avgSeconds: Math.round(total / count), count, label }
  }
  return result
}
