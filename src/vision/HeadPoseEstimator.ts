import type { NormalizedLandmark } from '@mediapipe/tasks-vision'

export interface HeadPose {
  /** Degrees; negative = player turns to their own left, positive = right. */
  yaw: number
  /** Degrees; positive = looking up, negative = looking down. */
  pitch: number
  /** Degrees; head tilt toward a shoulder. */
  roll: number
}

export interface FaceBox {
  x: number
  y: number
  w: number
  h: number
}

export interface PoseEstimate {
  pose: HeadPose
  box: FaceBox
  /** 0..1 heuristic quality based on face size and visibility in frame. */
  confidence: number
}

const NOSE_TIP = 1
const FOREHEAD = 10
const CHIN = 152
const CHEEK_IMG_LEFT = 234
const CHEEK_IMG_RIGHT = 454
const EYE_IMG_LEFT = 33
const EYE_IMG_RIGHT = 263

const RAD2DEG = 180 / Math.PI

type V3 = [number, number, number]

/**
 * Estimates head pose from the raw (non-mirrored) camera landmarks so that left/right always
 * refer to the player's own body, regardless of how the preview is displayed.
 */
export function estimateHeadPose(landmarks: NormalizedLandmark[], frameW: number, frameH: number): PoseEstimate | null {
  if (!landmarks || landmarks.length < 468) return null
  const p = (i: number): V3 => [landmarks[i].x * frameW, landmarks[i].y * frameH, landmarks[i].z * frameW]
  const mid = (a: V3, b: V3): V3 => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]
  const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]

  const imgLeft = mid(p(CHEEK_IMG_LEFT), p(EYE_IMG_LEFT))
  const imgRight = mid(p(CHEEK_IMG_RIGHT), p(EYE_IMG_RIGHT))
  const across = sub(imgRight, imgLeft)
  const down = sub(p(CHIN), p(FOREHEAD))

  // across × down points away from the camera (+z); the face normal is its negation.
  const n: V3 = [
    across[1] * down[2] - across[2] * down[1],
    across[2] * down[0] - across[0] * down[2],
    across[0] * down[1] - across[1] * down[0],
  ]
  const len = Math.hypot(n[0], n[1], n[2]) || 1
  const f: V3 = [-n[0] / len, -n[1] / len, -n[2] / len]

  // In the raw image the player's left is the image right (+x).
  const turnLeft = Math.atan2(f[0], -f[2]) * RAD2DEG
  const lookUp = Math.atan2(-f[1], -f[2]) * RAD2DEG
  const roll = Math.atan2(across[1], across[0]) * RAD2DEG

  let minX = 1,
    minY = 1,
    maxX = 0,
    maxY = 0
  for (const i of [CHEEK_IMG_LEFT, CHEEK_IMG_RIGHT, FOREHEAD, CHIN, NOSE_TIP]) {
    const l = landmarks[i]
    minX = Math.min(minX, l.x)
    maxX = Math.max(maxX, l.x)
    minY = Math.min(minY, l.y)
    maxY = Math.max(maxY, l.y)
  }
  const box: FaceBox = { x: minX, y: minY, w: maxX - minX, h: maxY - minY }

  const sizeScore = Math.min(1, box.w / 0.16)
  const inFrame = minX > 0.01 && minY > 0.01 && maxX < 0.99 && maxY < 0.99 ? 1 : 0.4
  const confidence = sizeScore * inFrame

  return { pose: { yaw: -turnLeft, pitch: lookUp, roll }, box, confidence }
}
