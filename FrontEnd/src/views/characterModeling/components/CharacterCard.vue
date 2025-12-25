<template>
  <div
    :class="[
      'character-card',
      { selected: isSelected, 'is-generating': character.isGenerating },
    ]"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
  >
    <!-- 多选框 -->
    <div class="checkbox-wrapper">
      <input
        type="checkbox"
        :checked="isSelected"
        @change.stop="$emit('toggle-select', character.id)"
        class="character-checkbox"
      />
    </div>

    <!-- 编辑按钮 - 悬浮显示 -->
    <div v-if="isHovered" class="edit-button">
      <button @click.stop="$emit('edit', character)" class="edit-btn">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path
            d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
          ></path>
          <path
            d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
          ></path>
        </svg>
      </button>
    </div>

    <!-- 视觉预览区 -->
    <div class="image-preview">
      <div v-if="character.isGenerating" class="generating-overlay">
        <div class="spinner-container">
          <svg
            class="spinner"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M21 12a9 9 0 11-6.219-8.56" stroke-linecap="round"></path>
          </svg>
        </div>
        <div class="generating-text">
          <p class="progress-text">{{ character.progress }}% Rendering</p>
          <p class="progress-subtitle">AI 正在绘制高精度图像...</p>
        </div>
      </div>
      <img
        v-else-if="character.imageUrl"
        :src="character.imageUrl"
        :alt="character.name"
        class="character-image"
      />
      <div v-else class="placeholder-image">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      </div>

      <!-- 进度条 -->
      <div v-if="character.isGenerating" class="progress-bar">
        <div
          class="progress-fill"
          :style="{ width: character.progress + '%' }"
        ></div>
      </div>
    </div>

    <!-- 角色信息 -->
    <div class="card-content">
      <div class="character-header">
        <div class="character-info">
          <h3 class="character-name">{{ character.name }}</h3>
          <div class="character-meta">
            <span
              :class="[
                'gender-dot',
                character.gender === 'male' ? 'male' : 'female',
              ]"
            ></span>
            <span class="meta-text">
              {{ genderText }} · {{ character.age || "未知" }}
            </span>
          </div>
        </div>
        <div
          v-if="character.progress === 100 && !character.isGenerating"
          class="completed-badge"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
      </div>

      <div class="character-details">
        <p v-if="character.description" class="description">
          {{ character.description }}
        </p>
        <div v-if="personalityTags.length > 0" class="personality-tags">
          <span
            v-for="tag in personalityTags"
            :key="tag"
            class="personality-tag"
          >
            {{ tag }}
          </span>
        </div>
      </div>

      <div class="card-footer">
        <div class="voice-info">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          <span>{{ character.voiceTone || "未设置" }}</span>
        </div>
        <button @click.stop="$emit('preview', character)" class="preview-btn">
          预览资产
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from "vue";

const props = defineProps({
  character: {
    type: Object,
    required: true,
  },
  isSelected: {
    type: Boolean,
    default: false,
  },
});

defineEmits(["toggle-select", "edit", "preview"]);

const isHovered = ref(false);

const genderText = computed(() => {
  if (props.character.gender === "male") return "男性";
  if (props.character.gender === "female") return "女性";
  return "其他";
});

const personalityTags = computed(() => {
  if (!props.character.personality) return [];
  try {
    if (typeof props.character.personality === "string") {
      return JSON.parse(props.character.personality);
    }
    return props.character.personality;
  } catch {
    return [];
  }
});
</script>

<style scoped>
.character-card {
  position: relative;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  overflow: hidden;
  transition: all 0.3s;
  cursor: pointer;
}

.character-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1),
    0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.character-card.selected {
  border-color: #6366f1;
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1);
}

.checkbox-wrapper {
  position: absolute;
  top: 16px;
  left: 16px;
  z-index: 10;
}

.character-checkbox {
  width: 20px;
  height: 20px;
  border-radius: 6px;
  border: 1px solid #cbd5e1;
  background: white;
  cursor: pointer;
  accent-color: #6366f1;
}

.edit-button {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 10;
}

.edit-btn {
  padding: 8px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(8px);
  border: 1px solid #f1f5f9;
  border-radius: 12px;
  color: #475569;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.edit-btn:hover {
  background: #6366f1;
  color: white;
  border-color: #6366f1;
}

.edit-btn svg {
  width: 14px;
  height: 14px;
}

.image-preview {
  position: relative;
  height: 224px;
  background: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-bottom: 1px solid #f1f5f9;
}

.character-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.7s;
}

.character-card:hover .character-image {
  transform: scale(1.05);
}

.placeholder-image {
  width: 80px;
  height: 80px;
  color: #94a3b8;
}

.generating-overlay {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.spinner-container {
  padding: 16px;
  background: white;
  border-radius: 50%;
  box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.06);
  border: 1px solid #e2e8f0;
}

.spinner {
  width: 32px;
  height: 32px;
  color: #6366f1;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.generating-text {
  text-align: center;
}

.progress-text {
  font-size: 12px;
  font-weight: 900;
  color: #0f172a;
  text-transform: uppercase;
  letter-spacing: -0.5px;
  margin: 0;
}

.progress-subtitle {
  font-size: 10px;
  color: #64748b;
  margin: 2px 0 0 0;
}

.progress-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 6px;
  background: #e2e8f0;
}

.progress-fill {
  height: 100%;
  background: #6366f1;
  transition: width 0.5s;
  border-radius: 0 3px 0 0;
}

.card-content {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.character-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.character-info {
  flex: 1;
}

.character-name {
  font-size: 18px;
  font-weight: 900;
  color: #0f172a;
  margin: 0 0 4px 0;
  letter-spacing: -0.5px;
}

.character-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.gender-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.gender-dot.male {
  background: #60a5fa;
}

.gender-dot.female {
  background: #f472b6;
}

.meta-text {
  font-size: 12px;
  color: #64748b;
  font-weight: 700;
}

.completed-badge {
  padding: 4px;
  background: #d1fae5;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.completed-badge svg {
  width: 14px;
  height: 14px;
  color: #10b981;
}

.character-details {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.description {
  font-size: 12px;
  color: #64748b;
  line-height: 1.5;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.personality-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.personality-tag {
  padding: 4px 10px;
  background: #eef2ff;
  color: #6366f1;
  font-size: 10px;
  font-weight: 900;
  border-radius: 6px;
  border: 1px solid #c7d2fe;
}

.card-footer {
  padding-top: 16px;
  border-top: 1px solid #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.voice-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: #94a3b8;
  font-weight: 700;
}

.voice-info svg {
  width: 12px;
  height: 12px;
  color: #cbd5e1;
}

.preview-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 900;
  color: #6366f1;
  background: none;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  padding: 0;
}

.preview-btn:hover {
  color: #4f46e5;
}

.preview-btn svg {
  width: 12px;
  height: 12px;
  transition: transform 0.2s;
}

.preview-btn:hover svg {
  transform: translateX(2px);
}
</style>
