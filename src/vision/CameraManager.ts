import { hasCameraApi, isSecureForCamera } from '@/utils/device'

export type CameraErrorKind = 'denied' | 'notFound' | 'inUse' | 'insecure' | 'unsupported' | 'unknown'

export class CameraError extends Error {
  constructor(
    public kind: CameraErrorKind,
    message: string,
  ) {
    super(message)
  }
}

export const CAMERA_ERROR_TEXT: Record<CameraErrorKind, string> = {
  denied: '摄像头权限被拒绝。请在浏览器设置中允许访问摄像头，或使用触屏模式游玩。',
  notFound: '没有找到可用的摄像头设备。',
  inUse: '摄像头可能正被其他应用占用，请关闭其他使用摄像头的应用后重试。',
  insecure: '摄像头需要通过 HTTPS 或 localhost 访问，当前页面环境不支持。',
  unsupported: '当前浏览器不支持摄像头 API，请使用最新版 Safari / Chrome，或使用触屏模式。',
  unknown: '摄像头启动失败，请重试或使用触屏模式。',
}

export function classifyCameraError(err: unknown): CameraError {
  if (err instanceof CameraError) return err
  const name = (err as { name?: string })?.name ?? ''
  let kind: CameraErrorKind = 'unknown'
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') kind = 'denied'
  else if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || name === 'OverconstrainedError') kind = 'notFound'
  else if (name === 'NotReadableError' || name === 'TrackStartError' || name === 'AbortError') kind = 'inUse'
  return new CameraError(kind, CAMERA_ERROR_TEXT[kind])
}

export interface CameraDevice {
  deviceId: string
  label: string
}

export class CameraManager {
  readonly video: HTMLVideoElement
  stream: MediaStream | null = null
  activeDeviceId = ''

  constructor() {
    const v = document.createElement('video')
    v.setAttribute('playsinline', '')
    v.setAttribute('webkit-playsinline', '')
    v.muted = true
    v.autoplay = true
    // iOS Safari only decodes frames for videos attached to the document.
    Object.assign(v.style, {
      position: 'fixed',
      width: '2px',
      height: '2px',
      opacity: '0',
      pointerEvents: 'none',
      left: '0',
      top: '0',
    })
    document.body.appendChild(v)
    this.video = v
  }

  get isActive(): boolean {
    return !!this.stream && this.stream.getVideoTracks().some((t) => t.readyState === 'live')
  }

  async start(deviceId?: string): Promise<MediaStream> {
    if (!isSecureForCamera()) throw new CameraError('insecure', CAMERA_ERROR_TEXT.insecure)
    if (!hasCameraApi()) throw new CameraError('unsupported', CAMERA_ERROR_TEXT.unsupported)
    this.stop()

    const base: MediaTrackConstraints = {
      width: { ideal: 640 },
      height: { ideal: 480 },
      frameRate: { ideal: 30, max: 30 },
    }
    const video: MediaTrackConstraints = deviceId ? { ...base, deviceId: { exact: deviceId } } : { ...base, facingMode: 'user' }

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video, audio: false })
    } catch (err) {
      const e = classifyCameraError(err)
      if (deviceId && e.kind === 'notFound') {
        stream = await navigator.mediaDevices
          .getUserMedia({ video: { ...base, facingMode: 'user' }, audio: false })
          .catch((e2) => {
            throw classifyCameraError(e2)
          })
      } else {
        throw e
      }
    }

    this.stream = stream
    this.activeDeviceId = stream.getVideoTracks()[0]?.getSettings().deviceId ?? ''
    this.video.srcObject = stream
    try {
      await this.video.play()
    } catch {
      /* autoplay is allowed for muted inline video; ignore transient play() rejections */
    }
    await this.waitForFrames()
    return stream
  }

  private waitForFrames(): Promise<void> {
    return new Promise((resolve) => {
      if (this.video.readyState >= 2 && this.video.videoWidth > 0) return resolve()
      const done = () => {
        this.video.removeEventListener('loadeddata', done)
        resolve()
      }
      this.video.addEventListener('loadeddata', done)
      window.setTimeout(done, 4000)
    })
  }

  stop() {
    if (this.stream) {
      for (const t of this.stream.getTracks()) t.stop()
      this.stream = null
    }
    this.video.srcObject = null
  }

  destroy() {
    this.stop()
    this.video.remove()
  }

  static async listDevices(): Promise<CameraDevice[]> {
    if (!hasCameraApi() || !navigator.mediaDevices.enumerateDevices) return []
    const devices = await navigator.mediaDevices.enumerateDevices()
    return devices
      .filter((d) => d.kind === 'videoinput')
      .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `摄像头 ${i + 1}` }))
  }

  static async permissionState(): Promise<PermissionState | 'unknown'> {
    try {
      const status = await navigator.permissions.query({ name: 'camera' as PermissionName })
      return status.state
    } catch {
      return 'unknown'
    }
  }
}
