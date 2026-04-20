import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../firebase'

export const DEFAULT_CONFIG = {
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
    single_men:               { sledPush: '102kg', sledPull: '78kg', sandbag: '20kg', wallBall: '6kg', farmerCarry: '24kg each', run: '1000m', burpee: '80m' },
    single_men_pro:           { sledPush: '152kg', sledPull: '103kg', sandbag: '30kg', wallBall: '9kg', farmerCarry: '32kg each', run: '1000m', burpee: '80m' },
    single_women:             { sledPush: '72kg', sledPull: '53kg', sandbag: '10kg', wallBall: '4kg', farmerCarry: '16kg each', run: '1000m', burpee: '80m' },
    single_women_pro:         { sledPush: '102kg', sledPull: '78kg', sandbag: '20kg', wallBall: '6kg', farmerCarry: '24kg each', run: '1000m', burpee: '80m' },
    double_men:               { sledPush: '102kg', sledPull: '78kg', sandbag: '20kg', wallBall: '6kg', farmerCarry: '24kg each', run: '1000m', burpee: '80m' },
    double_women:             { sledPush: '72kg', sledPull: '53kg', sandbag: '10kg', wallBall: '4kg', farmerCarry: '16kg each', run: '1000m', burpee: '80m' },
    double_mixed:             { sledPush: '102kg / 72kg', sledPull: '78kg / 53kg', sandbag: '20kg / 10kg', wallBall: '6kg / 4kg', farmerCarry: '24kg / 16kg each', run: '1000m', burpee: '80m' },
    half_single_men:          { sledPush: '102kg', sledPull: '78kg', sandbag: '20kg', wallBall: '6kg', farmerCarry: '24kg each', run: '500m', burpee: '40m' },
    half_single_women:        { sledPush: '72kg', sledPull: '53kg', sandbag: '10kg', wallBall: '4kg', farmerCarry: '16kg each', run: '500m', burpee: '40m' },
    half_single_double_men:   { sledPush: '102kg', sledPull: '78kg', sandbag: '20kg', wallBall: '6kg', farmerCarry: '24kg each', run: '500m', burpee: '40m' },
    half_single_double_mixed: { sledPush: '102kg / 72kg', sledPull: '78kg / 53kg', sandbag: '20kg / 10kg', wallBall: '6kg / 4kg', farmerCarry: '24kg / 16kg each', run: '500m', burpee: '40m' },
    half_single_double_women: { sledPush: '72kg', sledPull: '53kg', sandbag: '10kg', wallBall: '4kg', farmerCarry: '16kg each', run: '500m', burpee: '40m' },
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

  if (!dirty) return data
  const updated = { ...data, categories, weightCheatSheet: weights }
  await setDoc(ref, updated)
  return updated
}
