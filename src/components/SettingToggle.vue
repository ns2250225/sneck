<script setup lang="ts">
defineProps<{ label: string; desc?: string }>()
const model = defineModel<boolean>({ required: true })
</script>

<template>
  <label class="setting">
    <div class="text">
      <div class="label">{{ label }}</div>
      <div v-if="desc" class="desc">{{ desc }}</div>
    </div>
    <button type="button" class="switch" :class="{ on: model }" role="switch" :aria-checked="model" @click="model = !model">
      <i />
    </button>
  </label>
</template>

<style scoped>
.setting {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 52px;
  padding: 6px 0;
}
.text {
  flex: 1;
  min-width: 0;
}
.label {
  font-size: 15px;
  font-weight: 600;
}
.desc {
  font-size: 12px;
  color: var(--muted);
  margin-top: 2px;
}
.switch {
  width: 50px;
  height: 30px;
  border-radius: 99px;
  background: rgba(255, 255, 255, 0.12);
  position: relative;
  flex-shrink: 0;
  transition: background 0.2s;
}
.switch i {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #fff;
  transition: transform 0.2s cubic-bezier(0.3, 1.4, 0.5, 1);
}
.switch.on {
  background: var(--accent);
}
.switch.on i {
  transform: translateX(20px);
}
</style>
