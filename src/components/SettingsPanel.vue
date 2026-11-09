<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Crosshair, RotateCcw, Trash2 } from 'lucide-vue-next'
import SettingToggle from './SettingToggle.vue'
import SettingSegment from './SettingSegment.vue'
import { appData, resetAllData, resetSettings, settings } from '@/stores/settings'
import { gameStore } from '@/stores/game'
import { HeadTracker } from '@/vision/HeadTracker'
import { SPEED_LABELS } from '@/core/types'
import type { ControlMode } from '@/core/types'
import type { Sensitivity } from '@/systems/StorageManager'

const props = withDefaults(defineProps<{ inGame?: boolean }>(), { inGame: false })
const emit = defineEmits<{ recalibrate: [] }>()

const tracker = HeadTracker.state
const confirmReset = ref(false)

onMounted(() => void HeadTracker.refreshDevices())

const controlOptions: { value: ControlMode; label: string }[] = [
  { value: 'head', label: '头部控制' },
  { value: 'touch', label: '触屏控制' },
  { value: 'auto', label: '自动' },
]
const sensitivityOptions: { value: Sensitivity; label: string }[] = [
  { value: 'low', label: '低' },
  { value: 'medium', label: '中' },
  { value: 'high', label: '高' },
]
const speedOptions = SPEED_LABELS.map((label, i) => ({ value: i + 1, label }))
const intervalOptions = [
  { value: 3, label: '3 分钟' },
  { value: 5, label: '5 分钟' },
  { value: 8, label: '8 分钟' },
]
const limitOptions = [
  { value: 0, label: '不限' },
  { value: 2, label: '2 分钟' },
  { value: 3, label: '3 分钟' },
  { value: 5, label: '5 分钟' },
]
const timedOptions = [
  { value: 60, label: '60 秒' },
  { value: 90, label: '90 秒' },
  { value: 120, label: '120 秒' },
  { value: 180, label: '180 秒' },
]

function recalibrate() {
  appData.calibration = null
  gameStore.calibratedThisSession = false
  if (props.inGame) emit('recalibrate')
}

function doReset() {
  resetAllData()
  confirmReset.value = false
}
</script>

<template>
  <div class="settings">
    <div class="section-title">控制设置</div>
    <div class="card group">
      <SettingSegment
        v-model="settings.controlMode"
        label="控制方式"
        desc="自动模式下摄像头不可用时切换为触屏"
        :options="controlOptions"
      />
      <SettingSegment
        v-model="settings.sensitivity"
        label="头部识别灵敏度"
        desc="低：需要更明显的动作；高：较小的动作即可触发"
        :options="sensitivityOptions"
      />
      <SettingToggle v-model="settings.smoothing" label="头部动作平滑" desc="使用 One Euro 滤波减少识别抖动" />
      <SettingToggle v-model="settings.recognitionFeedback" label="识别反馈" desc="方向改变时显示箭头并播放提示音" />
      <SettingToggle v-model="settings.cameraPreview" label="摄像头预览" desc="在游戏界面显示小型摄像头画面" />
      <SettingToggle v-model="settings.autoCalibrate" label="自动校准" desc="每次进入头部控制时先进行姿态校准" />
      <SettingToggle v-model="settings.invertYaw" label="反转左右" desc="如果左右方向与实际相反，可以开启" />
      <SettingToggle v-model="settings.invertPitch" label="反转上下" desc="如果抬头/低头方向相反，可以开启" />
      <div v-if="tracker.devices.length > 1" class="device">
        <div class="label">摄像头设备</div>
        <select v-model="settings.cameraDeviceId">
          <option value="">默认（前置摄像头）</option>
          <option v-for="d in tracker.devices" :key="d.deviceId" :value="d.deviceId">{{ d.label }}</option>
        </select>
      </div>
      <button class="btn btn-sm btn-ghost recal" @click="recalibrate">
        <Crosshair :size="16" /> 重新校准头部姿态
      </button>
    </div>

    <div class="section-title">游戏设置</div>
    <div class="card group">
      <SettingSegment v-model="settings.gameSpeed" label="游戏速度" :options="speedOptions" />
      <SettingToggle v-model="settings.autoSpeed" label="自动提速" desc="每获得 100 分速度逐渐提高" />
      <SettingSegment v-model="settings.timedDuration" label="限时模式时长" :options="timedOptions" />
      <SettingToggle v-model="settings.soundEnabled" label="游戏音效" />
      <SettingToggle v-model="settings.musicEnabled" label="背景音乐" />
      <SettingToggle v-model="settings.vibration" label="游戏震动" desc="设备支持时生效" />
      <SettingToggle v-model="settings.showGrid" label="显示网格" />
      <SettingToggle v-model="settings.showFps" label="显示 FPS" />
    </div>

    <div class="section-title">健康提醒</div>
    <div class="card group">
      <SettingToggle v-model="settings.restReminder" label="休息提醒" desc="连续游戏一段时间后提示休息" />
      <SettingSegment v-model="settings.reminderInterval" label="提醒间隔" :options="intervalOptions" />
      <SettingSegment
        v-model="settings.sessionLimit"
        label="单局时长限制"
        desc="到达时长后提醒结束本局"
        :options="limitOptions"
      />
      <SettingToggle v-model="settings.trackPlayTime" label="游戏时长统计" />
    </div>

    <template v-if="!inGame">
      <div class="section-title">数据</div>
      <div class="card group data">
        <button class="btn btn-sm" @click="resetSettings"><RotateCcw :size="16" /> 恢复默认设置</button>
        <button v-if="!confirmReset" class="btn btn-sm btn-danger" @click="confirmReset = true">
          <Trash2 :size="16" /> 清除所有本地数据
        </button>
        <div v-else class="confirm">
          <span>确认清除最高分、统计、成就与皮肤？</span>
          <div class="row">
            <button class="btn btn-sm btn-danger" @click="doReset">确认清除</button>
            <button class="btn btn-sm" @click="confirmReset = false">取消</button>
          </div>
        </div>
      </div>
    </template>

    <p class="privacy muted">
      所有数据仅保存在本设备浏览器中。摄像头画面只在本地处理，不会上传、不会保存人脸图像或关键点。本游戏不替代医疗建议或康复训练，如有不适请立即停止。
    </p>
  </div>
</template>

<style scoped>
.settings {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.group {
  padding: 6px 16px;
  display: flex;
  flex-direction: column;
}
.group > * + * {
  border-top: 1px solid var(--line);
}
.device {
  padding: 10px 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.device .label {
  font-weight: 600;
}
select {
  min-height: 42px;
  border-radius: 10px;
  background: var(--panel-2);
  color: var(--text);
  border: 1px solid var(--line);
  padding: 0 10px;
  font-size: 14px;
}
.recal {
  margin: 10px 0;
  border-top: none !important;
}
.data {
  gap: 10px;
  padding: 14px 16px;
}
.data > * + * {
  border-top: none;
}
.confirm {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 14px;
}
.row {
  display: flex;
  gap: 8px;
}
.privacy {
  font-size: 12px;
  line-height: 1.6;
  margin: 12px 4px 0;
}
</style>
