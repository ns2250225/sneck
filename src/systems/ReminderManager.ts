import type { Settings } from './StorageManager'

export type ReminderKind = 'rest' | 'pause' | 'session'

export interface Reminder {
  kind: ReminderKind
  title: string
  message: string
}

const BREAK_RESET_MS = 2 * 60 * 1000

/** Tracks continuous play time across games in this page session. */
class ReminderManagerImpl {
  private continuousMs = 0
  private gameMs = 0
  private lastActive = 0
  private firedRest = false
  private firedPause = false
  private firedSession = false

  startGame() {
    if (Date.now() - this.lastActive > BREAK_RESET_MS) this.takeBreak()
    this.gameMs = 0
    this.firedSession = false
    this.lastActive = Date.now()
  }

  takeBreak() {
    this.continuousMs = 0
    this.firedRest = false
    this.firedPause = false
  }

  get continuousMinutes() {
    return this.continuousMs / 60000
  }

  tick(dtMs: number, settings: Settings): Reminder | null {
    this.continuousMs += dtMs
    this.gameMs += dtMs
    this.lastActive = Date.now()
    if (!settings.restReminder) return null

    const intervalMs = settings.reminderInterval * 60000
    if (!this.firedPause && this.continuousMs >= intervalMs * 2) {
      this.firedPause = true
      this.firedRest = true
      return {
        kind: 'pause',
        title: '建议暂停休息',
        message: `你已经连续游戏 ${settings.reminderInterval * 2} 分钟了，建议暂停游戏，起身活动一下，放松肩颈和眼睛。`,
      }
    }
    if (!this.firedRest && this.continuousMs >= intervalMs) {
      this.firedRest = true
      return {
        kind: 'rest',
        title: '休息一下吧',
        message: `已连续游戏 ${settings.reminderInterval} 分钟。眺望远方，让眼睛和颈部都休息一下。`,
      }
    }
    if (settings.sessionLimit > 0 && !this.firedSession && this.gameMs >= settings.sessionLimit * 60000) {
      this.firedSession = true
      return {
        kind: 'session',
        title: '本局时长提醒',
        message: `本局已进行 ${settings.sessionLimit} 分钟，建议每局控制在 ${settings.sessionLimit} 分钟左右，可以结束本局稍作休息。`,
      }
    }
    return null
  }
}

export const ReminderManager = new ReminderManagerImpl()
