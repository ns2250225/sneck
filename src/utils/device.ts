export type DeviceKind = 'phone' | 'tablet' | 'desktop'

const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''

export const isIOS =
  /iPad|iPhone|iPod/.test(ua) || (typeof navigator !== 'undefined' && navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

export const isAndroid = /Android/i.test(ua)

export const isWeChat = /MicroMessenger/i.test(ua)

export const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)

export function getDeviceKind(): DeviceKind {
  const minSide = Math.min(window.innerWidth, window.innerHeight)
  const maxSide = Math.max(window.innerWidth, window.innerHeight)
  if (isTouchDevice || isIOS || isAndroid) {
    if (minSide >= 600 && maxSide >= 900) return 'tablet'
    return 'phone'
  }
  if (maxSide < 820) return 'phone'
  return 'desktop'
}

export function isLandscape(): boolean {
  return window.innerWidth > window.innerHeight
}

export function getGridSize(): { cols: number; rows: number } {
  const kind = getDeviceKind()
  const landscape = isLandscape()
  if (kind === 'desktop') return { cols: 40, rows: 30 }
  if (kind === 'tablet') return landscape ? { cols: 30, rows: 22 } : { cols: 22, rows: 30 }
  return landscape ? { cols: 30, rows: 18 } : { cols: 20, rows: 28 }
}

export function isSecureForCamera(): boolean {
  return window.isSecureContext || location.hostname === 'localhost' || location.hostname === '127.0.0.1'
}

export function hasCameraApi(): boolean {
  return !!(navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function')
}

export function vibrate(pattern: number | number[]) {
  try {
    if ('vibrate' in navigator) navigator.vibrate(pattern)
  } catch {
    /* unsupported */
  }
}
