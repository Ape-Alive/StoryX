<template>
  <div v-if="visible" class="batch-modal-overlay" @click.self="handleCancel">
    <div class="batch-modal">
      <!-- 头部 -->
      <div class="modal-header">
        <div class="header-left">
          <GachaIcon :size="20" class="header-icon" />
          <h2 class="modal-title">批量 AI 抽卡配置</h2>
        </div>
        <button class="close-btn" @click="handleCancel">
          <IconClose :size="18" />
        </button>
      </div>

      <!-- 内容区域 -->
      <div class="modal-content">
        <!-- 选择抽卡类型 -->
        <div class="config-section">
          <div class="section-header">
            <IconVideoCamera :size="16" class="section-icon" />
            <span class="section-title">抽卡类型</span>
          </div>
          <div class="radio-group">
            <label
              :class="[
                'radio-option',
                { 'radio-option-selected': config.drawType === 'image' },
              ]"
              @click="config.drawType = 'image'"
            >
              <div class="radio-indicator">
                <IconCheckCircle
                  v-if="config.drawType === 'image'"
                  :size="16"
                />
              </div>
              <div class="radio-content">
                <div class="radio-label">图片 (Image)</div>
                <div class="radio-desc">生成角色图片</div>
              </div>
            </label>
            <label
              :class="[
                'radio-option',
                { 'radio-option-selected': config.drawType === 'video' },
              ]"
              @click="config.drawType = 'video'"
            >
              <div class="radio-indicator">
                <IconCheckCircle
                  v-if="config.drawType === 'video'"
                  :size="16"
                />
              </div>
              <div class="radio-content">
                <div class="radio-label">视频 (Video)</div>
                <div class="radio-desc">生成角色视频（2秒）</div>
              </div>
            </label>
          </div>
        </div>

        <!-- 功能提示词 -->
        <div class="config-section">
          <div class="section-header">
            <IconSettings :size="16" class="section-icon" />
            <span class="section-title">
              功能提示词
              <span class="form-required">*</span>
            </span>
          </div>
          <a-select
            v-model="config.featurePromptId"
            placeholder="请选择功能提示词"
            class="config-select"
            :class="{ 'form-input-error': formErrors.featurePromptId }"
            :loading="loadingPrompts"
            allow-search
            allow-clear
            @change="clearFormError('featurePromptId')"
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
          <div v-if="formErrors.featurePromptId" class="field-error">
            {{ formErrors.featurePromptId }}
          </div>
        </div>

        <!-- 题材风格 -->
        <div class="config-section">
          <div class="section-header">
            <BrushIcon :size="16" class="section-icon" />
            <span class="section-title">
              题材风格
              <span class="form-required">*</span>
            </span>
          </div>
          <a-input
            v-model="config.genreStyle"
            placeholder="如：古风、现代、科幻等"
            class="config-input"
            :class="{ 'form-input-error': formErrors.genreStyle }"
            allow-clear
            @blur="validateFormField('genreStyle')"
            @input="clearFormError('genreStyle')"
          />
          <div v-if="formErrors.genreStyle" class="field-error">
            {{ formErrors.genreStyle }}
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

        <!-- 自定义 API 配置 -->
        <div class="config-section">
          <div class="section-header">
            <CodeIcon :size="16" class="section-icon" />
            <span class="section-title">
              自定义 API 配置
              <span class="form-required">*</span>
            </span>
          </div>
          <div v-if="loadingApiConfig" class="api-config-loading">
            <a-spin size="small" />
            <span class="loading-text">正在加载配置...</span>
          </div>
          <div v-else-if="apiConfigError" class="api-config-error">
            <span class="error-text">{{ apiConfigError }}</span>
          </div>
          <div
            v-else-if="apiConfigFields.length === 0"
            class="api-config-empty"
          >
            <span class="empty-text">暂无可用配置项</span>
          </div>
          <div v-else class="api-config-fields">
            <div
              v-for="field in apiConfigFields"
              :key="field.key"
              class="api-config-field"
            >
              <label class="field-label">
                {{ field.label }}
                <span v-if="field.required" class="form-required">*</span>
              </label>
              <!-- 数组类型：下拉选择 -->
              <a-select
                v-if="field.isArray"
                v-model="apiConfigValues[field.key]"
                :placeholder="`请选择${field.label}`"
                class="config-select"
                :class="{
                  'form-input-error': apiConfigErrors[field.key],
                }"
                allow-clear
                @change="clearApiConfigError(field.key)"
              >
                <a-option
                  v-for="option in field.options"
                  :key="option"
                  :value="option"
                >
                  {{ option }}
                </a-option>
              </a-select>
              <!-- 非数组类型：输入框 -->
              <a-input
                v-else
                v-model="apiConfigValues[field.key]"
                :placeholder="`请输入${field.label}`"
                class="config-input"
                :class="{
                  'form-input-error': apiConfigErrors[field.key],
                }"
                allow-clear
                @blur="validateApiConfigField(field.key)"
                @input="clearApiConfigError(field.key)"
              />
              <div v-if="apiConfigErrors[field.key]" class="field-error">
                {{ apiConfigErrors[field.key] }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 底部按钮 -->
      <div class="modal-footer">
        <button class="cancel-btn" @click="handleCancel">取消设置</button>
        <button class="confirm-btn" @click="handleConfirm">
          <GachaIcon :size="16" /> 开始抽卡任务
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch, h } from "vue";
import { Message } from "@arco-design/web-vue";
import {
  IconClose,
  IconCheckCircle,
  IconSettings,
  IconFile,
  IconVideoCamera,
} from "@arco-design/web-vue/es/icon";
import { getFeaturePrompts } from "@/api/systemPrompts";
import { getProjectModelApiConfig } from "@/api/project";

// 代码图标 SVG
const CodeIcon = {
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
          style: { width: attrs.size || "16px", height: attrs.size || "16px" },
        },
        [
          h("polyline", { points: "16 18 22 12 16 6" }),
          h("polyline", { points: "8 6 2 12 8 18" }),
        ]
      );
  },
};

// 画笔/调色板图标 SVG
const BrushIcon = {
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
          style: { width: attrs.size || "16px", height: attrs.size || "16px" },
        },
        [
          h("circle", { cx: "13.5", cy: "6.5", r: ".5", fill: "currentColor" }),
          h("circle", {
            cx: "17.5",
            cy: "10.5",
            r: ".5",
            fill: "currentColor",
          }),
          h("circle", { cx: "8.5", cy: "7.5", r: ".5", fill: "currentColor" }),
          h("circle", { cx: "6.5", cy: "12.5", r: ".5", fill: "currentColor" }),
          h("path", {
            d: "M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z",
          }),
        ]
      );
  },
};

// 抽卡图标 SVG
const GachaIcon = {
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
        [
          h("path", { d: "M12 2L2 7l10 5 10-5-10-5z", fill: "currentColor" }),
          h("path", {
            d: "M2 17l10 5 10-5M2 12l10 5 10-5",
            "stroke-linecap": "round",
            "stroke-linejoin": "round",
          }),
        ]
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
  projectId: {
    type: String,
    required: true,
  },
});

const emit = defineEmits(["confirm", "cancel"]);

const loadingPrompts = ref(false);
const featurePrompts = ref([]);
const loadingApiConfig = ref(false);
const apiConfigError = ref("");
const apiConfigFields = ref([]);
const apiConfigValues = reactive({});
const apiConfigErrors = reactive({});
const formErrors = reactive({
  featurePromptId: "",
  genreStyle: "",
});

const config = reactive({
  drawType: "image", // 'image' | 'video'
  featurePromptId: "",
  genreStyle: "",
  storageMode: "download_upload",
  apiConfig: null,
});

// 加载功能提示词列表
async function loadFeaturePrompts() {
  loadingPrompts.value = true;
  try {
    // 根据抽卡类型选择不同的 functionKey
    const functionKey =
      config.drawType === "video"
        ? "character_video_generation"
        : "character_image_generation";
    const response = await getFeaturePrompts(functionKey);
    // 处理响应数据
    let prompts = [];
    if (response && response.success && response.data) {
      prompts = Array.isArray(response.data) ? response.data : [];
    } else if (Array.isArray(response)) {
      prompts = response;
    } else if (response && Array.isArray(response.data)) {
      prompts = response.data;
    }

    featurePrompts.value = prompts;
  } catch (error) {
    console.error("加载功能提示词失败:", error);
    // 不显示错误，因为这是可选项
  } finally {
    loadingPrompts.value = false;
  }
}

// 加载 API 配置
async function loadApiConfig() {
  if (!props.projectId) {
    apiConfigError.value = "项目ID不存在";
    return;
  }

  loadingApiConfig.value = true;
  apiConfigError.value = "";
  apiConfigFields.value = [];
  Object.keys(apiConfigValues).forEach((key) => {
    delete apiConfigValues[key];
  });
  Object.keys(apiConfigErrors).forEach((key) => {
    delete apiConfigErrors[key];
  });

  try {
    // 根据抽卡类型确定模型类型
    const modelType = config.drawType === "video" ? "video" : "image";
    const response = await getProjectModelApiConfig(props.projectId, modelType);

    if (
      response &&
      response.success &&
      response.data &&
      response.data.apiConfig
    ) {
      const apiConfig = response.data.apiConfig;

      // 将配置转换为表单字段
      const fields = [];
      for (const [key, value] of Object.entries(apiConfig)) {
        const isArray = Array.isArray(value);
        fields.push({
          key,
          label: formatFieldLabel(key),
          isArray,
          options: isArray ? value : [],
          required: true, // 所有字段都是必填的
        });

        // 初始化字段值
        if (isArray) {
          apiConfigValues[key] = value[0] || ""; // 默认选择第一个选项
        } else {
          // 将值转换为字符串以便在输入框中显示
          apiConfigValues[key] = value != null ? String(value) : "";
        }
      }

      apiConfigFields.value = fields;
    } else {
      apiConfigError.value = "未找到可用的 API 配置";
    }
  } catch (error) {
    console.error("加载 API 配置失败:", error);
    apiConfigError.value = error.message || "加载 API 配置失败";
  } finally {
    loadingApiConfig.value = false;
  }
}

// 格式化字段标签
function formatFieldLabel(key) {
  const labelMap = {
    aspectRatio: "宽高比",
    duration: "时长",
    remixTargetId: "混音目标ID",
    size: "尺寸",
    prompt: "提示词",
    width: "宽度",
    height: "高度",
  };
  return labelMap[key] || key;
}

// 清除字段错误
function clearApiConfigError(key) {
  if (apiConfigErrors[key]) {
    delete apiConfigErrors[key];
  }
}

// 验证单个字段
function validateApiConfigField(key) {
  const value = apiConfigValues[key];
  if (!value && value !== 0 && value !== false) {
    apiConfigErrors[key] = "此字段为必填项";
    return false;
  }
  clearApiConfigError(key);
  return true;
}

// 验证所有 API 配置字段
function validateApiConfig() {
  let isValid = true;
  apiConfigFields.value.forEach((field) => {
    if (field.required && !validateApiConfigField(field.key)) {
      isValid = false;
    }
  });
  return isValid;
}

// 清除表单字段错误
function clearFormError(field) {
  if (formErrors[field]) {
    formErrors[field] = "";
  }
}

// 验证表单字段
function validateFormField(field) {
  let isValid = true;
  const value = config[field];

  if (field === "featurePromptId") {
    if (!value || (typeof value === "string" && value.trim() === "")) {
      formErrors.featurePromptId = "请选择功能提示词";
      isValid = false;
    } else {
      clearFormError("featurePromptId");
    }
  } else if (field === "genreStyle") {
    if (!value || (typeof value === "string" && value.trim() === "")) {
      formErrors.genreStyle = "请输入题材风格";
      isValid = false;
    } else {
      clearFormError("genreStyle");
    }
  }

  return isValid;
}

// 验证所有表单字段
function validateForm() {
  let isValid = true;
  if (!validateFormField("featurePromptId")) {
    isValid = false;
  }
  if (!validateFormField("genreStyle")) {
    isValid = false;
  }
  return isValid;
}

// 监听弹窗显示，加载数据
watch(
  () => props.visible,
  (newVal) => {
    if (newVal) {
      loadFeaturePrompts();
      // 重置配置
      config.drawType = "image";
      config.featurePromptId = "";
      config.genreStyle = "";
      config.storageMode = "download_upload";
      config.apiConfig = null;
      // 清除错误状态
      formErrors.featurePromptId = "";
      formErrors.genreStyle = "";
      // 加载 API 配置
      loadApiConfig();
    }
  }
);

// 监听抽卡类型变化，重新加载提示词和 API 配置
watch(
  () => config.drawType,
  () => {
    if (props.visible) {
      loadFeaturePrompts();
      config.featurePromptId = "";
      // 重新加载 API 配置（因为不同类型对应不同的模型）
      loadApiConfig();
    }
  }
);

function handleConfirm() {
  if (props.selectedCount === 0) {
    Message.warning("请先选择要抽卡的角色");
    return;
  }

  // 验证表单字段
  if (!validateForm()) {
    Message.warning("请完善必填项");
    return;
  }

  // 验证 API 配置
  if (!validateApiConfig()) {
    Message.warning("请完善自定义 API 配置");
    return;
  }

  // 构建 API 配置对象
  const apiConfig = {};
  apiConfigFields.value.forEach((field) => {
    const value = apiConfigValues[field.key];
    if (value !== undefined && value !== null && value !== "") {
      // 如果是数字字符串，尝试转换为数字
      if (
        !field.isArray &&
        typeof value === "string" &&
        !isNaN(value) &&
        value.trim() !== ""
      ) {
        apiConfig[field.key] = Number(value);
      } else {
        apiConfig[field.key] = value;
      }
    }
  });

  // 构建请求数据
  const requestData = {
    drawType: config.drawType,
    storageMode: config.storageMode,
    featurePromptId: config.featurePromptId,
    genreStyle: config.genreStyle,
    apiConfig: apiConfig,
  };

  emit("confirm", requestData);
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
  color: #10b981;
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
  border-color: #10b981;
  background-color: #ecfdf5;
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
  border-color: #10b981;
  background-color: #10b981;
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

.config-input {
  width: 100%;
}

.config-textarea {
  width: 100%;
}

.api-config-loading,
.api-config-error,
.api-config-empty {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 12px;
}

.api-config-loading {
  background-color: #f1f5f9;
  color: #64748b;
}

.api-config-error {
  background-color: #fef2f2;
  color: #dc2626;
}

.api-config-empty {
  background-color: #f8fafc;
  color: #94a3b8;
}

.loading-text,
.error-text,
.empty-text {
  font-size: 12px;
}

.api-config-fields {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.api-config-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field-label {
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
}

.form-required {
  color: #ef4444;
  margin-left: 4px;
}

.field-error {
  font-size: 12px;
  color: #ef4444;
  margin-top: -4px;
}

.form-input-error {
  border-color: #ef4444 !important;
}

.form-input-error:focus {
  border-color: #ef4444 !important;
  box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.1) !important;
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
  background-color: #10b981;
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
  background-color: #059669;
}

.confirm-btn:active {
  transform: scale(0.98);
}
</style>
