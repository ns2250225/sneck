<script setup lang="ts">
withDefaults(defineProps<{ show: boolean; wide?: boolean }>(), { wide: false })
</script>

<template>
  <Transition name="fade">
    <div v-if="show" class="overlay">
      <Transition name="pop" appear>
        <div class="modal" :class="{ wide }">
          <slot />
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 500;
  background: rgba(6, 10, 20, 0.72);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: calc(var(--safe-top) + 16px) 16px calc(var(--safe-bottom) + 16px);
}
.modal {
  width: min(100%, 380px);
  max-height: 100%;
  overflow-y: auto;
  background: var(--panel);
  border: 1px solid rgba(32, 217, 176, 0.25);
  border-radius: 22px;
  padding: 22px 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}
.modal.wide {
  width: min(100%, 560px);
}
</style>
