<template>
  <div
    @click="handleClick"
    @contextmenu="handleContextMenu"
    :class="[
      'clip',
      `clip-${type}`,
      { 'clip-selected': isSelected, 'clip-generating': isGenerating }
    ]"
    :style="{
      width: widthPx > 0 ? `${widthPx}px` : '80px',
      minWidth: '80px',
      left: startPx > 0 ? `${startPx}px` : '2px',
      position: 'absolute',
    }"
  >
    <div class="clip-header">
      <span class="clip-label">{{ item.shotId || item.label || "Clip" }}</span>
      <span class="clip-duration">{{ item.duration }}s</span>
    </div>
    <div v-if="item.action || item.text" class="clip-text">
      {{ item.action || item.text }}
    </div>

    <!-- 生成进度条 -->
    <div v-if="isGenerating" class="clip-progress">
      <div class="progress-bar">
        <div
          class="progress-fill"
          :style="{ width: progressPercent + '%' }"
        ></div>
      </div>
      <div class="progress-text">{{ progressPercent }}%</div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  item: {
    type: Object,
    required: true,
  },
  type: {
    type: String,
    required: true,
  },
  isSelected: {
    type: Boolean,
    default: false,
  },
  widthPx: {
    type: Number,
    required: true,
  },
  startPx: {
    type: Number,
    default: 2,
  },
});

const emit = defineEmits(["select", "context-menu"]);

// 判断是否正在生成
const isGenerating = computed(() => {
  return (
    props.item.status === "pending" ||
    props.item.status === "processing" ||
    (props.item.progress !== undefined && props.item.progress < 100)
  );
});

// 进度百分比
const progressPercent = computed(() => {
  if (props.item.progress !== undefined) {
    return Math.max(0, Math.min(100, props.item.progress));
  }
  return 0;
});

const handleClick = () => {
  emit("select", props.item, props.type);
};

const handleContextMenu = (e) => {
  emit("context-menu", e, props.item, props.type);
};
</script>

<style scoped>
.clip {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0 12px;
  cursor: pointer;
  transition: all 0.3s;
  border-radius: 6px;
  border-left: 3px solid;
}

.clip-shot {
  background-color: #f1f5f9;
  border-left-color: #94a3b8;
  color: #475569;
}

.clip-video {
  background-color: #eff6ff;
  border-left-color: #3b82f6;
  color: #1e40af;
}

.clip-audio {
  background-color: #ecfdf5;
  border-left-color: #10b981;
  color: #047857;
}

.clip:hover {
  filter: brightness(0.95);
}

.clip:active {
  transform: scale(0.99);
}

.clip-selected {
  box-shadow: 0 0 0 2px #3b82f6;
  z-index: 10;
  transform: scale(1.01);
}

.clip-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  overflow: hidden;
}

.clip-label {
  font-size: 9px;
  font-weight: 900;
  text-transform: uppercase;
  opacity: 0.8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.clip-duration {
  font-size: 8px;
  font-family: ui-monospace, monospace;
  opacity: 0.5;
}

.clip-text {
  font-size: 10px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 2px;
  opacity: 0.9;
  line-height: 1;
}

.clip-generating {
  position: relative;
  overflow: hidden;
}

.clip-generating::before {
  content: "";
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.3),
    transparent
  );
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% {
    left: -100%;
  }
  100% {
    left: 100%;
  }
}

.clip-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 0 0 6px 6px;
  overflow: hidden;
}

.progress-bar {
  width: 100%;
  height: 100%;
  background-color: transparent;
  position: relative;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #60a5fa);
  transition: width 0.3s ease;
  border-radius: 0 0 6px 6px;
}

.progress-text {
  position: absolute;
  bottom: 4px;
  right: 8px;
  font-size: 7px;
  font-weight: 900;
  color: #3b82f6;
  background-color: rgba(255, 255, 255, 0.9);
  padding: 1px 4px;
  border-radius: 3px;
  z-index: 5;
}
</style>
