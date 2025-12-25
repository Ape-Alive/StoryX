<template>
  <div class="character-modeling-page">
    <!-- 顶部页眉 -->
    <header class="page-header">
      <div class="header-left">
        <div class="header-icon">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <line x1="19" y1="8" x2="19" y2="14"></line>
            <line x1="22" y1="11" x2="16" y2="11"></line>
          </svg>
        </div>
        <div class="header-info">
          <div class="breadcrumb">
            <NovelSelector
              :value="novelId"
              :title="novelTitle"
              @change="handleNovelSelect"
            />
            <span class="separator">></span>
            <span class="current-page">角色建模模块</span>
          </div>
        </div>
      </div>

      <div class="header-actions">
        <button @click="handleMerge" class="merge-button">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
            <polyline points="2 17 12 22 22 17"></polyline>
            <polyline points="2 12 12 17 22 12"></polyline>
          </svg>
          自动合并
        </button>
        <button @click="handleCreate" class="create-button">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <line x1="19" y1="8" x2="19" y2="14"></line>
            <line x1="22" y1="11" x2="16" y2="11"></line>
          </svg>
          新建角色
        </button>
      </div>
    </header>

    <!-- 控制条 -->
    <div class="control-bar">
      <div class="control-left">
        <div class="tabs">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            :class="['tab-button', { active: activeTab === tab.key }]"
            @click="activeTab = tab.key"
          >
            {{ tab.label }}
          </button>
        </div>
        <span class="selection-count">
          已选择
          <span class="count-number">{{ selectedIds.length }}</span>
          个资产项
        </span>
      </div>

      <div class="control-right">
        <button
          :disabled="selectedIds.length === 0"
          @click="handleBatchGacha"
          class="gacha-button"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M12 2L2 7l10 5 10-5-10-5z" fill="currentColor"></path>
            <path
              d="M2 17l10 5 10-5M2 12l10 5 10-5"
              stroke-linecap="round"
              stroke-linejoin="round"
            ></path>
          </svg>
          批量 AI 抽卡
        </button>
      </div>
    </div>

    <!-- 角色网格区域 -->
    <main class="main-content">
      <div v-if="loading" class="loading-state">
        <a-spin size="large" />
      </div>
      <div v-else-if="filteredCharacters.length === 0" class="empty-state">
        <p>暂无角色数据</p>
        <button @click="handleCreate" class="empty-create-button">
          创建第一个角色
        </button>
      </div>
      <div v-else class="characters-grid">
        <CharacterCard
          v-for="character in filteredCharacters"
          :key="character.id"
          :character="character"
          :is-selected="selectedIds.includes(character.id)"
          @toggle-select="handleToggleSelect"
          @edit="handleEdit"
          @preview="handlePreview"
        />

        <!-- 空白添加卡片 -->
        <button @click="handleCreate" class="add-card">
          <div class="add-icon">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <line x1="19" y1="8" x2="19" y2="14"></line>
              <line x1="22" y1="11" x2="16" y2="11"></line>
            </svg>
          </div>
          <span class="add-text">添加新角色资产</span>
        </button>
      </div>
    </main>

    <!-- 底部预览区 -->
    <PreviewPanel
      v-if="previewCharacter"
      :character="previewCharacter"
      @close="previewCharacter = null"
    />

    <!-- 创建/编辑弹窗 -->
    <CharacterModal
      :visible="isModalOpen"
      :editing-character="editingCharacter"
      :loading="modalLoading"
      @close="handleCloseModal"
      @submit="handleSubmitModal"
    />

    <!-- 批量抽卡配置弹窗 -->
    <BatchDrawModal
      :visible="showBatchDrawModal"
      :selected-count="selectedIds.length"
      @confirm="handleBatchDrawConfirm"
      @cancel="showBatchDrawModal = false"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { Message } from "@arco-design/web-vue";
import { getLocalStorage } from "@/utils/storage";
import {
  getCharacters,
  createCharacter,
  updateCharacter,
  deleteCharacter,
  mergeCharacters,
  batchDrawCharacters,
  getDrawTaskProgress,
} from "@/api";
import CharacterCard from "./components/CharacterCard.vue";
import CharacterModal from "./components/CharacterModal.vue";
import PreviewPanel from "./components/PreviewPanel.vue";
import NovelSelector from "@/components/NovelSelector.vue";
import BatchDrawModal from "./components/BatchDrawModal.vue";

const projectId = computed(() => getLocalStorage("currentProjectId", ""));
const novelId = ref("");
const novelTitle = ref("");

// 状态管理
const characters = ref([]);
const selectedIds = ref([]);
const activeTab = ref("all");
const isModalOpen = ref(false);
const editingCharacter = ref(null);
const previewCharacter = ref(null);
const loading = ref(false);
const modalLoading = ref(false);
const showBatchDrawModal = ref(false);

// 标签页配置
const tabs = [
  { key: "all", label: "全部" },
  { key: "generating", label: "生成中" },
  { key: "completed", label: "已完成" },
];

// 筛选后的角色列表
const filteredCharacters = computed(() => {
  let filtered = characters.value;

  // 根据标签页筛选
  if (activeTab.value === "generating") {
    filtered = filtered.filter((char) => char.isGenerating);
  } else if (activeTab.value === "completed") {
    filtered = filtered.filter(
      (char) => char.progress === 100 && !char.isGenerating
    );
  }

  return filtered;
});

// 选择小说
async function handleNovelSelect(novel) {
  novelId.value = novel.id || novel.novelId;
  novelTitle.value = novel.title || novel.novelTitle || "未知小说";
  await loadCharacters();
}

// 加载角色列表
async function loadCharacters() {
  loading.value = true;
  try {
    const params = {};
    if (projectId.value) {
      params.projectId = projectId.value;
    }
    if (novelId.value) {
      params.novelId = novelId.value;
    }

    const response = await getCharacters(params);
    if (response.success && response.data) {
      // 处理角色数据，添加前端需要的状态字段
      characters.value = response.data.map((char) => ({
        ...char,
        isGenerating: false,
        progress: char.imageUrl || char.videoUrl ? 100 : 0,
      }));
    }
  } catch (error) {
    console.error("加载角色列表失败:", error);
    Message.error(error.message || "加载角色列表失败");
  } finally {
    loading.value = false;
  }
}

// 切换选择
function handleToggleSelect(id) {
  const index = selectedIds.value.indexOf(id);
  if (index > -1) {
    selectedIds.value.splice(index, 1);
  } else {
    selectedIds.value.push(id);
  }
}

// 创建角色
function handleCreate() {
  editingCharacter.value = null;
  isModalOpen.value = true;
}

// 编辑角色
function handleEdit(character) {
  editingCharacter.value = character;
  isModalOpen.value = true;
}

// 预览角色
function handlePreview(character) {
  previewCharacter.value = character;
}

// 关闭弹窗
function handleCloseModal() {
  isModalOpen.value = false;
  editingCharacter.value = null;
}

// 提交表单
async function handleSubmitModal(formData) {
  modalLoading.value = true;
  try {
    const data = {
      ...formData,
      projectId: projectId.value || undefined,
      novelId: novelId.value || undefined,
    };

    let response;
    if (editingCharacter.value) {
      // 更新角色
      response = await updateCharacter(
        editingCharacter.value.id,
        data,
        novelId.value
      );
      if (response.success) {
        Message.success("角色更新成功");
        await loadCharacters();
      }
    } else {
      // 创建角色
      response = await createCharacter(data);
      if (response.success) {
        Message.success("角色创建成功");
        await loadCharacters();
      }
    }

    handleCloseModal();
  } catch (error) {
    console.error("保存角色失败:", error);
    Message.error(error.message || "保存角色失败");
  } finally {
    modalLoading.value = false;
  }
}

// 批量抽卡 - 显示配置弹窗
function handleBatchGacha() {
  if (selectedIds.value.length === 0) {
    Message.warning("请先选择角色");
    return;
  }

  if (!projectId.value) {
    Message.error("项目ID不存在");
    return;
  }

  showBatchDrawModal.value = true;
}

// 批量抽卡确认 - 执行抽卡
async function handleBatchDrawConfirm(config) {
  if (selectedIds.value.length === 0) {
    Message.warning("请先选择角色");
    return;
  }

  if (!projectId.value) {
    Message.error("项目ID不存在");
    return;
  }

  showBatchDrawModal.value = false;

  try {
    // 构建请求数据
    const requestData = {
      characterIds: selectedIds.value,
      projectId: projectId.value,
      drawType: config.drawType || "image",
      storageMode: config.storageMode || "download_upload",
    };

    if (config.featurePromptId) {
      requestData.featurePromptId = config.featurePromptId;
    }

    if (config.genreStyle) {
      requestData.genreStyle = config.genreStyle;
    }

    if (config.apiConfig) {
      requestData.apiConfig = config.apiConfig;
    }

    // 调用批量抽卡 API
    const response = await batchDrawCharacters(requestData);

    if (response.success && response.data) {
      const taskIds = response.data.taskIds || [];
      Message.success(
        `已为 ${taskIds.length} 个角色创建抽卡任务，正在生成中...`
      );

      // 更新选中角色的状态
      characters.value = characters.value.map((char) => {
        if (selectedIds.value.includes(char.id)) {
          return {
            ...char,
            isGenerating: true,
            progress: 10,
          };
        }
        return char;
      });

      // 为每个任务启动进度查询
      taskIds.forEach((taskInfo) => {
        pollTaskProgress(taskInfo.taskId, taskInfo.characterId);
      });

      // 清空选择
      selectedIds.value = [];
    }
  } catch (error) {
    console.error("批量抽卡失败:", error);
    Message.error(error.message || "批量抽卡失败");
  }
}

// 轮询任务进度
function pollTaskProgress(taskId, characterId) {
  const maxAttempts = 300; // 最多轮询 5 分钟（每秒一次）
  let attempts = 0;

  const poll = async () => {
    if (attempts >= maxAttempts) {
      // 超时，停止轮询
      characters.value = characters.value.map((char) => {
        if (char.id === characterId) {
          return {
            ...char,
            isGenerating: false,
          };
        }
        return char;
      });
      return;
    }

    try {
      const response = await getDrawTaskProgress(taskId);
      if (response.success && response.data) {
        const task = response.data;
        const progress = task.progress || 0;

        // 更新角色状态
        characters.value = characters.value.map((char) => {
          if (char.id === characterId) {
            if (task.status === "completed") {
              // 任务完成，重新加载角色列表以获取最新图片
              loadCharacters();
              return {
                ...char,
                isGenerating: false,
                progress: 100,
              };
            } else if (task.status === "failed") {
              Message.error(`角色 ${task.characterName} 抽卡失败`);
              return {
                ...char,
                isGenerating: false,
              };
            } else {
              // 处理中，更新进度
              return {
                ...char,
                isGenerating: true,
                progress: progress,
              };
            }
          }
          return char;
        });

        // 如果任务还在进行中，继续轮询
        if (task.status === "pending" || task.status === "processing") {
          attempts++;
          setTimeout(poll, 1000); // 每秒轮询一次
        }
      }
    } catch (error) {
      console.error("查询任务进度失败:", error);
      // 发生错误也继续轮询
      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(poll, 2000); // 错误时延迟更久
      }
    }
  };

  poll();
}

// 自动合并
async function handleMerge() {
  try {
    const params = {};
    if (projectId.value) {
      params.projectId = projectId.value;
    }
    if (novelId.value) {
      params.novelId = novelId.value;
    }

    const response = await mergeCharacters(params);
    if (response.success) {
      Message.success(
        `合并完成：已处理 ${response.data.totalProcessed} 个角色，合并了 ${response.data.mergedCount} 个重复角色`
      );
      await loadCharacters();
      selectedIds.value = [];
    }
  } catch (error) {
    console.error("合并角色失败:", error);
    Message.error(error.message || "合并角色失败");
  }
}

// 初始化
onMounted(() => {
  loadCharacters();
});
</script>

<style scoped>
.character-modeling-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f8fafc;
  color: #0f172a;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    "Helvetica Neue", Arial, sans-serif;
}

/* 顶部页眉 */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: white;
  border-bottom: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
  position: sticky;
  top: 0;
  z-index: 20;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-icon {
  padding: 8px;
  background: #6366f1;
  border-radius: 8px;
  box-shadow: 0 4px 6px -1px rgba(99, 102, 241, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
}

.header-icon svg {
  width: 24px;
  height: 24px;
  color: white;
}

.header-info {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.separator {
  color: #94a3b8;
  margin: 0 4px;
}

.current-page {
  color: #2563eb;
  background: #eff6ff;
  padding: 4px 8px;
  border-radius: 4px;
  font-weight: 600;
  font-style: italic;
  font-size: 12px;
  border: 1px solid #dbeafe;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.merge-button,
.create-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 700;
  transition: all 0.2s;
  border: none;
  cursor: pointer;
}

.merge-button {
  background: white;
  color: #475569;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

.merge-button:hover {
  background: #f8fafc;
}

.create-button {
  background: #6366f1;
  color: white;
  box-shadow: 0 4px 6px -1px rgba(99, 102, 241, 0.3);
}

.create-button:hover {
  background: #4f46e5;
}

.merge-button svg,
.create-button svg {
  width: 16px;
  height: 16px;
}

/* 控制条 */
.control-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(4px);
  border-bottom: 1px solid rgba(226, 232, 240, 0.6);
}

.control-left {
  display: flex;
  align-items: center;
  gap: 24px;
}

.tabs {
  display: flex;
  gap: 4px;
  padding: 4px;
  background: #f1f5f9;
  border-radius: 8px;
  border: 1px solid rgba(226, 232, 240, 0.5);
}

.tab-button {
  padding: 6px 16px;
  font-size: 12px;
  font-weight: 700;
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

.selection-count {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
}

.count-number {
  color: #6366f1;
  font-weight: 700;
}

.control-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.gacha-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 20px;
  background: #ecfdf5;
  color: #065f46;
  border: 1px solid #a7f3d0;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}

.gacha-button:hover:not(:disabled) {
  background: #d1fae5;
}

.gacha-button:disabled {
  opacity: 0.4;
  filter: grayscale(100%);
  cursor: not-allowed;
}

.gacha-button svg {
  width: 14px;
  height: 14px;
}

/* 主内容区 */
.main-content {
  flex: 1;
  overflow-y: auto;
  padding: 32px;
}

.characters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 32px;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  color: #64748b;
}

.empty-state p {
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 16px;
}

.empty-create-button {
  padding: 12px 24px;
  background: #6366f1;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}

.empty-create-button:hover {
  background: #4f46e5;
}

/* 添加卡片 */
.add-card {
  border: 2px dashed #e2e8f0;
  border-radius: 16px;
  padding: 64px 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  background: white;
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.3s;
}

.add-card:hover {
  color: #6366f1;
  border-color: #c7d2fe;
  background: rgba(238, 242, 255, 0.3);
}

.add-icon {
  padding: 16px;
  background: white;
  border-radius: 50%;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  border: 1px solid #f1f5f9;
  transition: transform 0.3s;
}

.add-card:hover .add-icon {
  transform: scale(1.1);
}

.add-icon svg {
  width: 28px;
  height: 28px;
}

.add-text {
  font-size: 14px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: -0.5px;
}
</style>
