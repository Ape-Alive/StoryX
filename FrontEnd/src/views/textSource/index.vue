<template>
  <div class="text-source-page">
    <!-- 头部 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">内容中心</h1>
        <p class="page-subtitle">管理您的小说资产并开始剧本结构化流程</p>
      </div>
      <div class="header-right">
        <div class="search-box">
          <svg
            class="search-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索小说..."
            class="search-input"
            @input="handleSearch"
          />
        </div>
        <button class="btn-import" @click="handleImport">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          导入新书
        </button>
      </div>
    </div>

    <!-- 小说列表 -->
    <div class="novels-grid">
      <div
        v-for="novel in filteredNovels"
        :key="novel.id"
        class="novel-card"
        :class="getNovelCardClass(novel)"
        @dblclick="handleNovelDoubleClick(novel)"
      >
        <div class="novel-card-cover">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path
              d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            ></path>
            <path
              d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            ></path>
          </svg>
          <div class="novel-title-cover">{{ novel.title }}</div>
        </div>
        <div class="novel-card-info">
          <h3 class="novel-title">{{ novel.title }}</h3>
          <div class="novel-meta">
            <span class="novel-author">{{ novel.author || "未知作者" }}</span>
            <span
              v-if="novel.status === 'parsing'"
              class="novel-status status-parsing"
            >
              解析中
            </span>
            <span v-else class="novel-chapters">
              {{ novel.totalChapters || 0 }} 章节
            </span>
          </div>
          <div class="novel-actions">
            <button
              class="action-btn action-btn-view"
              @click.stop="handleViewDetail(novel.id)"
              title="查看详情"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
            </button>
            <button
              class="action-btn action-btn-delete"
              @click.stop="handleDelete(novel)"
              title="删除"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path
                  d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                ></path>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="novels.length === 0 && !isLoading" class="empty-state">
        <div class="empty-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path
              d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            ></path>
            <path
              d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            ></path>
          </svg>
        </div>
        <p class="empty-text">暂无小说，点击"导入新书"开始</p>
      </div>
    </div>

    <!-- 导入新书弹窗 -->
    <ImportNovelModal
      v-model:visible="showImportModal"
      @success="handleImportSuccess"
    />

    <!-- 小说详情弹窗 -->
    <NovelDetailModal
      v-model:visible="showDetailModal"
      :novel-id="selectedNovelId"
    />

    <!-- 通知 -->
    <div v-if="showNotification" class="notification">
      <div class="notification-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
      </div>
      <span>{{ notificationMessage }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { getLocalStorage } from "@/utils/storage";
import { getNovels, deleteNovel } from "@/api";
import { Message, Modal } from "@arco-design/web-vue";
import ImportNovelModal from "./components/ImportNovelModal.vue";
import NovelDetailModal from "./components/NovelDetailModal.vue";

const router = useRouter();
const projectId = computed(() => getLocalStorage("currentProjectId", ""));

const novels = ref([]);
const searchQuery = ref("");
const isLoading = ref(false);
const showImportModal = ref(false);
const showDetailModal = ref(false);
const selectedNovelId = ref("");
const showNotification = ref(false);
const notificationMessage = ref("");

// 过滤小说
const filteredNovels = computed(() => {
  if (!searchQuery.value) {
    return novels.value;
  }
  const query = searchQuery.value.toLowerCase();
  return novels.value.filter(
    (novel) =>
      novel.title?.toLowerCase().includes(query) ||
      novel.author?.toLowerCase().includes(query)
  );
});

// 获取小说卡片样式类
const getNovelCardClass = (novel) => {
  const colors = ["blue", "purple", "green", "orange", "pink", "indigo"];
  const index = novel.id
    ? parseInt(novel.id.replace(/\D/g, "")) % colors.length
    : 0;
  return `novel-card-${colors[index]}`;
};

// 加载小说列表
async function loadNovels() {
  if (!projectId.value) {
    console.warn("项目ID不存在");
    return;
  }

  isLoading.value = true;
  try {
    const res = await getNovels({ projectId: projectId.value });
    novels.value = res.data || [];
  } catch (error) {
    console.error("加载小说列表失败:", error);
    Message.error(error.message || "加载小说列表失败");
  } finally {
    isLoading.value = false;
  }
}

// 搜索
function handleSearch() {
  // 搜索逻辑已通过 computed 实现
}

// 导入新书
function handleImport() {
  showImportModal.value = true;
}

// 导入成功回调
async function handleImportSuccess() {
  await loadNovels();
  showNotificationMessage("云端同步已就绪");
}

// 查看详情
function handleViewDetail(novelId) {
  selectedNovelId.value = novelId;
  showDetailModal.value = true;
}

// 双击小说卡片进入详情页
function handleNovelDoubleClick(novel) {
  router.push(`/project/text-source/${novel.id}`);
}

// 删除小说
function handleDelete(novel) {
  Modal.confirm({
    title: "确认删除",
    content: `确定要删除小说《${novel.title}》吗？此操作将删除该小说的所有关联数据，包括章节记录和文件系统中的所有文件。`,
    okText: "删除",
    cancelText: "取消",
    okButtonProps: { status: "danger" },
    onOk: async () => {
      try {
        const res = await deleteNovel(novel.id);
        if (res.success) {
          Message.success("小说删除成功");
          await loadNovels();
        } else {
          Message.error(res.message || "删除失败");
        }
      } catch (error) {
        console.error("删除小说失败:", error);
        Message.error(error.message || "删除失败");
      }
    },
  });
}

// 显示通知
function showNotificationMessage(message) {
  notificationMessage.value = message;
  showNotification.value = true;
  setTimeout(() => {
    showNotification.value = false;
  }, 3000);
}

onMounted(() => {
  loadNovels();
});
</script>

<style scoped>
.text-source-page {
  min-height: 100vh;
  background-color: #fff;
  padding: 32px;
}

/* 头部 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32px;
}

.header-left {
  flex: 1;
}

.page-title {
  font-size: 32px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 8px 0;
}

.page-subtitle {
  font-size: 14px;
  color: #64748b;
  margin: 0;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 12px;
  width: 16px;
  height: 16px;
  color: #94a3b8;
  pointer-events: none;
}

.search-input {
  width: 280px;
  padding: 10px 12px 10px 36px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  background: white;
  outline: none;
  transition: all 0.2s;
}

.search-input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.search-input::placeholder {
  color: #94a3b8;
}

.btn-import {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-import:hover {
  background: #1d4ed8;
}

.btn-import:active {
  transform: scale(0.98);
}

.btn-import svg {
  width: 16px;
  height: 16px;
  stroke-width: 2.5;
}

/* 小说网格 */
.novels-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
}

/* 小说卡片 */
.novel-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.novel-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
}

.novel-card-cover {
  height: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  padding: 24px;
}

.novel-card-cover svg {
  width: 64px;
  height: 64px;
  color: white;
  opacity: 0.9;
  stroke-width: 1.5;
}

.novel-title-cover {
  position: absolute;
  bottom: 16px;
  left: 16px;
  right: 16px;
  color: white;
  font-size: 16px;
  font-weight: 700;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 卡片颜色 */
.novel-card-blue .novel-card-cover {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
}

.novel-card-purple .novel-card-cover {
  background: linear-gradient(135deg, #a855f7 0%, #9333ea 100%);
}

.novel-card-green .novel-card-cover {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
}

.novel-card-orange .novel-card-cover {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
}

.novel-card-pink .novel-card-cover {
  background: linear-gradient(135deg, #ec4899 0%, #db2777 100%);
}

.novel-card-indigo .novel-card-cover {
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
}

.novel-card-info {
  padding: 16px;
  position: relative;
}

.novel-title {
  font-size: 16px;
  font-weight: 600;
  color: #0f172a;
  margin: 0 0 8px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.novel-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
}

.novel-author {
  color: #64748b;
}

.novel-chapters {
  color: #64748b;
}

.novel-status {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}

.status-parsing {
  background: #fef3c7;
  color: #d97706;
}

/* 操作按钮 */
.novel-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #e2e8f0;
}

.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 36px;
}

.action-btn svg {
  width: 18px;
  height: 18px;
  stroke-width: 2.5;
}

.action-btn-view {
  color: #2563eb;
  border-color: #e2e8f0;
}

.action-btn-view:hover {
  background: #eff6ff;
  border-color: #2563eb;
  color: #1d4ed8;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(37, 99, 235, 0.1);
}

.action-btn-view:active {
  transform: translateY(0);
  box-shadow: none;
}

.action-btn-delete {
  color: #dc2626;
  border-color: #e2e8f0;
}

.action-btn-delete:hover {
  background: #fee2e2;
  border-color: #dc2626;
  color: #b91c1c;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(220, 38, 38, 0.1);
}

.action-btn-delete:active {
  transform: translateY(0);
  box-shadow: none;
}

/* 空状态 */
.empty-state {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
}

.empty-icon {
  width: 80px;
  height: 80px;
  color: #cbd5e1;
  margin-bottom: 24px;
}

.empty-icon svg {
  width: 100%;
  height: 100%;
  stroke-width: 1.5;
}

.empty-text {
  font-size: 16px;
  color: #64748b;
  margin: 0;
}

/* 通知 */
.notification {
  position: fixed;
  bottom: 24px;
  right: 24px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #1f2937;
  color: white;
  border-radius: 8px;
  font-size: 14px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  animation: slideIn 0.3s ease;
}

.notification-icon {
  width: 16px;
  height: 16px;
  color: #10b981;
}

.notification-icon svg {
  width: 100%;
  height: 100%;
  stroke-width: 2.5;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
</style>
