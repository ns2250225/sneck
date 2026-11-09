<script setup lang="ts" generic="T extends string | number">
defineProps<{ label: string; desc?: string; options: { value: T; label: string }[] }>()
const model = defineModel<T>({ required: true })
</script>

<template>
  <div class="setting">
    <div class="text">
      <div class="label">{{ label }}</div>
      <div v-if="desc" class="desc">{{ desc }}</div>
    </div>
    <div class="seg">
      <button
        v-for="o in options"
        :key="String(o.value)"
        type="button"
        :class="{ on: model === o.value }"
        @click="model = o.value"
      >
        {{ o.label }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.setting {
  padding: 8px 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
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
.seg {
  display: flex;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 3px;
  gap: 3px;
}
.seg button {
  flex: 1;
  min-height: 38px;
  border-radius: 9px;
  font-size: 13px;
  font-weight: 700;
  color: var(--muted);
  transition: background 0.15s, color 0.15s;
}
.seg button.on {
  background: var(--accent);
  color: #062a22;
}
</style>
