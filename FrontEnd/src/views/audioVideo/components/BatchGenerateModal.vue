<template>
  <div v-if="visible" class="batch-modal-overlay" @click.self="handleCancel">
    <div class="batch-modal">
      <!-- 头部 -->
      <div class="modal-header">
        <div class="header-left">
          <ThunderboltIcon :size="20" class="header-icon" />
          <h2 class="modal-title">批量任务配置</h2>
        </div>
        <button class="close-btn" @click="handleCancel">
          <IconClose :size="18" />
        </button>
      </div>

      <!-- 内容区域 -->
      <div class="modal-content">
        <!-- 选择处理范围 -->
        <div class="config-section">
          <div class="section-header">
            <IconLayers :size="16" class="section-icon" />
            <span class="section-title">选择处理范围</span>
          </div>
          <div class="radio-group">
            <label
              :class="[
                'radio-option',
                { 'radio-option-selected': config.scope === 'all' },
              ]"
              @click="config.scope = 'all'"
            >
              <div class="radio-indicator">
                <IconCheckCircle v-if="config.scope === 'all'" :size="16" />
              </div>
              <div class="radio-content">
                <div class="radio-label">全部剧幕内容</div>
                <div class="radio-desc">处理项目中所有可生成的镜头</div>
              </div>
            </label>
            <label
              :class="[
                'radio-option',
                { 'radio-option-selected': config.scope === 'selected' },
              ]"
              @click="config.scope = 'selected'"
            >
              <div class="radio-indicator">
                <IconCheckCircle
                  v-if="config.scope === 'selected'"
                  :size="16"
                />
              </div>
              <div class="radio-content">
                <div class="radio-label">仅选定场景 ({{ selectedCount }})</div>
                <div class="radio-desc">仅处理当前勾选的高亮片段</div>
              </div>
            </label>
          </div>
        </div>

        <!-- 功能提示词 -->
        <div class="config-section">
          <div class="section-header">
            <IconSettings :size="16" class="section-icon" />
            <span class="section-title">功能提示词</span>
          </div>
          <a-select
            v-model="config.featurePromptId"
            placeholder="请选择功能提示词"
            class="config-select"
            :loading="loadingPrompts"
            allow-search
          >
            <a-option
              v-for="prompt in featurePrompts"
              :key="prompt.id"
              :value="prompt.id"
              :label="prompt.name || prompt.title"
            >
              {{ prompt.name || prompt.title }}
            </a-option>
          </a-select>
        </div>

        <!-- 并发渲染数 -->
        <div class="config-section">
          <div class="section-header">
            <IconLink :size="16" class="section-icon" />
            <span class="section-title">并发渲染数</span>
          </div>
          <div class="input-with-unit">
            <a-input-number
              v-model="config.concurrency"
              :min="1"
              :max="10"
              class="config-input"
            />
            <span class="input-unit">THREADS</span>
          </div>
        </div>

        <!-- 资源存储模式 -->
        <div class="config-section">
          <div class="section-header">
            <IconFile :size="16" class="section-icon" />
            <span class="section-title">资源存储模式</span>
          </div>
          <a-select v-model="config.storageMode" class="config-select">
            <a-option value="download_upload"
              >本地中转 (Local Transfer)</a-option
            >
            <a-option value="buffer_upload">直接上传 (Direct Upload)</a-option>
          </a-select>
        </div>

        <!-- 覆盖现有视频 -->
        <div class="config-section">
          <div class="section-header">
            <span class="section-title">覆盖现有视频</span>
          </div>
          <div class="toggle-group">
            <a-switch v-model="config.allowOverwrite" />
            <span class="toggle-label">Overwrite Existing Files</span>
          </div>
        </div>

        <!-- 镜头合并模式 -->
        <div class="config-section merge-section">
          <div class="merge-header">
            <div class="merge-title-group">
              <span class="merge-title">镜头合并模式 (MERGE SHOTS)</span>
              <span class="merge-desc">将多个短镜头自动缝合为长片段生成</span>
            </div>
            <a-switch v-model="config.mergeShots" />
          </div>
          <div v-if="config.mergeShots" class="merge-options">
            <div class="merge-option">
              <span class="merge-option-label">目标最长时长</span>
              <div class="input-with-unit">
                <a-input-number
                  v-model="config.maxDuration"
                  :min="1"
                  :max="300"
                  class="config-input"
                />
                <span class="input-unit">SEC</span>
              </div>
            </div>
            <div class="merge-option">
              <span class="merge-option-label">合并容差偏移</span>
              <div class="input-with-unit">
                <a-input-number
                  v-model="config.toleranceSec"
                  :min="0"
                  :max="30"
                  class="config-input"
                />
                <span class="input-unit">SEC</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 底部按钮 -->
      <div class="modal-footer">
        <button class="cancel-btn" @click="handleCancel">取消设置</button>
        <button class="confirm-btn" @click="handleConfirm">
          <ThunderboltIcon :size="16" /> 开始生成任务
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch, onMounted, h } from "vue";
import { Message } from "@arco-design/web-vue";
import {
  IconClose,
  IconCheckCircle,
  IconLayers,
  IconSettings,
  IconLink,
  IconFile,
} from "@arco-design/web-vue/es/icon";
import { getFeaturePrompts } from "@/api/systemPrompts";

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
          style: { width: attrs.size || "20px", height: attrs.size || "20px" },
        },
        [h("polygon", { points: "13 2 3 14 12 14 11 22 21 10 12 10 13 2" })]
      );
  },
};

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  selectedCount: {
    type: Number,
    default: 0,
  },
});

const emit = defineEmits(["confirm", "cancel"]);

const loadingPrompts = ref(false);
const featurePrompts = ref([]);

const config = reactive({
  scope: "selected", // 'all' | 'selected'
  featurePromptId: "",
  concurrency: 3,
  storageMode: "download_upload",
  allowOverwrite: false,
  mergeShots: true,
  maxDuration: 12,
  toleranceSec: 5,
});

// 加载功能提示词列表
async function loadFeaturePrompts() {
  loadingPrompts.value = true;
  try {
    const response = await getFeaturePrompts("shot_video_generation");
    // 处理响应数据，可能是 { success, data } 或直接是数组
    let prompts = [];
    if (response && response.success && response.data) {
      prompts = Array.isArray(response.data) ? response.data : [];
    } else if (Array.isArray(response)) {
      prompts = response;
    } else if (response && Array.isArray(response.data)) {
      prompts = response.data;
    }

    featurePrompts.value = prompts;
    // 如果有数据，默认选择第一个
    if (featurePrompts.value.length > 0 && !config.featurePromptId) {
      config.featurePromptId = featurePrompts.value[0].id;
    }
  } catch (error) {
    console.error("加载功能提示词失败:", error);
    Message.error("加载功能提示词失败");
  } finally {
    loadingPrompts.value = false;
  }
}

// 监听弹窗显示，加载数据
watch(
  () => props.visible,
  (newVal) => {
    if (newVal) {
      loadFeaturePrompts();
      // 重置配置
      config.scope = props.selectedCount > 0 ? "selected" : "all";
      config.featurePromptId = "";
      config.concurrency = 3;
      config.storageMode = "download_upload";
      config.allowOverwrite = false;
      config.mergeShots = true;
      config.maxDuration = 12;
      config.toleranceSec = 5;
    }
  }
);

function handleConfirm() {
  if (!config.featurePromptId) {
    Message.warning("请选择功能提示词");
    return;
  }

  if (config.mergeShots && (!config.maxDuration || config.maxDuration <= 0)) {
    Message.warning("请设置目标最长时长");
    return;
  }

  emit("confirm", { ...config });
}

function handleCancel() {
  emit("cancel");
}
</script>

<style scoped>
.batch-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.batch-modal {
  background-color: #ffffff;
  border-radius: 16px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 32px;
  border-bottom: 1px solid #f1f5f9;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-icon {
  color: #9333ea;
}

.modal-title {
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
}

.close-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 8px;
  color: #64748b;
  transition: all 0.2s;
}

.close-btn:hover {
  background-color: #f1f5f9;
  color: #0f172a;
}

.modal-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px 32px;
}

.config-section {
  margin-bottom: 24px;
}

.config-section:last-child {
  margin-bottom: 0;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.section-icon {
  color: #64748b;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
}

.radio-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.radio-option {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  background-color: #ffffff;
}

.radio-option:hover {
  border-color: #cbd5e1;
}

.radio-option-selected {
  border-color: #9333ea;
  background-color: #faf5ff;
}

.radio-indicator {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid #cbd5e1;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2px;
  transition: all 0.2s;
}

.radio-option-selected .radio-indicator {
  border-color: #9333ea;
  background-color: #9333ea;
  color: #ffffff;
}

.radio-content {
  flex: 1;
}

.radio-label {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 4px;
}

.radio-desc {
  font-size: 12px;
  color: #64748b;
}

.config-select {
  width: 100%;
}

.input-with-unit {
  display: flex;
  align-items: center;
  gap: 8px;
}

.config-input {
  flex: 1;
}

.input-unit {
  font-size: 12px;
  color: #94a3b8;
  font-weight: 600;
  min-width: 60px;
}

.toggle-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.toggle-label {
  font-size: 12px;
  color: #64748b;
}

.merge-section {
  background-color: #faf5ff;
  border: 1px solid #e9d5ff;
  border-radius: 12px;
  padding: 20px;
}

.merge-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 16px;
}

.merge-title-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.merge-title {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
}

.merge-desc {
  font-size: 12px;
  color: #64748b;
}

.merge-options {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.merge-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.merge-option-label {
  font-size: 13px;
  font-weight: 500;
  color: #475569;
  min-width: 100px;
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding: 24px 32px;
  border-top: 1px solid #f1f5f9;
}

.cancel-btn {
  padding: 10px 20px;
  background-color: #f1f5f9;
  color: #64748b;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.cancel-btn:hover {
  background-color: #e2e8f0;
  color: #0f172a;
}

.confirm-btn {
  padding: 10px 20px;
  background-color: #9333ea;
  color: #ffffff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
}

.confirm-btn:hover {
  background-color: #7e22ce;
}

.confirm-btn:active {
  transform: scale(0.98);
}
</style>
