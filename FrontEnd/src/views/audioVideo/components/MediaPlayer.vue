<template>
  <div
    class="media-player"
    ref="mediaPlayerRef"
    :style="{ height: playerHeight + 'px' }"
    @mousedown="handleMouseDown"
  >
    <!-- 左侧信息面板 -->
    <div class="player-left">
      <div v-if="selectedPreview" class="preview-info">
        <div class="preview-header">
          <div :class="['preview-icon-container', previewIconClass]">
            <component :is="previewIcon" :size="24" />
          </div>
          <div class="preview-title-group">
            <h4 class="preview-title">{{ previewTitle }}</h4>
            <div class="preview-badges">
              <span :class="['preview-badge', previewBadgeClass]">
                {{ selectedPreview.type.includes("act") ? "Master" : "Clip" }}
              </span>
              <span class="preview-duration"
                >{{ selectedPreview.duration }}s</span
              >
            </div>
          </div>
        </div>
        <div class="preview-description">
          {{ previewDescription }}
        </div>
      </div>
      <div v-else class="player-empty">
        <DesktopIcon :size="48" />
        <span>Media Monitor</span>
      </div>
    </div>

    <!-- 中间播放器 -->
    <div class="player-center">
      <div class="player-viewport">
        <div v-if="selectedPreview" class="player-content">
          <!-- 视频播放器 -->
          <video
            v-if="selectedPreview.videoUrl"
            ref="videoPlayer"
            :src="selectedPreview.videoUrl"
            class="preview-video"
            :style="videoStyle"
            @loadeddata="handleVideoLoaded"
            @error="handleVideoError"
            @canplay="handleVideoCanPlay"
            @timeupdate="handleTimeUpdate"
            @ended="handleVideoEnded"
            @play="handleVideoPlay"
            @pause="handleVideoPause"
            @wheel.prevent="handleVideoWheel"
            @dblclick.prevent="handleVideoDoubleClick"
          ></video>
          <div v-else class="play-button-overlay">
            <div class="play-button-circle">
              <PlayIcon :size="24" />
            </div>
          </div>
          <div class="preview-label">
            <div
              :class="[
                'preview-dot',
                selectedPreview.type.includes('act') ? 'dot-indigo' : 'dot-red',
              ]"
            ></div>
            {{
              selectedPreview.type.includes("act")
                ? "MASTER PREVIEW"
                : "CLIP PREVIEW"
            }}
          </div>
        </div>
        <div v-else class="player-placeholder">STORYX</div>
      </div>

      <!-- 播放控制条 -->
      <div class="player-controls" v-if="selectedPreview?.videoUrl">
        <div class="controls-left">
          <button class="control-btn" @click="handleRefresh">
            <RefreshIcon :size="18" />
          </button>
          <button class="play-btn" @click="handleTogglePlay">
            <PlayIcon v-if="!isPlaying" :size="20" />
            <PauseIcon v-else :size="20" />
          </button>
        </div>
        <div class="controls-center">
          <span class="time-display">{{ formatTime(currentTime) }}</span>
          <div class="progress-bar" @click="handleProgressClick">
            <div
              :class="[
                'progress-fill',
                selectedPreview?.type.includes('act')
                  ? 'progress-slate'
                  : 'progress-blue',
              ]"
              :style="{ width: progressPercent + '%' }"
            ></div>
            <div
              :class="[
                'progress-handle',
                selectedPreview?.type.includes('act')
                  ? 'handle-slate'
                  : 'handle-blue',
              ]"
              :style="{ left: progressPercent + '%' }"
            ></div>
          </div>
          <span class="time-display">
            {{ formatTime(duration) }}
          </span>
        </div>
        <div class="controls-right">
          <div class="volume-control">
            <button class="control-icon volume-btn" @click="toggleMute">
              <IconSound v-if="!isMuted && volume > 0" :size="18" />
              <MuteIcon v-else :size="18" />
            </button>
            <input
              type="range"
              v-model.number="volume"
              min="0"
              max="1"
              step="0.01"
              class="volume-slider"
              @input="handleVolumeChange"
            />
          </div>
          <FullscreenIcon
            :size="18"
            class="control-icon"
            @click="handleFullscreen"
          />
        </div>
      </div>
    </div>

    <!-- 右侧同步面板 -->
    <div class="player-right">
      <div class="sync-content">
        <div class="sync-header">
          <span class="sync-title">
            <ThunderboltIcon :size="12" /> Pipeline Sync
          </span>
          <div class="sync-status-dot"></div>
        </div>
        <div class="sync-logs">
          <div
            v-for="(log, index) in syncLogs"
            :key="index"
            class="sync-log-item"
          >
            <span class="log-time">{{ log.time }}</span>
            <span class="log-message">{{ log.message }}</span>
          </div>
        </div>
      </div>
      <button class="export-project-btn" @click="$emit('export')">
        <IconDownload :size="16" /> 导出项目成品
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, h, ref, watch, onMounted, onUnmounted } from "vue";
import {
  IconSound,
  IconDownload,
  IconVideoCamera,
  IconSound as IconMic,
  IconLayers,
} from "@arco-design/web-vue/es/icon";

// 桌面图标 SVG
const DesktopIcon = {
  setup(props, { attrs }) {
    return () =>
      h(
        "svg",
        {
          ...attrs,
          viewBox: "0 0 24 24",
          fill: "none",
          stroke: "currentColor",
          "stroke-width": "1.5",
          "stroke-linecap": "round",
          "stroke-linejoin": "round",
          style: { width: attrs.size || "48px", height: attrs.size || "48px" },
        },
        [
          h("rect", {
            x: "2",
            y: "3",
            width: "20",
            height: "14",
            rx: "2",
            ry: "2",
          }),
          h("line", { x1: "8", y1: "21", x2: "16", y2: "21" }),
          h("line", { x1: "12", y1: "17", x2: "12", y2: "21" }),
        ]
      );
  },
};

// 播放图标 SVG
const PlayIcon = {
  setup(props, { attrs }) {
    return () =>
      h(
        "svg",
        {
          ...attrs,
          viewBox: "0 0 24 24",
          fill: "currentColor",
          style: { width: attrs.size || "24px", height: attrs.size || "24px" },
        },
        [h("polygon", { points: "5 3 19 12 5 21 5 3" })]
      );
  },
};

// 暂停图标 SVG
const PauseIcon = {
  setup(props, { attrs }) {
    return () =>
      h(
        "svg",
        {
          ...attrs,
          viewBox: "0 0 24 24",
          fill: "currentColor",
          style: { width: attrs.size || "24px", height: attrs.size || "24px" },
        },
        [
          h("rect", { x: "6", y: "4", width: "4", height: "16" }),
          h("rect", { x: "14", y: "4", width: "4", height: "16" }),
        ]
      );
  },
};

// 刷新图标 SVG
const RefreshIcon = {
  setup(props, { attrs }) {
    return () =>
      h(
        "svg",
        {
          ...attrs,
          viewBox: "0 0 24 24",
          fill: "none",
          stroke: "currentColor",
          "stroke-width": "2",
          "stroke-linecap": "round",
          "stroke-linejoin": "round",
          style: { width: attrs.size || "18px", height: attrs.size || "18px" },
        },
        [
          h("polyline", { points: "23 4 23 10 17 10" }),
          h("polyline", { points: "1 20 1 14 7 14" }),
          h("path", {
            d: "M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15",
          }),
        ]
      );
  },
};

// 全屏图标 SVG
const FullscreenIcon = {
  setup(props, { attrs }) {
    return () =>
      h(
        "svg",
        {
          ...attrs,
          viewBox: "0 0 24 24",
          fill: "none",
          stroke: "currentColor",
          "stroke-width": "2",
          "stroke-linecap": "round",
          "stroke-linejoin": "round",
          style: { width: attrs.size || "18px", height: attrs.size || "18px" },
        },
        [
          h("path", {
            d: "M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3",
          }),
        ]
      );
  },
};

// 闪电图标 SVG
const ThunderboltIcon = {
  setup(props, { attrs }) {
    return () =>
      h(
        "svg",
        {
          ...attrs,
          viewBox: "0 0 24 24",
          fill: "none",
          stroke: "currentColor",
          "stroke-width": "2",
          "stroke-linecap": "round",
          "stroke-linejoin": "round",
          style: { width: attrs.size || "12px", height: attrs.size || "12px" },
        },
        [h("polygon", { points: "13 2 3 14 12 14 11 22 21 10 12 10 13 2" })]
      );
  },
};

const videoPlayer = ref(null);
const mediaPlayerRef = ref(null);
const isPlaying = ref(false);
const currentTime = ref(0);
const duration = ref(0);
const volume = ref(1);
const isMuted = ref(false);

// 视频缩放相关
const videoScale = ref(1);
const videoTranslateX = ref(0);
const videoTranslateY = ref(0);

// 拖动相关
const isDragging = ref(false);
const dragStartY = ref(0);
const dragStartTop = ref(0);
const playerTop = ref(0);
const hasMoved = ref(false);
const playerHeight = ref(300); // 默认高度

const props = defineProps({
  selectedPreview: {
    type: Object,
    default: null,
  },
  syncLogs: {
    type: Array,
    default: () => [],
  },
});

defineEmits(["play", "export"]);

// 进度百分比
const progressPercent = computed(() => {
  if (duration.value === 0) return 0;
  return (currentTime.value / duration.value) * 100;
});

// 视频样式
const videoStyle = computed(() => {
  return {
    transform: `translate(-50%, -50%) translate(${videoTranslateX.value}px, ${videoTranslateY.value}px) scale(${videoScale.value})`,
  };
});

// 格式化时间
function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return "00:00:00";
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hrs.toString().padStart(2, "0")}:${mins
    .toString()
    .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

// 切换播放/暂停
function handleTogglePlay() {
  if (!videoPlayer.value) return;

  if (isPlaying.value) {
    videoPlayer.value.pause();
  } else {
    videoPlayer.value.play().catch((error) => {
      console.error("播放失败:", error);
    });
  }
}

// 刷新视频
function handleRefresh() {
  if (videoPlayer.value) {
    videoPlayer.value.load();
    currentTime.value = 0;
    isPlaying.value = false;
  }
}

// 点击进度条
function handleProgressClick(e) {
  if (!videoPlayer.value || duration.value === 0) return;

  const rect = e.currentTarget.getBoundingClientRect();
  const percent = (e.clientX - rect.left) / rect.width;
  const newTime = percent * duration.value;

  videoPlayer.value.currentTime = newTime;
  currentTime.value = newTime;
}

// 全屏
function handleFullscreen() {
  if (!videoPlayer.value) return;

  const container = videoPlayer.value.parentElement?.parentElement;
  if (!container) return;

  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else {
    container.requestFullscreen();
  }
}

// 视频滚轮缩放
function handleVideoWheel(e) {
  e.preventDefault();
  const delta = e.deltaY > 0 ? -0.1 : 0.1;
  videoScale.value = Math.max(0.5, Math.min(3, videoScale.value + delta));
}

// 阻止视频双击全屏
function handleVideoDoubleClick(e) {
  e.preventDefault();
  e.stopPropagation();
}

// 拖动开始
function handleMouseDown(e) {
  // 如果点击的是控制条，不触发拖动
  if (e.target.closest(".player-controls")) {
    return;
  }
  // 如果点击的是视频元素，阻止默认行为（避免双击全屏）
  if (e.target.tagName === "VIDEO") {
    e.preventDefault();
  }
  hasMoved.value = false;
  isDragging.value = true;
  dragStartY.value = e.clientY;
  dragStartTop.value = playerHeight.value;
  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("mouseup", handleMouseUp);
  e.stopPropagation();
}

// 拖动中
function handleMouseMove(e) {
  if (!isDragging.value) return;
  const deltaY = dragStartY.value - e.clientY; // 向上拖动是正数，向下拖动是负数
  // 只有移动超过5px才认为是拖动
  if (Math.abs(deltaY) > 5) {
    hasMoved.value = true;
    e.preventDefault();
    e.stopPropagation();
  }
  // 计算新高度：向上拖动增加高度，向下拖动减少高度
  const newHeight = dragStartTop.value + deltaY;
  // 限制高度范围：最小200px，最大800px
  playerHeight.value = Math.max(200, Math.min(800, newHeight));
  if (mediaPlayerRef.value) {
    mediaPlayerRef.value.style.height = `${playerHeight.value}px`;
  }
}

// 拖动结束
function handleMouseUp(e) {
  if (isDragging.value && hasMoved.value) {
    e.preventDefault();
    e.stopPropagation();
  }
  isDragging.value = false;
  hasMoved.value = false;
  document.removeEventListener("mousemove", handleMouseMove);
  document.removeEventListener("mouseup", handleMouseUp);
}

// 初始化高度
onMounted(() => {
  if (mediaPlayerRef.value) {
    playerHeight.value = mediaPlayerRef.value.offsetHeight || 400;
  }
});

const previewIcon = computed(() => {
  if (!props.selectedPreview) return DesktopIcon;
  if (props.selectedPreview.type.includes("video")) return IconVideoCamera;
  if (props.selectedPreview.type.includes("audio")) return IconMic;
  return IconLayers;
});

const previewIconClass = computed(() => {
  if (!props.selectedPreview) return "preview-icon-default";
  if (props.selectedPreview.type.includes("act")) return "preview-icon-act";
  if (props.selectedPreview.type === "shot") return "preview-icon-default";
  if (props.selectedPreview.type === "video") return "preview-icon-video";
  return "preview-icon-audio";
});

const previewTitle = computed(() => {
  if (!props.selectedPreview) return "";
  if (props.selectedPreview.type.includes("act")) return "整幕总监视器";
  return props.selectedPreview.shotId || props.selectedPreview.label || "";
});

const previewBadgeClass = computed(() => {
  if (!props.selectedPreview) return "badge-blue";
  return props.selectedPreview.type.includes("act")
    ? "badge-slate"
    : "badge-blue";
});

const previewDescription = computed(() => {
  if (!props.selectedPreview) return "";
  if (props.selectedPreview.type.includes("act")) {
    return `正在预览整幕内容：${props.selectedPreview.label}。此模式下将连续播放所有场景的已渲染素材。`;
  }
  return `"${
    props.selectedPreview.action ||
    props.selectedPreview.text ||
    props.selectedPreview.label
  }"`;
});

// 视频加载完成，自动播放
function handleVideoLoaded() {
  if (videoPlayer.value) {
    duration.value = videoPlayer.value.duration || 0;
    if (props.selectedPreview?.autoPlay) {
      videoPlayer.value.play().catch((error) => {
        console.error("自动播放失败:", error);
      });
    }
  }
}

// 视频加载错误
function handleVideoError(e) {
  console.error("视频加载错误:", e);
  console.error("视频URL:", props.selectedPreview?.videoUrl);
  if (videoPlayer.value) {
    console.error("视频错误详情:", videoPlayer.value.error);
    console.error("错误代码:", videoPlayer.value.error?.code);
    console.error("错误消息:", videoPlayer.value.error?.message);
  }
}

// 视频可以播放
function handleVideoCanPlay() {
  if (videoPlayer.value) {
    duration.value = videoPlayer.value.duration || 0;
    // 初始化音量
    videoPlayer.value.volume = volume.value;
    videoPlayer.value.muted = isMuted.value;
    if (props.selectedPreview?.autoPlay) {
      videoPlayer.value.play().catch((error) => {
        console.error("自动播放失败:", error);
      });
    }
  }
}

// 更新时间
function handleTimeUpdate() {
  if (videoPlayer.value) {
    currentTime.value = videoPlayer.value.currentTime || 0;
  }
}

// 视频播放
function handleVideoPlay() {
  isPlaying.value = true;
}

// 视频暂停
function handleVideoPause() {
  isPlaying.value = false;
}

// 视频结束
function handleVideoEnded() {
  isPlaying.value = false;
  currentTime.value = 0;
}

// 监听 selectedPreview 变化，重置视频
watch(
  () => props.selectedPreview?.videoUrl,
  (newUrl) => {
    if (newUrl && videoPlayer.value) {
      // 重置视频
      videoPlayer.value.load();
      currentTime.value = 0;
      duration.value = 0;
      isPlaying.value = false;
    }
  }
);
</script>

<style scoped>
.media-player {
  background-color: #ffffff;
  border-top: 1px solid #e2e8f0;
  box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.05);
  display: flex;
  z-index: 50;
  backdrop-filter: blur(12px);
  cursor: move;
  user-select: none;
}

.media-player:active {
  cursor: grabbing;
  user-select: none;
}

.media-player:active {
  cursor: grabbing;
}

/* 左侧信息面板 */
.player-left {
  width: 320px;
  padding: 32px;
  border-right: 1px solid #f1f5f9;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background-color: rgba(248, 250, 252, 0.5);
}

.preview-info {
  animation: fadeIn 0.3s ease-in;
}

.preview-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.preview-icon-container {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

.preview-icon-default {
  background-color: #ffffff;
  color: #64748b;
  border-color: #e2e8f0;
}

.preview-icon-act {
  background-color: #0f172a;
  color: #ffffff;
  border-color: #0f172a;
  box-shadow: 0 0 0 2px #ffffff, 0 0 0 4px #e2e8f0;
}

.preview-icon-video {
  background-color: #2563eb;
  color: #ffffff;
  border-color: #2563eb;
}

.preview-icon-audio {
  background-color: #10b981;
  color: #ffffff;
  border-color: #10b981;
}

.preview-title-group {
  display: flex;
  flex-direction: column;
}

.preview-title {
  font-weight: 900;
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: -0.025em;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 160px;
  margin: 0;
}

.preview-badges {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}

.preview-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 9999px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.badge-blue {
  background-color: #eff6ff;
  color: #2563eb;
}

.badge-slate {
  background-color: #0f172a;
  color: #ffffff;
}

.preview-duration {
  font-size: 10px;
  font-weight: 700;
  color: #94a3b8;
}

.preview-description {
  background-color: #ffffff;
  padding: 16px;
  border-radius: 16px;
  border: 1px solid #f1f5f9;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  font-style: italic;
  font-size: 12px;
  color: #64748b;
  line-height: 1.625;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.player-empty {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  opacity: 0.3;
  color: #94a3b8;
}

.player-empty span {
  font-size: 10px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.4em;
  margin-top: 8px;
}

/* 中间播放器 */
.player-center {
  flex: 1;
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: #f8fafc;
}

.player-viewport {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  background-color: #ffffff;
  height: 400px;
  overflow: hidden;
}

.player-content {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  background-color: #ffffff;
}

.preview-video {
  width: auto;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  background-color: transparent;
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 1;
  display: block;
  transform-origin: center center;
  transition: transform 0.1s ease-out;
  transition: transform 0.1s ease-out;
}

.play-button-overlay {
  position: relative;
}

.play-button-circle {
  width: 64px;
  height: 64px;
  background-color: #ffffff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #e2e8f0;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  opacity: 0;
  transform: scale(0.9);
  transition: all 0.2s;
}

.player-content:hover .play-button-circle {
  opacity: 1;
  transform: scale(1);
}

.play-button-circle svg {
  margin-left: 2px;
}

.preview-label {
  position: absolute;
  top: 24px;
  left: 32px;
  padding: 6px 16px;
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 10px;
  font-family: ui-monospace, monospace;
  letter-spacing: 0.1em;
  color: #475569;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
  gap: 8px;
  text-transform: uppercase;
}

.preview-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.dot-indigo {
  background-color: #4f46e5;
}

.dot-red {
  background-color: #ef4444;
}

.player-placeholder {
  font-size: 12rem;
  font-weight: 900;
  color: #e2e8f0;
  letter-spacing: -0.05em;
  user-select: none;
  opacity: 0.5;
  font-style: italic;
}

/* 播放控制条 */
.player-controls {
  height: 56px;
  background-color: #ffffff;
  border-top: 1px solid #f1f5f9;
  display: flex;
  align-items: center;
  padding: 0 32px;
  gap: 32px;
  cursor: default;
  user-select: none;
}

.controls-left {
  display: flex;
  align-items: center;
  gap: 24px;
}

.control-btn {
  color: #94a3b8;
  background: none;
  border: none;
  cursor: pointer;
  transition: color 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.control-btn:hover {
  color: #0f172a;
}

.play-btn {
  width: 40px;
  height: 40px;
  background-color: #2563eb;
  color: #ffffff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3);
}

.play-btn svg {
  color: #ffffff !important;
  fill: #ffffff !important;
}

.play-btn svg {
  color: #ffffff !important;
  fill: #ffffff !important;
}

.play-btn:hover {
  transform: scale(1.05);
}

.play-btn:active {
  transform: scale(0.95);
}

.controls-center {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 24px;
}

.time-display {
  font-size: 10px;
  font-family: ui-monospace, monospace;
  color: #94a3b8;
  font-weight: 700;
}

.progress-bar {
  flex: 1;
  height: 6px;
  background-color: #e2e8f0;
  border-radius: 9999px;
  position: relative;
  cursor: pointer;
}

.progress-fill {
  position: absolute;
  height: 100%;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

.progress-slate {
  background-color: #0f172a;
}

.progress-blue {
  background-color: #2563eb;
}

.progress-handle {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 14px;
  height: 14px;
  background-color: #ffffff;
  border-radius: 50%;
  border: 2px solid;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  cursor: grab;
}

.handle-slate {
  border-color: #0f172a;
}

.handle-blue {
  border-color: #2563eb;
}

.controls-right {
  display: flex;
  align-items: center;
  gap: 24px;
  border-left: 1px solid #f1f5f9;
  padding-left: 32px;
}

.volume-control {
  display: flex;
  align-items: center;
  gap: 8px;
}

.volume-btn {
  padding: 0;
  background: none;
  border: none;
  cursor: pointer;
  color: #475569;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s;
}

.volume-btn:hover {
  color: #0f172a;
}

.volume-slider {
  width: 80px;
  height: 4px;
  background: #e2e8f0;
  border-radius: 2px;
  outline: none;
  -webkit-appearance: none;
  appearance: none;
  cursor: pointer;
}

.volume-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 12px;
  height: 12px;
  background: #2563eb;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  transition: background 0.2s;
}

.volume-slider::-webkit-slider-thumb:hover {
  background: #1d4ed8;
}

.volume-slider::-moz-range-thumb {
  width: 12px;
  height: 12px;
  background: #2563eb;
  border-radius: 50%;
  cursor: pointer;
  border: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  transition: background 0.2s;
}

.volume-slider::-moz-range-thumb:hover {
  background: #1d4ed8;
}

.control-icon {
  color: #94a3b8;
  cursor: pointer;
  transition: color 0.2s;
}

.control-icon:hover {
  color: #0f172a;
}

/* 右侧同步面板 */
.player-right {
  width: 320px;
  padding: 32px;
  border-left: 1px solid #f1f5f9;
  background-color: #ffffff;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.sync-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.sync-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #f8fafc;
  padding-bottom: 8px;
}

.sync-title {
  font-size: 10px;
  font-weight: 900;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  display: flex;
  align-items: center;
  gap: 8px;
}

.sync-title svg {
  color: #2563eb;
}

.sync-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #10b981;
  box-shadow: 0 0 8px rgba(16, 185, 129, 0.3);
}

.sync-logs {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: 96px;
  overflow-y: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.sync-logs::-webkit-scrollbar {
  display: none;
}

.sync-log-item {
  font-size: 10px;
  font-weight: 700;
  color: #64748b;
  display: flex;
  gap: 12px;
  font-style: italic;
}

.log-time {
  color: #2563eb;
  font-family: ui-monospace, monospace;
}

.log-message {
  flex: 1;
}

.export-project-btn {
  width: 100%;
  padding: 16px 0;
  background-color: #eff6ff;
  border: 1px solid #dbeafe;
  color: #2563eb;
  border-radius: 16px;
  font-size: 11px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.export-project-btn:hover {
  background-color: #2563eb;
  color: #ffffff;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateX(-16px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
</style>
