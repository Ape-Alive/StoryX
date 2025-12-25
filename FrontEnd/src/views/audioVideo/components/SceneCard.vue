<template>
  <div :class="['scene-card', { 'scene-card-selected': isSelected }]">
    <div class="scene-card-content">
      <!-- 左侧详情 (包含场景图展示) -->
      <div class="scene-card-left">
        <div>
          <div class="scene-header">
            <div
              :class="['scene-checkbox', { 'scene-checkbox-checked': isSelected }]"
              @click="$emit('toggle-select', scene.id)"
            >
              <IconCheckCircle
                v-if="isSelected"
                :size="14"
                class="checkbox-icon"
              />
            </div>
            <h3 class="scene-title">{{ scene.address }}</h3>
          </div>
          <div class="scene-status">
            <StatusBadge
              :status="scene.isGenerating ? 'processing' : 'completed'"
              :progress="scene.overallProgress"
            />
          </div>

          <!-- 场景图展示区域 -->
          <div class="scene-image-container">
            <img
              v-if="scene.sceneImage"
              :src="scene.sceneImage"
              :alt="scene.address"
              :class="['scene-image', { 'scene-image-loading': scene.isGenerating }]"
            />
            <div v-if="scene.isGenerating" class="scene-image-overlay">
              <IconLoading :size="24" class="loading-icon" />
            </div>
            <div v-else-if="!scene.sceneImage" class="scene-image-placeholder">
              <ImageIcon :size="24" />
              <span>No Preview</span>
            </div>
          </div>

          <div class="scene-description">
            <p>"{{ scene.sceneDescription }}"</p>
          </div>
        </div>

        <div class="scene-actions">
          <button
            class="generate-btn"
            @click="$emit('generate-scene', scene.id)"
          >
            <IconVideoCamera :size="14" /> 生成当前场景
          </button>
        </div>
      </div>

      <!-- 右侧主轨道编辑器 -->
      <div class="scene-card-right">
        <div class="timeline-header">
          <span class="timeline-title">
            <ScissorsIcon :size="12" /> Timeline Editor
          </span>
          <div class="timeline-tc">
            TC: 00:00:{{ totalDuration }}:00
          </div>
        </div>

        <MultiLayerTimeline
          :scene="scene"
          :selected-id="selectedClipId"
          @select="$emit('select-clip', $event)"
          @context-menu="$emit('context-menu', $event)"
        />

        <div class="timeline-footer">
          <div class="track-indicator">
            <div class="track-dot track-dot-video"></div>
            1 视频轨
          </div>
          <div class="track-indicator">
            <div class="track-dot track-dot-audio"></div>
            1 音频轨
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, h } from 'vue'
import {
  IconCheckCircle,
  IconLoading,
  IconVideoCamera,
} from '@arco-design/web-vue/es/icon'
import StatusBadge from './StatusBadge.vue'
import MultiLayerTimeline from './MultiLayerTimeline.vue'

// 图片图标 SVG
const ImageIcon = {
  setup(props, { attrs }) {
    return () => h('svg', {
      ...attrs,
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': '1.5',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      style: { width: attrs.size || '24px', height: attrs.size || '24px' }
    }, [
      h('rect', { x: '3', y: '3', width: '18', height: '18', rx: '2', ry: '2' }),
      h('circle', { cx: '8.5', cy: '8.5', r: '1.5' }),
      h('polyline', { points: '21 15 16 10 5 21' })
    ])
  }
}

// 剪刀图标 SVG
const ScissorsIcon = {
  setup(props, { attrs }) {
    return () => h('svg', {
      ...attrs,
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': '2',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      style: { width: attrs.size || '12px', height: attrs.size || '12px' }
    }, [
      h('circle', { cx: '6', cy: '6', r: '3' }),
      h('circle', { cx: '6', cy: '18', r: '3' }),
      h('line', { x1: '6', y1: '9', x2: '6', y2: '15' }),
      h('line', { x1: '20', y1: '4', x2: '8.12', y2: '15.88' }),
      h('line', { x1: '14.47', y1: '14.48', x2: '20', y2: '20' }),
      h('line', { x1: '20', y1: '8', x2: '8.12', y2: '19.88' })
    ])
  }
}

const props = defineProps({
  scene: {
    type: Object,
    required: true
  },
  isSelected: {
    type: Boolean,
    default: false
  },
  selectedClipId: {
    type: String,
    default: null
  }
})

defineEmits(['toggle-select', 'generate-scene', 'select-clip', 'context-menu'])

const totalDuration = computed(() => {
  const shots = props.scene.shots || []
  return shots.reduce((acc, s) => acc + (s.duration || 0), 0)
})
</script>

<style scoped>
.scene-card {
  position: relative;
  background-color: #ffffff;
  border-radius: 40px;
  border: 1px solid #e2e8f0;
  transition: all 0.5s;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

.scene-card:hover {
  border-color: #cbd5e1;
}

.scene-card-selected {
  border-color: #3b82f6;
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1), 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.scene-card-content {
  display: flex;
  flex-direction: column;
}

@media (min-width: 1024px) {
  .scene-card-content {
    flex-direction: row;
  }
}

.scene-card-left {
  width: 100%;
  padding: 32px;
  border-right: 1px solid #f1f5f9;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background-color: rgba(248, 250, 252, 0.3);
  flex-shrink: 0;
}

@media (min-width: 1024px) {
  .scene-card-left {
    width: 288px;
  }
}

.scene-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.scene-checkbox {
  width: 24px;
  height: 24px;
  border-radius: 8px;
  border: 2px solid #cbd5e1;
  transition: all 0.2s;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: transparent;
}

.scene-checkbox-checked {
  background-color: #2563eb;
  border-color: #2563eb;
}

.checkbox-icon {
  color: #ffffff;
}

.scene-title {
  font-weight: 900;
  font-size: 20px;
  letter-spacing: -0.025em;
  line-height: 1;
  color: #1e293b;
  margin: 0;
}

.scene-status {
  margin-bottom: 16px;
}

.scene-image-container {
  position: relative;
  aspect-ratio: 16 / 9;
  border-radius: 16px;
  overflow: hidden;
  background-color: #e2e8f0;
  border: 1px solid #e2e8f0;
  box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.06);
}

.scene-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s;
}

.scene-image-container:hover .scene-image {
  transform: scale(1.1);
}

.scene-image-loading {
  filter: blur(2px);
  opacity: 0.7;
}

.scene-image-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(37, 99, 235, 0.1);
}

.loading-icon {
  color: #ffffff;
  animation: spin 1s linear infinite;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
}

.scene-image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  gap: 8px;
}

.scene-image-placeholder span {
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.scene-description {
  margin-top: 16px;
}

.scene-description p {
  font-size: 11px;
  color: #64748b;
  font-weight: 500;
  line-height: 1.625;
  font-style: italic;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.scene-actions {
  margin-top: 32px;
}

.generate-btn {
  width: 100%;
  padding: 16px 0;
  background-color: #0f172a;
  color: #ffffff;
  border-radius: 16px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.generate-btn:hover {
  background-color: #2563eb;
}

.generate-btn:active {
  transform: scale(0.98);
}

.scene-card-right {
  flex: 1;
  padding: 32px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  overflow: hidden;
  min-width: 0;
}

.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 8px;
}

.timeline-title {
  font-size: 10px;
  font-weight: 900;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  display: flex;
  align-items: center;
  gap: 8px;
}

.timeline-tc {
  font-size: 11px;
  font-family: ui-monospace, monospace;
  color: #94a3b8;
  font-weight: 700;
  background-color: #f1f5f9;
  padding: 2px 8px;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: -0.025em;
}

.timeline-footer {
  padding-top: 8px;
  display: flex;
  align-items: center;
  gap: 20px;
}

.track-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
}

.track-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.track-dot-video {
  background-color: #3b82f6;
}

.track-dot-audio {
  background-color: #10b981;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
