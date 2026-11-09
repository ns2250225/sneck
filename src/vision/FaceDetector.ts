import { FaceLandmarker, FilesetResolver, type FaceLandmarkerResult } from '@mediapipe/tasks-vision'

const LOCAL_WASM = `${import.meta.env.BASE_URL}mediapipe/wasm`
const LOCAL_MODEL = `${import.meta.env.BASE_URL}models/face_landmarker.task`
const CDN_WASM = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${__MP_VERSION__}/wasm`
const CDN_MODEL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'

let instance: FaceLandmarker | null = null
let loading: Promise<FaceLandmarker> | null = null
let lastTimestamp = 0

async function create(wasmPath: string, modelPath: string, delegate: 'GPU' | 'CPU') {
  const fileset = await FilesetResolver.forVisionTasks(wasmPath)
  return FaceLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: modelPath, delegate },
    runningMode: 'VIDEO',
    numFaces: 2,
    minFaceDetectionConfidence: 0.5,
    minFacePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
    outputFaceBlendshapes: false,
    outputFacialTransformationMatrixes: false,
  })
}

/** Loads the Face Landmarker once; later calls reuse the same instance. */
export function loadFaceDetector(): Promise<FaceLandmarker> {
  if (instance) return Promise.resolve(instance)
  if (loading) return loading
  loading = (async () => {
    const attempts: [string, string, 'GPU' | 'CPU'][] = [
      [LOCAL_WASM, LOCAL_MODEL, 'GPU'],
      [LOCAL_WASM, LOCAL_MODEL, 'CPU'],
      [CDN_WASM, CDN_MODEL, 'GPU'],
      [CDN_WASM, CDN_MODEL, 'CPU'],
    ]
    let lastErr: unknown
    for (const [wasm, model, delegate] of attempts) {
      try {
        instance = await create(wasm, model, delegate)
        return instance
      } catch (err) {
        lastErr = err
        console.warn(`[FaceDetector] init failed (${delegate}, ${wasm})`, err)
      }
    }
    loading = null
    throw lastErr ?? new Error('Face Landmarker init failed')
  })()
  return loading
}

export function isFaceDetectorReady(): boolean {
  return instance !== null
}

export function detectFaces(source: HTMLVideoElement | HTMLCanvasElement, now: number): FaceLandmarkerResult | null {
  if (!instance) return null
  // detectForVideo requires strictly increasing timestamps.
  const ts = Math.max(now, lastTimestamp + 1)
  lastTimestamp = ts
  return instance.detectForVideo(source, ts)
}
