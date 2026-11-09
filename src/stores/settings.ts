import { reactive, watch } from 'vue'
import { createDefaultData, DEFAULT_SETTINGS, StorageManager, type StoredData } from '@/systems/StorageManager'
import { AudioManager } from '@/systems/AudioManager'

export const appData = reactive<StoredData>(StorageManager.load())

export const settings = appData.settings

let saveTimer: number | null = null
watch(
  appData,
  () => {
    if (saveTimer !== null) clearTimeout(saveTimer)
    saveTimer = window.setTimeout(() => {
      saveTimer = null
      StorageManager.save(appData)
    }, 200)
  },
  { deep: true },
)

window.addEventListener('pagehide', () => StorageManager.save(appData))

AudioManager.setSound(settings.soundEnabled)
AudioManager.setMusic(settings.musicEnabled)
watch(
  () => settings.soundEnabled,
  (v) => AudioManager.setSound(v),
)
watch(
  () => settings.musicEnabled,
  (v) => AudioManager.setMusic(v),
)

export function resetSettings() {
  Object.assign(appData.settings, { ...DEFAULT_SETTINGS })
}

export function resetAllData() {
  const fresh = createDefaultData()
  StorageManager.clear()
  Object.assign(appData, { ...fresh, settings: appData.settings })
  Object.assign(appData.settings, fresh.settings)
}
