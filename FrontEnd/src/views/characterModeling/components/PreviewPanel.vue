<template>
  <div v-if="character" class="preview-panel">
    <div class="preview-header">
      <div class="header-left">
        <div class="header-icon-wrapper">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
          </svg>
        </div>
        <span class="header-title">
          素材预览: <span class="character-name">{{ character.name }}</span>
        </span>
      </div>
      <div class="header-tabs">
        <button
          :class="['tab-button', { active: activeTab === 'images' }]"
          @click="activeTab = 'images'"
        >
          图片矩阵
        </button>
        <button
          :class="['tab-button', { active: activeTab === 'model' }]"
          @click="activeTab = 'model'"
        >
          三维动态预览
        </button>
      </div>
      <button @click="$emit('close')" class="close-button">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>

    <div class="preview-content">
      <div v-if="activeTab === 'images'" class="images-grid">
        <div
          v-for="(image, index) in previewImages"
          :key="index"
          class="preview-item"
          @mouseenter="hoveredIndex = index"
          @mouseleave="hoveredIndex = null"
        >
          <img
            :src="image"
            :alt="`${character.name} - Angle ${index + 1}`"
            class="preview-image"
            :class="{ grayscale: hoveredIndex !== index }"
          />
          <div v-if="hoveredIndex === index" class="hover-overlay">
            <button class="play-button">
              <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
            </button>
          </div>
          <div class="item-label">Angle {{ index + 1 }}</div>
        </div>
      </div>

      <div v-else class="model-preview">
        <div v-if="previewVideos.length === 0" class="model-placeholder">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"
            ></path>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
            <line x1="12" y1="22.08" x2="12" y2="12"></line>
          </svg>
          <p>暂无视频预览</p>
        </div>
        <div v-else class="video-container">
          <div class="video-wrapper">
            <video
              ref="videoPlayer"
              :src="currentVideoUrl"
              class="preview-video"
              @loadeddata="handleVideoLoaded"
              @timeupdate="handleTimeUpdate"
              @ended="handleVideoEnded"
            ></video>
            <div v-if="loadingVideos" class="video-loading">
              <a-spin size="large" />
            </div>

            <!-- 自定义播放控制条 -->
            <div class="custom-controls" @click.stop>
              <!-- 播放/暂停按钮 -->
              <button class="control-btn play-pause-btn" @click="togglePlay">
                <svg v-if="isPlaying" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16"></rect>
                  <rect x="14" y="4" width="4" height="16"></rect>
                </svg>
                <svg v-else viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
              </button>

              <!-- 时间显示 -->
              <span class="time-display"
                >{{ formatTime(currentTime) }} /
                {{ formatTime(duration) }}</span
              >

              <!-- 进度条 -->
              <div class="progress-container" @click="handleProgressClick">
                <div class="progress-bar">
                  <div
                    class="progress-fill"
                    :style="{ width: progressPercent + '%' }"
                  ></div>
                  <div
                    class="progress-handle"
                    :style="{ left: progressPercent + '%' }"
                  ></div>
                </div>
              </div>

              <!-- 音量控制 -->
              <div class="volume-control">
                <button class="control-btn volume-btn" @click="toggleMute">
                  <svg
                    v-if="isMuted || volume === 0"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <polygon
                      points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"
                    ></polygon>
                    <line x1="23" y1="9" x2="17" y2="15"></line>
                    <line x1="17" y1="9" x2="23" y2="15"></line>
                  </svg>
                  <svg
                    v-else-if="volume < 0.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <polygon
                      points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"
                    ></polygon>
                    <path
                      d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"
                    ></path>
                  </svg>
                  <svg
                    v-else
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <polygon
                      points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"
                    ></polygon>
                    <path
                      d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07M11.5 2.5a15 15 0 0 1 0 19"
                    ></path>
                  </svg>
                </button>
                <div class="volume-slider-container" @click.stop>
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
              </div>

              <!-- 全屏按钮 -->
              <button
                class="control-btn fullscreen-btn"
                @click="toggleFullscreen"
              >
                <svg
                  v-if="!isFullscreen"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path
                    d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"
                  ></path>
                </svg>
                <svg
                  v-else
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path
                    d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"
                  ></path>
                </svg>
              </button>
            </div>
          </div>
          <div v-if="previewVideos.length > 1" class="video-list">
            <div
              v-for="(video, index) in previewVideos"
              :key="video.id || index"
              :class="[
                'video-thumbnail',
                { active: currentVideoIndex === index },
              ]"
              @click="switchVideo(index)"
            >
              <video
                :src="video.videoUrl"
                class="thumbnail-video"
                muted
                preload="metadata"
              ></video>
              <div class="thumbnail-overlay">
                <svg
                  v-if="currentVideoIndex !== index"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  class="play-icon"
                >
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
                <div v-else class="playing-indicator">
                  <div class="playing-dot"></div>
                  <div class="playing-dot"></div>
                  <div class="playing-dot"></div>
                </div>
              </div>
              <div class="video-index">{{ index + 1 }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import { getCharacterDrawResults } from "@/api/character";

const props = defineProps({
  character: {
    type: Object,
    default: null,
  },
});

defineEmits(["close"]);

const activeTab = ref("images");
const hoveredIndex = ref(null);
const previewVideos = ref([]);
const currentVideoIndex = ref(0);
const videoPlayer = ref(null);
const loadingVideos = ref(false);
const isPlaying = ref(false);
const isMuted = ref(false);
const volume = ref(1);
const currentTime = ref(0);
const duration = ref(0);
const isFullscreen = ref(false);

// 当前播放的视频 URL
const currentVideoUrl = computed(() => {
  if (previewVideos.value.length === 0) return "";
  return previewVideos.value[currentVideoIndex.value]?.videoUrl || "";
});

// 进度百分比
const progressPercent = computed(() => {
  if (duration.value === 0) return 0;
  return (currentTime.value / duration.value) * 100;
});

// 生成预览图片列表（如果没有多个图片，则使用同一张图片）
const previewImages = computed(() => {
  if (!props.character?.imageUrl) {
    return [];
  }

  // 如果有 videoUrl，可以在这里处理视频帧
  // 目前先用同一张图片模拟多个角度
  return Array.from({ length: 3 }, () => props.character.imageUrl);
});

// 加载角色的视频列表
async function loadVideos() {
  if (!props.character?.id) {
    previewVideos.value = [];
    return;
  }

  loadingVideos.value = true;
  try {
    const response = await getCharacterDrawResults(props.character.id, "video");
    let videos = [];

    // 处理不同的响应格式
    if (response && response.success && response.data) {
      videos = Array.isArray(response.data) ? response.data : [];
    } else if (Array.isArray(response)) {
      videos = response;
    } else if (response && Array.isArray(response.data)) {
      videos = response.data;
    }

    // 提取视频 URL，支持 result.finalUrl 或 result.originalUrl 或直接的 videoUrl
    previewVideos.value = videos
      .map((item) => {
        // 如果 item 有 result 对象，使用 result.finalUrl 或 result.originalUrl
        if (item.result) {
          return {
            ...item,
            videoUrl: item.result.finalUrl || item.result.originalUrl,
          };
        }
        // 否则使用直接的 videoUrl
        return item;
      })
      .filter((v) => v.videoUrl); // 只保留有 videoUrl 的视频

    currentVideoIndex.value = 0;
  } catch (error) {
    console.error("加载视频列表失败:", error);
    previewVideos.value = [];
  } finally {
    loadingVideos.value = false;
  }
}

// 切换视频
function switchVideo(index) {
  if (index === currentVideoIndex.value) return;
  currentVideoIndex.value = index;
  isPlaying.value = false;
  currentTime.value = 0;
  duration.value = 0;
  // 视频 URL 变化后会自动加载，在 loadeddata 事件中播放
}

// 视频加载完成，立即播放
function handleVideoLoaded() {
  if (videoPlayer.value) {
    duration.value = videoPlayer.value.duration || 0;
    videoPlayer.value
      .play()
      .then(() => {
        isPlaying.value = true;
      })
      .catch((error) => {
        console.error("自动播放失败:", error);
      });
  }
}

// 切换播放/暂停
function togglePlay() {
  if (!videoPlayer.value) return;

  if (isPlaying.value) {
    videoPlayer.value.pause();
    isPlaying.value = false;
  } else {
    videoPlayer.value
      .play()
      .then(() => {
        isPlaying.value = true;
      })
      .catch((error) => {
        console.error("播放失败:", error);
      });
  }
}

// 更新时间
function handleTimeUpdate() {
  if (videoPlayer.value) {
    currentTime.value = videoPlayer.value.currentTime || 0;
  }
}

// 视频结束
function handleVideoEnded() {
  isPlaying.value = false;
  currentTime.value = 0;
}

// 格式化时间
function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
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

// 切换静音
function toggleMute() {
  if (!videoPlayer.value) return;
  isMuted.value = !isMuted.value;
  videoPlayer.value.muted = isMuted.value;
}

// 音量变化
function handleVolumeChange() {
  if (!videoPlayer.value) return;
  videoPlayer.value.volume = volume.value;
  if (volume.value === 0) {
    isMuted.value = true;
    videoPlayer.value.muted = true;
  } else if (isMuted.value && volume.value > 0) {
    isMuted.value = false;
    videoPlayer.value.muted = false;
  }
}

// 切换全屏
function toggleFullscreen() {
  if (!videoPlayer.value) return;

  const wrapper = videoPlayer.value.parentElement;

  if (!isFullscreen.value) {
    if (wrapper.requestFullscreen) {
      wrapper.requestFullscreen();
    } else if (wrapper.webkitRequestFullscreen) {
      wrapper.webkitRequestFullscreen();
    } else if (wrapper.mozRequestFullScreen) {
      wrapper.mozRequestFullScreen();
    } else if (wrapper.msRequestFullscreen) {
      wrapper.msRequestFullscreen();
    }
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    } else if (document.mozCancelFullScreen) {
      document.mozCancelFullScreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    }
  }
}

// 监听全屏状态变化
function handleFullscreenChange() {
  isFullscreen.value = !!(
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement
  );
}

onMounted(() => {
  document.addEventListener("fullscreenchange", handleFullscreenChange);
  document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
  document.addEventListener("mozfullscreenchange", handleFullscreenChange);
  document.addEventListener("msfullscreenchange", handleFullscreenChange);
});

onUnmounted(() => {
  document.removeEventListener("fullscreenchange", handleFullscreenChange);
  document.removeEventListener(
    "webkitfullscreenchange",
    handleFullscreenChange
  );
  document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
  document.removeEventListener("msfullscreenchange", handleFullscreenChange);
});

// 监听角色变化，加载视频
watch(
  () => props.character?.id,
  (newId) => {
    if (newId && activeTab.value === "model") {
      loadVideos();
    }
  },
  { immediate: true }
);

// 监听标签页切换
watch(
  () => activeTab.value,
  (newTab) => {
    if (newTab === "model" && props.character?.id) {
      loadVideos();
    }
  }
);
</script>

<style scoped>
.preview-panel {
  height: 288px;
  background: white;
  border-top: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  box-shadow: 0 -4px 6px -1px rgba(0, 0, 0, 0.1);
  z-index: 30;
  animation: slideIn 0.5s;
}

@keyframes slideIn {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 32px;
  background: rgba(248, 250, 252, 0.5);
  border-bottom: 1px solid #e2e8f0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 24px;
}

.header-icon-wrapper {
  padding: 6px;
  background: #eef2ff;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.header-icon-wrapper svg {
  width: 16px;
  height: 16px;
  color: #6366f1;
}

.header-title {
  font-size: 14px;
  font-weight: 900;
  color: #0f172a;
  letter-spacing: -0.5px;
}

.character-name {
  color: #6366f1;
}

.header-tabs {
  display: flex;
  background: rgba(203, 213, 225, 0.5);
  padding: 4px;
  border-radius: 8px;
  border: 1px solid rgba(226, 232, 240, 0.5);
}

.tab-button {
  padding: 6px 16px;
  font-size: 11px;
  font-weight: 900;
  color: #64748b;
  background: none;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-button:hover {
  color: #475569;
}

.tab-button.active {
  background: white;
  color: #6366f1;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  border: 1px solid #e2e8f0;
}

.close-button {
  padding: 8px;
  color: #64748b;
  background: none;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-button:hover {
  background: #e2e8f0;
}

.close-button svg {
  width: 20px;
  height: 20px;
}

.preview-content {
  flex: 1;
  padding: 24px;
  overflow-x: auto;
  overflow-y: hidden;
}

.images-grid {
  display: flex;
  gap: 24px;
  height: 100%;
}

.preview-item {
  position: relative;
  flex-shrink: 0;
  width: 224px;
  height: 100%;
  background: #f1f5f9;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  border: 1px solid #e2e8f0;
  cursor: pointer;
}

.preview-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: filter 0.5s;
}

.preview-image.grayscale {
  filter: grayscale(100%);
}

.hover-overlay {
  position: absolute;
  inset: 0;
  background: rgba(99, 102, 241, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s;
}

.preview-item:hover .hover-overlay {
  opacity: 1;
}

.play-button {
  padding: 12px;
  background: white;
  color: #6366f1;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  transform: scale(0.75);
  transition: transform 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-item:hover .play-button {
  transform: scale(1);
}

.play-button svg {
  width: 20px;
  height: 20px;
}

.item-label {
  position: absolute;
  top: 8px;
  left: 8px;
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(4px);
  border-radius: 8px;
  font-size: 10px;
  font-weight: 900;
  color: #0f172a;
  border: 1px solid #f1f5f9;
}

.model-preview {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  padding: 0;
}

.model-placeholder {
  text-align: center;
  color: #94a3b8;
}

.model-placeholder svg {
  width: 64px;
  height: 64px;
  margin-bottom: 16px;
  color: #cbd5e1;
}

.model-placeholder p {
  font-size: 14px;
  font-weight: 700;
  margin: 0;
}

.video-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 20px;
  align-items: center;
  justify-content: center;
}

.video-wrapper {
  position: relative;
  width: 100%;
  max-width: 800px;
  aspect-ratio: 16 / 9;
  background-color: #ffffff;
  border-radius: 16px;
  overflow: hidden;
  /* box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15); */
  /* border: 1px solid #e2e8f0; */
}

.preview-video {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
  background-color: #ffffff;
}

.video-loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 10;
}

.video-list {
  display: flex;
  gap: 16px;
  justify-content: center;
  align-items: center;
  padding: 0 24px;
  overflow-x: auto;
  overflow-y: hidden;
  width: 100%;
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 transparent;
}

.video-list::-webkit-scrollbar {
  height: 4px;
}

.video-list::-webkit-scrollbar-track {
  background: transparent;
}

.video-list::-webkit-scrollbar-thumb {
  background-color: #cbd5e1;
  border-radius: 2px;
}

.video-list::-webkit-scrollbar-thumb:hover {
  background-color: #94a3b8;
}

.video-thumbnail {
  position: relative;
  width: 120px;
  height: 68px;
  flex-shrink: 0;
  background-color: #1e293b;
  border-radius: 10px;
  border: 3px solid #e2e8f0;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.video-thumbnail:hover {
  border-color: #6366f1;
  transform: translateY(-4px) scale(1.05);
  box-shadow: 0 8px 24px rgba(99, 102, 241, 0.3);
}

.video-thumbnail.active {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2),
    0 8px 24px rgba(99, 102, 241, 0.3);
  transform: translateY(-4px);
}

.thumbnail-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
}

.thumbnail-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(
    to bottom,
    rgba(0, 0, 0, 0.4) 0%,
    rgba(0, 0, 0, 0.2) 50%,
    rgba(0, 0, 0, 0.4) 100%
  );
  color: #ffffff;
  opacity: 0;
  transition: opacity 0.3s;
  z-index: 2;
}

.video-thumbnail:hover .thumbnail-overlay {
  opacity: 1;
}

.video-thumbnail.active .thumbnail-overlay {
  opacity: 0;
}

.play-icon {
  width: 32px;
  height: 32px;
  filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.3));
}

.playing-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
}

.playing-dot {
  width: 6px;
  height: 6px;
  background-color: #ffffff;
  border-radius: 50%;
  animation: playingPulse 1.4s ease-in-out infinite;
}

.playing-dot:nth-child(2) {
  animation-delay: 0.2s;
}

.playing-dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes playingPulse {
  0%,
  100% {
    opacity: 0.4;
    transform: scale(0.8);
  }
  50% {
    opacity: 1;
    transform: scale(1.2);
  }
}

.video-index {
  position: absolute;
  top: 6px;
  left: 6px;
  padding: 4px 8px;
  background: linear-gradient(
    135deg,
    rgba(99, 102, 241, 0.9),
    rgba(139, 92, 246, 0.9)
  );
  color: #ffffff;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.5px;
  z-index: 3;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(4px);
}

.video-thumbnail.active .video-index {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  box-shadow: 0 2px 12px rgba(99, 102, 241, 0.4);
}

/* 自定义播放控制条 */
.custom-controls {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(
    to top,
    rgba(0, 0, 0, 0.8),
    rgba(0, 0, 0, 0.4),
    transparent
  );
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  z-index: 10;
  opacity: 0;
  transition: opacity 0.3s;
}

.video-wrapper:hover .custom-controls {
  opacity: 1;
}

.control-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 8px;
  color: #ffffff;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.control-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.1);
}

.control-btn svg {
  width: 20px;
  height: 20px;
}

.play-pause-btn {
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.25);
}

.play-pause-btn:hover {
  background: rgba(255, 255, 255, 0.35);
}

.time-display {
  font-size: 12px;
  font-weight: 600;
  color: #ffffff;
  font-family: ui-monospace, monospace;
  min-width: 80px;
  text-align: center;
}

.progress-container {
  flex: 1;
  height: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
}

.progress-bar {
  width: 100%;
  height: 4px;
  background-color: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
  position: relative;
  overflow: visible;
}

.progress-fill {
  height: 100%;
  background-color: #ffffff;
  border-radius: 2px;
  transition: width 0.1s linear;
}

.progress-handle {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 12px;
  height: 12px;
  background-color: #ffffff;
  border-radius: 50%;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  opacity: 0;
  transition: opacity 0.2s;
}

.progress-container:hover .progress-handle {
  opacity: 1;
}

.progress-container:hover .progress-bar {
  height: 6px;
}

.volume-control {
  display: flex;
  align-items: center;
  gap: 8px;
}

.volume-btn {
  width: 32px;
  height: 32px;
}

.volume-slider-container {
  width: 80px;
  display: flex;
  align-items: center;
}

.volume-slider {
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.3);
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
  background: #ffffff;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.volume-slider::-moz-range-thumb {
  width: 12px;
  height: 12px;
  background: #ffffff;
  border-radius: 50%;
  cursor: pointer;
  border: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.fullscreen-btn {
  width: 32px;
  height: 32px;
}
</style>
