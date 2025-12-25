<template>
  <transition name="modal">
    <div v-if="visible" class="modal-overlay" @click="handleClose">
      <div class="modal-content" @click.stop>
        <!-- 头部 -->
        <div class="modal-header">
          <div class="modal-header-left">
            <div class="modal-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
            </div>
            <div>
              <h2 class="modal-title">导入新小说项目</h2>
              <p class="modal-subtitle">选择您的数据来源,系统将自动识别结构</p>
            </div>
          </div>
          <button class="modal-close" @click="handleClose">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <!-- 标签页 -->
        <div class="modal-tabs">
          <button
            :class="['tab-btn', { 'tab-btn-active': activeTab === 'upload' }]"
            @click="activeTab = 'upload'"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            文件上传
          </button>
          <button
            :class="['tab-btn', { 'tab-btn-active': activeTab === 'paste' }]"
            @click="activeTab = 'paste'"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path
                d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"
              ></path>
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
            </svg>
            粘贴片段
          </button>
          <button
            :class="['tab-btn', { 'tab-btn-active': activeTab === 'link' }]"
            @click="activeTab = 'link'"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path
                d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"
              ></path>
              <path
                d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
              ></path>
            </svg>
            链接导入
          </button>
        </div>

        <!-- 内容区域 -->
        <div class="modal-body">
          <!-- 文件上传 -->
          <div
            v-if="activeTab === 'upload'"
            class="tab-content"
            :class="{ 'upload-tab-empty': fileList.length === 0 }"
          >
            <Upload
              :auto-upload="false"
              accept=".txt,.epub,.doc,.docx"
              :file-list="fileList"
              :limit="1"
              @change="handleFileListChange"
              class="upload-wrapper"
            >
              <template #upload-button>
                <div class="upload-area">
                  <div class="upload-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path
                        d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
                      ></path>
                      <polyline points="17 8 12 3 7 8"></polyline>
                      <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                  </div>
                  <p class="upload-text">点击或拖拽文件到此处上传</p>
                  <p class="upload-hint">支持 .txt, .epub, .doc, .docx 格式</p>
                </div>
              </template>
            </Upload>

            <!-- 文件信息表单 -->
            <div
              v-if="activeTab === 'upload' && fileList.length > 0"
              class="form-section"
            >
              <div class="form-group">
                <label class="form-label">文件名（可选）</label>
                <input
                  v-model="uploadForm.fileName"
                  type="text"
                  class="form-input"
                  :placeholder="fileList[0]?.name || ''"
                />
              </div>
              <div class="form-group">
                <label class="form-label">文件编码（可选）</label>
                <select v-model="uploadForm.encoding" class="form-input">
                  <option value="UTF-8">UTF-8</option>
                  <option value="GBK">GBK</option>
                  <option value="GB2312">GB2312</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">自定义书名（可选）</label>
                <input
                  v-model="uploadForm.customTitle"
                  type="text"
                  class="form-input"
                  placeholder="如不填写，将自动识别"
                />
              </div>
            </div>
          </div>

          <!-- 粘贴片段 -->
          <div v-if="activeTab === 'paste'" class="tab-content">
            <textarea
              v-model="pasteForm.text"
              class="paste-textarea"
              placeholder="在此处粘贴小说正文内容,系统会自动提取标题..."
              rows="12"
            ></textarea>

            <!-- 粘贴片段表单 -->
            <div class="form-section">
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">书名（可选）</label>
                  <input
                    v-model="pasteForm.title"
                    type="text"
                    class="form-input"
                    placeholder="如不填写，将自动识别"
                  />
                </div>
                <div class="form-group">
                  <label class="form-label">作者（可选）</label>
                  <input
                    v-model="pasteForm.author"
                    type="text"
                    class="form-input"
                    placeholder="作者名称"
                  />
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">简介（可选）</label>
                <textarea
                  v-model="pasteForm.summary"
                  class="form-textarea"
                  rows="3"
                  placeholder="小说简介"
                ></textarea>
              </div>
              <div class="form-group">
                <label class="form-label"
                  >存储位置 <span class="required">*</span></label
                >
                <select
                  v-model="pasteForm.storageLocation"
                  class="form-input"
                  :class="{ 'form-input-error': errors.storageLocation }"
                >
                  <option value="">请选择存储位置</option>
                  <option value="local">本地文件系统 (Local)</option>
                  <option value="remote">云端对象存储 (OSS)</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-checkbox-label">
                  <input
                    v-model="pasteForm.expandText"
                    type="checkbox"
                    class="form-checkbox"
                  />
                  <span>是否扩写（勾选后系统会先扩写再分割章节）</span>
                </label>
              </div>
            </div>
          </div>

          <!-- 链接导入 -->
          <div v-if="activeTab === 'link'" class="tab-content">
            <div class="form-section">
              <div class="form-group">
                <label class="form-label"
                  >链接地址 <span class="required">*</span></label
                >
                <input
                  v-model="linkForm.url"
                  type="url"
                  class="form-input"
                  :class="{ 'form-input-error': errors.url }"
                  placeholder="请输入小说链接地址"
                />
              </div>
              <div class="form-group">
                <label class="form-label"
                  >存储位置 <span class="required">*</span></label
                >
                <select
                  v-model="linkForm.storageLocation"
                  class="form-input"
                  :class="{ 'form-input-error': errors.storageLocation }"
                >
                  <option value="">请选择存储位置</option>
                  <option value="local">本地文件系统 (Local)</option>
                  <option value="remote">云端对象存储 (OSS)</option>
                </select>
              </div>
            </div>
            <div class="info-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              <p>链接导入功能暂未开放，请使用文件上传或粘贴片段</p>
            </div>
          </div>
        </div>

        <!-- 底部按钮 -->
        <div class="modal-footer">
          <button class="btn-cancel" @click="handleClose">取消</button>
          <button
            class="btn-submit"
            :disabled="isSubmitting"
            @click="handleSubmit"
          >
            {{ isSubmitting ? "处理中..." : "开始解析" }}
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, reactive, watch, computed } from "vue";
import { getLocalStorage } from "@/utils/storage";
import { uploadNovel, pasteText } from "@/api";
import { Message, Upload } from "@arco-design/web-vue";

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["update:visible", "success"]);

const projectId = computed(() => getLocalStorage("currentProjectId", ""));

const activeTab = ref("paste");
const fileList = ref([]);
const isSubmitting = ref(false);
const errors = reactive({});

// 文件上传表单
const uploadForm = reactive({
  fileName: "",
  encoding: "UTF-8",
  customTitle: "",
});

// 粘贴片段表单
const pasteForm = reactive({
  text: "",
  title: "",
  author: "",
  summary: "",
  storageLocation: "",
  expandText: false,
});

// 链接导入表单
const linkForm = reactive({
  url: "",
  storageLocation: "",
});

// 关闭弹窗
function handleClose() {
  emit("update:visible", false);
  resetForm();
}

// 重置表单
function resetForm() {
  fileList.value = [];
  uploadForm.fileName = "";
  uploadForm.encoding = "UTF-8";
  uploadForm.customTitle = "";
  pasteForm.text = "";
  pasteForm.title = "";
  pasteForm.author = "";
  pasteForm.summary = "";
  pasteForm.storageLocation = "";
  pasteForm.expandText = false;
  linkForm.url = "";
  linkForm.storageLocation = "";
  Object.keys(errors).forEach((key) => delete errors[key]);
}

// 处理文件列表变化
function handleFileListChange(fileListParam, fileItem) {
  // Arco Design Upload 组件的 change 事件返回 (fileList, fileItem)
  fileList.value = fileListParam;
  if (fileList.value.length > 0) {
    const fileItem = fileList.value[0];
    const file = fileItem.file || fileItem.originFile;
    if (file && !uploadForm.fileName) {
      uploadForm.fileName = file.name;
    }
  }
}

// 验证表单
function validateForm() {
  Object.keys(errors).forEach((key) => delete errors[key]);
  let isValid = true;

  if (activeTab.value === "upload") {
    if (fileList.value.length === 0) {
      Message.error("请选择要上传的文件");
      isValid = false;
    }
  } else if (activeTab.value === "paste") {
    if (!pasteForm.text || !pasteForm.text.trim()) {
      Message.error("请输入要粘贴的文本内容");
      isValid = false;
    }
    if (!pasteForm.storageLocation) {
      errors.storageLocation = true;
      Message.error("请选择存储位置");
      isValid = false;
    }
  } else if (activeTab.value === "link") {
    if (!linkForm.url || !linkForm.url.trim()) {
      errors.url = true;
      Message.error("请输入链接地址");
      isValid = false;
    }
    if (!linkForm.storageLocation) {
      errors.storageLocation = true;
      Message.error("请选择存储位置");
      isValid = false;
    } else {
      Message.warning("链接导入功能暂未开放");
      isValid = false;
    }
  }

  if (!projectId.value) {
    Message.error("项目ID不存在，请重新进入项目");
    isValid = false;
  }

  return isValid;
}

// 提交表单
async function handleSubmit() {
  if (!validateForm()) {
    return;
  }

  isSubmitting.value = true;

  try {
    if (activeTab.value === "upload") {
      // 文件上传
      if (fileList.value.length === 0) {
        Message.error("请选择要上传的文件");
        return;
      }

      const fileItem = fileList.value[0];
      const file = fileItem.file || fileItem.originFile;
      if (!file) {
        Message.error("文件对象不存在");
        return;
      }
      const formData = new FormData();
      formData.append("file", file);
      formData.append("projectId", projectId.value);
      if (uploadForm.fileName) {
        formData.append("fileName", uploadForm.fileName);
      }
      if (uploadForm.encoding) {
        formData.append("encoding", uploadForm.encoding);
      }
      if (uploadForm.customTitle) {
        formData.append("customTitle", uploadForm.customTitle);
      }

      const res = await uploadNovel(formData);
      if (res.success) {
        Message.success("小说上传成功");
        emit("success");
        handleClose();
      }
    } else if (activeTab.value === "paste") {
      // 文本粘贴
      const data = {
        projectId: projectId.value,
        text: pasteForm.text,
        storageLocation: pasteForm.storageLocation,
        expandText: pasteForm.expandText,
      };

      if (pasteForm.title) {
        data.title = pasteForm.title;
      }
      if (pasteForm.author) {
        data.author = pasteForm.author;
      }
      if (pasteForm.summary) {
        data.summary = pasteForm.summary;
      }

      const res = await pasteText(data);
      if (res.success) {
        Message.success("文本上传成功");
        emit("success");
        handleClose();
      }
    }
  } catch (error) {
    console.error("提交失败:", error);
    Message.error(error.message || "提交失败，请重试");
  } finally {
    isSubmitting.value = false;
  }
}

// 监听 visible 变化，切换标签页时重置表单
watch(
  () => props.visible,
  (newVal) => {
    if (newVal) {
      activeTab.value = "paste";
      resetForm();
    }
  }
);

// 监听标签页切换，清空错误
watch(activeTab, () => {
  Object.keys(errors).forEach((key) => delete errors[key]);
});
</script>

<style scoped>
/* 弹窗遮罩 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 800px;
  height: 85vh;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1),
    0 10px 10px -5px rgba(0, 0, 0, 0.04);
  overflow: hidden;
}

/* 头部 */
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 24px;
  border-bottom: 1px solid #e2e8f0;
}

.modal-header-left {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.modal-icon {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.modal-icon svg {
  width: 24px;
  height: 24px;
  color: white;
  stroke-width: 2.5;
}

.modal-title {
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 4px 0;
}

.modal-subtitle {
  font-size: 14px;
  color: #64748b;
  margin: 0;
}

.modal-close {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  color: #64748b;
  transition: all 0.2s;
}

.modal-close:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.modal-close svg {
  width: 20px;
  height: 20px;
  stroke-width: 2.5;
}

/* 标签页 */
.modal-tabs {
  display: flex;
  gap: 8px;
  padding: 0 24px;
  border-bottom: 1px solid #e2e8f0;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border: none;
  background: transparent;
  color: #64748b;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
  margin-bottom: -1px;
}

.tab-btn:hover {
  color: #2563eb;
}

.tab-btn-active {
  color: #2563eb;
  border-bottom-color: #2563eb;
}

.tab-btn svg {
  width: 16px;
  height: 16px;
  stroke-width: 2;
}

/* 内容区域 */
.modal-body {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

/* 自定义滚动条样式 */
.modal-body::-webkit-scrollbar {
  width: 8px;
}

.modal-body::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 4px;
}

.modal-body::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
  transition: background 0.2s;
}

.modal-body::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* 粘贴文本区域的滚动条 */
.paste-textarea::-webkit-scrollbar {
  width: 8px;
}

.paste-textarea::-webkit-scrollbar-track {
  background: #f8fafc;
  border-radius: 4px;
}

.paste-textarea::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
  transition: background 0.2s;
}

.paste-textarea::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

.tab-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
  min-height: calc(100% - 48px);
}

/* 文件上传标签页：当没有文件时，上传区域居中 */
.tab-content.upload-tab-empty {
  justify-content: center;
}

/* 上传区域 */
.upload-area {
  border: 2px dashed #cbd5e1;
  border-radius: 12px;
  padding: 48px 24px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  background: #f8fafc;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.upload-area:hover {
  border-color: #2563eb;
  background: #eff6ff;
}

.upload-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 16px;
  color: #94a3b8;
}

.upload-icon svg {
  width: 100%;
  height: 100%;
  stroke-width: 1.5;
}

.upload-text {
  font-size: 16px;
  font-weight: 600;
  color: #0f172a;
  margin: 0 0 8px 0;
}

.upload-hint {
  font-size: 14px;
  color: #64748b;
  margin: 0;
}

.upload-filename {
  margin-top: 16px;
  padding: 8px 16px;
  background: white;
  border-radius: 6px;
  font-size: 14px;
  color: #2563eb;
  display: inline-block;
}

/* 文本区域 */
.paste-textarea {
  width: 100%;
  padding: 16px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  line-height: 1.6;
  resize: vertical;
  outline: none;
  transition: all 0.2s;
}

.paste-textarea:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.paste-textarea::placeholder {
  color: #94a3b8;
}

/* 表单 */
.form-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label {
  font-size: 14px;
  font-weight: 500;
  color: #0f172a;
}

.required {
  color: #dc2626;
}

.form-input,
.form-textarea {
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  outline: none;
  transition: all 0.2s;
}

.form-input:focus,
.form-textarea:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.form-input-error {
  border-color: #dc2626;
}

.form-input-error:focus {
  border-color: #dc2626;
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

.form-checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
}

.form-checkbox {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

/* 信息提示框 */
.info-box {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 8px;
  color: #0c4a6e;
}

.info-box svg {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  margin-top: 2px;
  stroke-width: 2;
}

.info-box p {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
}

/* 底部按钮 */
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 24px;
  border-top: 1px solid #e2e8f0;
}

.btn-cancel,
.btn-submit {
  padding: 10px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-cancel {
  background: white;
  color: #64748b;
  border: 1px solid #e2e8f0;
}

.btn-cancel:hover {
  background: #f8fafc;
  color: #0f172a;
}

.btn-submit {
  background: #2563eb;
  color: white;
}

.btn-submit:hover:not(:disabled) {
  background: #1d4ed8;
}

.btn-submit:disabled {
  background: #94a3b8;
  cursor: not-allowed;
}

/* 上传组件包装 */
.upload-wrapper {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.upload-wrapper :deep(.arco-upload-list) {
  display: none;
}

.upload-wrapper :deep(.arco-upload) {
  width: 100%;
  display: flex;
  justify-content: center;
}

/* 弹窗动画 */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal-content,
.modal-leave-active .modal-content {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
  transform: scale(0.95);
  opacity: 0;
}
</style>
