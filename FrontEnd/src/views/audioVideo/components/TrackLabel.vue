<template>
  <div class="track-label">
    <component
      :is="iconComponent"
      :size="12"
      :class="['track-icon', `track-icon-${icon}`]"
    />
    <span class="track-label-text">{{ label }}</span>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import {
  IconLayers,
  IconVideoCamera,
  IconSound
} from '@arco-design/web-vue/es/icon'

const props = defineProps({
  icon: {
    type: String,
    required: true
  },
  label: {
    type: String,
    required: true
  },
  color: {
    type: String,
    default: 'text-slate-500'
  }
})

const iconComponent = computed(() => {
  const iconMap = {
    layers: IconLayers,
    video: IconVideoCamera,
    mic: IconSound
  }
  return iconMap[props.icon] || IconLayers
})
</script>

<style scoped>
.track-label {
  width: 96px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  border-right: 1px solid #e2e8f0;
  background-color: #ffffff;
  position: sticky;
  left: 0;
  z-index: 20;
}

.track-icon {
  color: #64748b;
}

.track-icon-layers {
  color: #64748b;
}

.track-icon-video {
  color: #3b82f6;
}

.track-icon-mic {
  color: #10b981;
}

.track-label-text {
  font-size: 10px;
  font-weight: 900;
  text-transform: uppercase;
  color: #64748b;
  letter-spacing: -0.025em;
}
</style>
