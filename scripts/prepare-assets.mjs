import { cpSync, existsSync, mkdirSync, writeFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const wasmSrc = join(root, 'node_modules', '@mediapipe', 'tasks-vision', 'wasm')
const wasmDest = join(root, 'public', 'mediapipe', 'wasm')
const modelDir = join(root, 'public', 'models')
const modelPath = join(modelDir, 'face_landmarker.task')
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'

if (existsSync(wasmSrc)) {
  mkdirSync(wasmDest, { recursive: true })
  cpSync(wasmSrc, wasmDest, { recursive: true })
  console.log('[neck-snake] MediaPipe wasm copied to public/mediapipe/wasm')
} else {
  console.warn('[neck-snake] @mediapipe/tasks-vision wasm not found, CDN fallback will be used')
}

const hasModel = existsSync(modelPath) && statSync(modelPath).size > 100000
if (!hasModel) {
  mkdirSync(modelDir, { recursive: true })
  try {
    const res = await fetch(MODEL_URL)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    writeFileSync(modelPath, Buffer.from(await res.arrayBuffer()))
    console.log('[neck-snake] face_landmarker.task downloaded to public/models')
  } catch (err) {
    console.warn(
      `[neck-snake] Failed to download model (${err.message}). Place face_landmarker.task in public/models manually; remote fallback will be used at runtime.`,
    )
  }
}
