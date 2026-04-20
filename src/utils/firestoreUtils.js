import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../firebase'

export function buildDefaultStations(catId, weights) {
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

export const DEFAULT_CONFIG = {
  staff: [],
  categories: [
    { id: 'single_men', label: 'Single Men', type: 'single', enabled: true },
    { id: 'single_men_pro', label: 'Single Men Pro', type: 'single', enabled: true },
    { id: 'single_women', label: 'Single Women', type: 'single', enabled: true },
    { id: 'single_women_pro', label: 'Single Women Pro', type: 'single', enabled: true },
    { id: 'double_men', label: 'Double Men', type: 'double', enabled: true },
    { id: 'double_women', label: 'Double Women', type: 'double', enabled: true },
    { id: 'double_mixed', label: 'Double Mixed', type: 'double', enabled: true },
    { id: 'half_single_men', label: 'Half Single Men', type: 'single', enabled: true },
    { id: 'half_single_women', label: 'Half Single Women', type: 'single', enabled: true },
    { id: 'half_single_double_men', label: 'Half Single Double Men', type: 'double', enabled: true },
    { id: 'half_single_double_mixed', label: 'Half Single Double Mixed', type: 'double', enabled: true },
    { id: 'half_single_double_women', label: 'Half Single Double Women', type: 'double', enabled: true },
  ],
  weightCheatSheet: {
    single_men:               { skiErg: '1000m', sledPush: '102kg', sledPull: '78kg', burpee: '80m', rowing: '1000m', farmerCarry: '24kg each', sandbag: '20kg', lunge: '100m', wallBall: '6kg', run: '1000m' },
    single_men_pro:           { skiErg: '1000m', sledPush: '152kg', sledPull: '103kg', burpee: '80m', rowing: '1000m', farmerCarry: '32kg each', sandbag: '30kg', lunge: '100m', wallBall: '9kg', run: '1000m' },
    single_women:             { skiErg: '1000m', sledPush: '72kg', sledPull: '53kg', burpee: '80m', rowing: '1000m', farmerCarry: '16kg each', sandbag: '10kg', lunge: '100m', wallBall: '4kg', run: '1000m' },
    single_women_pro:         { skiErg: '1000m', sledPush: '102kg', sledPull: '78kg', burpee: '80m', rowing: '1000m', farmerCarry: '24kg each', sandbag: '20kg', lunge: '100m', wallBall: '6kg', run: '1000m' },
    double_men:               { skiErg: '1000m', sledPush: '102kg', sledPull: '78kg', burpee: '80m', rowing: '1000m', farmerCarry: '24kg each', sandbag: '20kg', lunge: '100m', wallBall: '6kg', run: '1000m' },
    double_women:             { skiErg: '1000m', sledPush: '72kg', sledPull: '53kg', burpee: '80m', rowing: '1000m', farmerCarry: '16kg each', sandbag: '10kg', lunge: '100m', wallBall: '4kg', run: '1000m' },
    double_mixed:             { skiErg: '1000m', sledPush: '102kg / 72kg', sledPull: '78kg / 53kg', burpee: '80m', rowing: '1000m', farmerCarry: '24kg / 16kg each', sandbag: '20kg / 10kg', lunge: '100m', wallBall: '6kg / 4kg', run: '1000m' },
    half_single_men:          { skiErg: '500m', sledPush: '102kg', sledPull: '78kg', burpee: '40m', rowing: '500m', farmerCarry: '24kg each', sandbag: '20kg', lunge: '50m', wallBall: '6kg', run: '500m' },
    half_single_women:        { skiErg: '500m', sledPush: '72kg', sledPull: '53kg', burpee: '40m', rowing: '500m', farmerCarry: '16kg each', sandbag: '10kg', lunge: '50m', wallBall: '4kg', run: '500m' },
    half_single_double_men:   { skiErg: '500m', sledPush: '102kg', sledPull: '78kg', burpee: '40m', rowing: '500m', farmerCarry: '24kg each', sandbag: '20kg', lunge: '50m', wallBall: '6kg', run: '500m' },
    half_single_double_mixed: { skiErg: '500m', sledPush: '102kg / 72kg', sledPull: '78kg / 53kg', burpee: '40m', rowing: '500m', farmerCarry: '24kg / 16kg each', sandbag: '20kg / 10kg', lunge: '50m', wallBall: '6kg / 4kg', run: '500m' },
    half_single_double_women: { skiErg: '500m', sledPush: '72kg', sledPull: '53kg', burpee: '40m', rowing: '500m', farmerCarry: '16kg each', sandbag: '10kg', lunge: '50m', wallBall: '4kg', run: '500m' },
  },
  stationTemplates: [
    {
      id: 'full_hyrox',
      label: 'Full HYROX',
      stations: [
        { order: 1, type: 'run', label: 'Run', reps_or_distance: '1000m' },
        { order: 2, type: 'station', label: 'SkiErg', reps_or_distance: '1000m' },
        { order: 3, type: 'run', label: 'Run', reps_or_distance: '1000m' },
        { order: 4, type: 'station', label: 'Sled Push', reps_or_distance: '50m' },
        { order: 5, type: 'run', label: 'Run', reps_or_distance: '1000m' },
        { order: 6, type: 'station', label: 'Sled Pull', reps_or_distance: '50m' },
        { order: 7, type: 'run', label: 'Run', reps_or_distance: '1000m' },
        { order: 8, type: 'station', label: 'Burpee Broad Jump', reps_or_distance: '80m' },
        { order: 9, type: 'run', label: 'Run', reps_or_distance: '1000m' },
        { order: 10, type: 'station', label: 'Rowing', reps_or_distance: '1000m' },
        { order: 11, type: 'run', label: 'Run', reps_or_distance: '1000m' },
        { order: 12, type: 'station', label: 'Farmers Carry', reps_or_distance: '200m' },
        { order: 13, type: 'run', label: 'Run', reps_or_distance: '1000m' },
        { order: 14, type: 'station', label: 'Sandbag Lunges', reps_or_distance: '100m' },
        { order: 15, type: 'run', label: 'Run', reps_or_distance: '1000m' },
        { order: 16, type: 'station', label: 'Wall Balls', reps_or_distance: '100 reps' },
      ],
    },
  ],
  checklistItems: [
    { id: 'cl_1', category: 'Setup', order: 1, text: 'Confirm date and venue availability' },
    { id: 'cl_2', category: 'Setup', order: 2, text: 'Define categories and wave schedule' },
    { id: 'cl_3', category: 'Equipment', order: 3, text: 'SkiErg checked and calibrated' },
    { id: 'cl_4', category: 'Equipment', order: 4, text: 'Sleds loaded to correct weight per category' },
    { id: 'cl_5', category: 'Equipment', order: 5, text: 'Rowing machines set and tested' },
    { id: 'cl_6', category: 'Equipment', order: 6, text: 'Sandbags at correct weight per category' },
    { id: 'cl_7', category: 'Equipment', order: 7, text: 'Wall balls at correct weight per category' },
    { id: 'cl_8', category: 'Equipment', order: 8, text: 'Farmers carry handles and weights prepared' },
    { id: 'cl_9', category: 'Logistics', order: 9, text: 'Start list printed per category' },
    { id: 'cl_10', category: 'Logistics', order: 10, text: 'Bib numbers assigned (starting from 100)' },
    { id: 'cl_11', category: 'Logistics', order: 11, text: 'Timer / stopwatch ready' },
    { id: 'cl_12', category: 'Logistics', order: 12, text: 'Results device ready for time entry' },
    { id: 'cl_13', category: 'Communication', order: 13, text: 'Athletes notified of start times' },
    { id: 'cl_14', category: 'Communication', order: 14, text: 'Coaches briefed on wave schedule' },
    { id: 'cl_15', category: 'Post-event', order: 15, text: 'Results entered and saved' },
    { id: 'cl_16', category: 'Post-event', order: 16, text: 'Equipment cleaned and stored' },
  ],
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

  // Sync categories: add missing defaults, disable stale ones not in defaults
  const defaultIdSet = new Set(DEFAULT_CONFIG.categories.map(c => c.id))
  const existingIdSet = new Set((data.categories || []).map(c => c.id))
  const missingCats = DEFAULT_CONFIG.categories.filter(c => !existingIdSet.has(c.id))
  let categories = (data.categories || []).map(c => {
    if (!defaultIdSet.has(c.id) && c.enabled !== false) {
      dirty = true
      return { ...c, enabled: false }
    }
    return c
  })
  if (missingCats.length > 0) {
    categories = [...categories, ...missingCats]
    dirty = true
  }

  // Sync weightCheatSheet: add missing entries and missing fields for existing entries
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

  if (!dirty) return data
  const updated = { ...data, categories, weightCheatSheet: weights, categoryStations: updatedStations }
  await setDoc(ref, updated)
  return updated
}
