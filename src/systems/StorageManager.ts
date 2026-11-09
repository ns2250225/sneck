import type { ActiveControl, ControlMode, GameMode } from '@/core/types'

export type Sensitivity = 'low' | 'medium' | 'high'

export interface Settings {
  controlMode: ControlMode
  sensitivity: Sensitivity
  smoothing: boolean
  recognitionFeedback: boolean
  cameraPreview: boolean
  autoCalibrate: boolean
  invertYaw: boolean
  invertPitch: boolean
  cameraDeviceId: string
  gameSpeed: number
  autoSpeed: boolean
  soundEnabled: boolean
  musicEnabled: boolean
  vibration: boolean
  showGrid: boolean
  showFps: boolean
  restReminder: boolean
  reminderInterval: number
  sessionLimit: number
  trackPlayTime: boolean
  timedDuration: number
}

export const DEFAULT_SETTINGS: Settings = {
  controlMode: 'head',
  sensitivity: 'medium',
  smoothing: true,
  recognitionFeedback: true,
  cameraPreview: true,
  autoCalibrate: true,
  invertYaw: false,
  invertPitch: false,
  cameraDeviceId: '',
  gameSpeed: 3,
  autoSpeed: true,
  soundEnabled: true,
  musicEnabled: false,
  vibration: true,
  showGrid: true,
  showFps: false,
  restReminder: true,
  reminderInterval: 5,
  sessionLimit: 2,
  trackPlayTime: true,
  timedDuration: 120,
}

export interface Statistics {
  bestScore: number
  totalGames: number
  totalPlayTime: number
  totalFoods: number
  totalNormalFoods: number
  maxSnakeLength: number
  totalHeadMoves: number
  modeCounts: Record<GameMode, number>
  controlCounts: Record<ActiveControl, number>
  modeBest: Record<GameMode, number>
}

export interface SessionRecord {
  t: number
  d: number
  s: number
  m: GameMode
  c: ActiveControl
}

export interface CalibrationBaseline {
  yaw: number
  pitch: number
  roll: number
}

export interface StoredData {
  version: number
  settings: Settings
  statistics: Statistics
  achievements: string[]
  achievementDates: Record<string, number>
  unlockedSkins: string[]
  unlockedThemes: string[]
  unlockedFoodSkins: string[]
  selectedSkin: string
  selectedTheme: string
  selectedFoodSkin: string
  sessions: SessionRecord[]
  calibration: CalibrationBaseline | null
}

const STORAGE_KEY = 'neck-snake-data'
const MAX_SESSIONS = 1000

const zeroModes = (): Record<GameMode, number> => ({ classic: 0, timed: 0, obstacle: 0, endless: 0 })

export function createDefaultData(): StoredData {
  return {
    version: 1,
    settings: { ...DEFAULT_SETTINGS },
    statistics: {
      bestScore: 0,
      totalGames: 0,
      totalPlayTime: 0,
      totalFoods: 0,
      totalNormalFoods: 0,
      maxSnakeLength: 0,
      totalHeadMoves: 0,
      modeCounts: zeroModes(),
      controlCounts: { head: 0, touch: 0 },
      modeBest: zeroModes(),
    },
    achievements: [],
    achievementDates: {},
    unlockedSkins: ['classic'],
    unlockedThemes: ['grass'],
    unlockedFoodSkins: ['apple'],
    selectedSkin: 'classic',
    selectedTheme: 'grass',
    selectedFoodSkin: 'apple',
    sessions: [],
    calibration: null,
  }
}

function merge(defaults: StoredData, raw: Partial<StoredData>): StoredData {
  return {
    ...defaults,
    ...raw,
    settings: { ...defaults.settings, ...(raw.settings ?? {}) },
    statistics: {
      ...defaults.statistics,
      ...(raw.statistics ?? {}),
      modeCounts: { ...defaults.statistics.modeCounts, ...(raw.statistics?.modeCounts ?? {}) },
      controlCounts: { ...defaults.statistics.controlCounts, ...(raw.statistics?.controlCounts ?? {}) },
      modeBest: { ...defaults.statistics.modeBest, ...(raw.statistics?.modeBest ?? {}) },
    },
    achievements: Array.isArray(raw.achievements) ? raw.achievements : [],
    achievementDates: raw.achievementDates ?? {},
    unlockedSkins: Array.isArray(raw.unlockedSkins) ? raw.unlockedSkins : defaults.unlockedSkins,
    unlockedThemes: Array.isArray(raw.unlockedThemes) ? raw.unlockedThemes : defaults.unlockedThemes,
    unlockedFoodSkins: Array.isArray(raw.unlockedFoodSkins) ? raw.unlockedFoodSkins : defaults.unlockedFoodSkins,
    sessions: Array.isArray(raw.sessions) ? raw.sessions : [],
  }
}

export const StorageManager = {
  load(): StoredData {
    const defaults = createDefaultData()
    try {
      const text = localStorage.getItem(STORAGE_KEY)
      if (!text) return defaults
      return merge(defaults, JSON.parse(text) as Partial<StoredData>)
    } catch {
      return defaults
    }
  },

  save(data: StoredData) {
    try {
      if (data.sessions.length > MAX_SESSIONS) data.sessions.splice(0, data.sessions.length - MAX_SESSIONS)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {
      /* storage full or unavailable (private mode) */
    }
  },

  clear() {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* ignore */
    }
  },
}
