<template>
  <div class="timeline-container">
    <div
      ref="scrollContainerRef"
      @wheel.prevent.stop="handleWheel"
      class="timeline-scroll"
    >
      <!-- Prompt 轨道 -->
      <div class="timeline-track" :style="{ minWidth: `${timelineWidth + 96}px` }">
        <TrackLabel icon="layers" label="Prompt" />
        <div class="track-content" :style="{ width: `${timelineWidth}px` }">
          <Clip
            v-for="(shot, index) in (scene.shots || [])"
            :key="shot.id"
            :item="shot"
            type="shot"
            :is-selected="selectedId === shot.id"
            :width-px="totalDuration > 0 ? shot.duration * pxPerSecond : 0"
            :start-px="getClipStartPosition(scene.shots || [], index)"
            @select="handleSelect"
            @context-menu="handleContextMenu"
          />
        </div>
      </div>

      <!-- Video 轨道 -->
      <div class="timeline-track" :style="{ minWidth: `${timelineWidth + 96}px` }">
        <TrackLabel icon="video" label="Video" />
        <div class="track-content" :style="{ width: `${timelineWidth}px` }">
          <Clip
            v-for="(video, index) in (scene.videoAssets || [])"
            :key="video.id"
            :item="video"
            type="video"
            :is-selected="selectedId === video.id"
            :width-px="totalDuration > 0 ? video.duration * pxPerSecond : 0"
            :start-px="getClipStartPosition(scene.videoAssets || [], index)"
            @select="handleSelect"
            @context-menu="handleContextMenu"
          />
        </div>
      </div>

      <!-- Audio 轨道 -->
      <div class="timeline-track" :style="{ minWidth: `${timelineWidth + 96}px` }">
        <TrackLabel icon="mic" label="Audio" />
        <div class="track-content" :style="{ width: `${timelineWidth}px` }">
          <Clip
            v-for="(audio, index) in (scene.audioAssets || [])"
            :key="audio.id"
            :item="audio"
            type="audio"
            :is-selected="selectedId === audio.id"
            :width-px="totalDuration > 0 ? audio.duration * pxPerSecond : 0"
            :start-px="getClipStartPosition(scene.audioAssets || [], index)"
            @select="handleSelect"
            @context-menu="handleContextMenu"
          />
        </div>
      </div>

      <!-- 时间轴刻度 -->
      <div
        class="timeline-ruler"
        :style="{ minWidth: `${timelineWidth + 96}px` }"
      >
        <div class="ruler-label"></div>
        <div class="ruler-content" :style="{ width: `${timelineWidth}px` }">
          <div
            v-for="i in Math.ceil(totalDuration) + 1"
            :key="i"
            class="ruler-mark"
            :style="{ left: `${2 + (i - 1) * pxPerSecond}px` }"
          >
            {{ i - 1 }}s
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import TrackLabel from './TrackLabel.vue'
import Clip from './Clip.vue'

const props = defineProps({
  scene: {
    type: Object,
    required: true
  },
  selectedId: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['select', 'context-menu'])

const scrollContainerRef = ref(null)
const pxPerSecond = 30

const totalDuration = computed(() => {
  const shots = props.scene.shots || []
  if (shots.length === 0) return 0
  return shots.reduce((acc, s) => acc + (s.duration || 0), 0)
})

const timelineWidth = computed(() => {
  return Math.max(totalDuration.value * pxPerSecond, 800)
})

const handleWheel = (e) => {
  if (scrollContainerRef.value) {
    scrollContainerRef.value.scrollLeft += e.deltaY
  }
}

const handleSelect = (item, type) => {
  emit('select', { ...item, type })
}

const handleContextMenu = (e, item, type) => {
  emit('context-menu', e, item, type)
}

// 计算 clip 的起始位置（像素）
// 基于累积时间计算，确保与时间刻度对齐
function getClipStartPosition(items, index) {
  let cumulativeTime = 0
  for (let i = 0; i < index; i++) {
    cumulativeTime += items[i].duration || 0
  }
  // 2px 是 track-content 的 padding，然后加上累积时间对应的像素
  return 2 + cumulativeTime * pxPerSecond
}
</script>

<style scoped>
.timeline-container {
  position: relative;
  background-color: #ffffff;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

.timeline-scroll {
  display: flex;
  flex-direction: column;
  gap: 1px;
  background-color: #e2e8f0;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.timeline-scroll::-webkit-scrollbar {
  display: none;
}

.timeline-track {
  display: flex;
  height: 56px;
  background-color: #ffffff;
}

.track-content {
  display: flex;
  gap: 2px;
  padding: 2px;
  position: relative;
}

.timeline-ruler {
  display: flex;
  height: 24px;
  background-color: #f8fafc;
  border-top: 1px solid #e2e8f0;
  position: sticky;
  bottom: 0;
}

.ruler-label {
  width: 96px;
  background-color: #f8fafc;
  border-right: 1px solid #e2e8f0;
  position: sticky;
  left: 0;
  z-index: 20;
}

.ruler-content {
  position: relative;
  height: 100%;
}

.ruler-mark {
  position: absolute;
  height: 100%;
  border-left: 1px solid #cbd5e1;
  font-size: 8px;
  color: #64748b;
  padding-left: 4px;
  padding-top: 4px;
  box-sizing: border-box;
}
</style>
