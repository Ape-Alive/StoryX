<template>
  <a-modal
    :visible="visible"
    title="小说详情"
    :footer="false"
    width="800px"
    @cancel="handleClose"
    @update:visible="handleVisibleChange"
  >
    <div v-if="loading" class="detail-loading">
      <a-spin size="large" />
    </div>
    <div v-else-if="novelDetail" class="novel-detail">
      <!-- 封面和基本信息 -->
      <div class="detail-header">
        <div class="detail-cover">
          <img v-if="novelDetail.coverUrl" :src="novelDetail.coverUrl" :alt="novelDetail.title" />
          <div v-else class="cover-placeholder">
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
        </div>
        <div class="detail-info">
          <h2 class="detail-title">{{ novelDetail.title || "未知标题" }}</h2>
          <div class="detail-meta">
            <div class="meta-item">
              <span class="meta-label">作者：</span>
              <span class="meta-value">{{ novelDetail.author || "未知作者" }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">章节数：</span>
              <span class="meta-value">{{ novelDetail.totalChapters || 0 }} 章</span>
            </div>
            <div v-if="novelDetail.tags && novelDetail.tags.length > 0" class="meta-item">
              <span class="meta-label">标签：</span>
              <div class="tags">
                <span v-for="tag in novelDetail.tags" :key="tag" class="tag">{{ tag }}</span>
              </div>
            </div>
          </div>
          <div v-if="novelDetail.summary" class="detail-summary">
            <h3 class="summary-title">简介</h3>
            <p class="summary-content">{{ novelDetail.summary }}</p>
          </div>
        </div>
      </div>

      <!-- 章节列表 -->
      <div v-if="chapters.length > 0" class="chapters-section">
        <h3 class="section-title">章节列表</h3>
        <div class="chapters-list">
          <div
            v-for="chapter in chapters"
            :key="chapter.chapterId"
            class="chapter-item"
            @click="handleChapterClick(chapter)"
          >
            <span class="chapter-order">第 {{ chapter.order }} 章</span>
            <span class="chapter-title">{{ chapter.chapterTitle }}</span>
            <span class="chapter-words">{{ chapter.wordCount || 0 }} 字</span>
          </div>
        </div>
      </div>
    </div>
  </a-modal>
</template>

<script setup>
import { ref, watch } from "vue";
import { Spin, Message } from "@arco-design/web-vue";
import { getNovel, getNovelChapters } from "@/api";

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  novelId: {
    type: String,
    default: "",
  },
});

const emit = defineEmits(["update:visible"]);

const loading = ref(false);
const novelDetail = ref(null);
const chapters = ref([]);

// 加载小说详情
async function loadNovelDetail() {
  if (!props.novelId) {
    return;
  }

  loading.value = true;
  try {
    const res = await getNovel(props.novelId);
    if (res.success) {
      novelDetail.value = res.data;
    } else {
      Message.error(res.message || "获取小说详情失败");
    }
  } catch (error) {
    console.error("获取小说详情失败:", error);
    Message.error(error.message || "获取小说详情失败");
  } finally {
    loading.value = false;
  }
}

// 加载章节列表
async function loadChapters() {
  if (!props.novelId) {
    return;
  }

  try {
    const res = await getNovelChapters(props.novelId);
    if (res.success) {
      chapters.value = res.data || [];
    }
  } catch (error) {
    console.error("获取章节列表失败:", error);
  }
}

// 点击章节
function handleChapterClick(chapter) {
  // 这里可以实现查看章节内容的逻辑
  Message.info(`查看章节：${chapter.chapterTitle}`);
}

// 关闭弹窗
function handleClose() {
  emit("update:visible", false);
  novelDetail.value = null;
  chapters.value = [];
}

// 处理 visible 变化
function handleVisibleChange(value) {
  emit("update:visible", value);
  if (!value) {
    novelDetail.value = null;
    chapters.value = [];
  }
}

// 监听 visible 和 novelId 变化
watch(
  () => [props.visible, props.novelId],
  ([newVisible, newNovelId]) => {
    if (newVisible && newNovelId) {
      loadNovelDetail();
      loadChapters();
    }
  },
  { immediate: true }
);
</script>

<style scoped>
.detail-loading {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}

.novel-detail {
  padding: 8px 0;
}

.detail-header {
  display: flex;
  gap: 24px;
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid #e2e8f0;
}

.detail-cover {
  flex-shrink: 0;
  width: 160px;
  height: 220px;
  border-radius: 8px;
  overflow: hidden;
  background: #f1f5f9;
}

.detail-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
}

.cover-placeholder svg {
  width: 64px;
  height: 64px;
  stroke-width: 1.5;
}

.detail-info {
  flex: 1;
}

.detail-title {
  font-size: 24px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 16px 0;
}

.detail-meta {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.meta-label {
  font-size: 14px;
  color: #64748b;
  font-weight: 500;
}

.meta-value {
  font-size: 14px;
  color: #0f172a;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag {
  padding: 4px 12px;
  background: #eff6ff;
  color: #2563eb;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.detail-summary {
  margin-top: 16px;
}

.summary-title {
  font-size: 16px;
  font-weight: 600;
  color: #0f172a;
  margin: 0 0 8px 0;
}

.summary-content {
  font-size: 14px;
  color: #475569;
  line-height: 1.6;
  margin: 0;
}

.chapters-section {
  margin-top: 24px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #0f172a;
  margin: 0 0 16px 0;
}

.chapters-list {
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 8px;
}

.chapter-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.chapter-item:hover {
  background: #f8fafc;
}

.chapter-order {
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
  min-width: 60px;
}

.chapter-title {
  flex: 1;
  font-size: 14px;
  color: #0f172a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chapter-words {
  font-size: 12px;
  color: #94a3b8;
  min-width: 60px;
  text-align: right;
}

/* 章节列表滚动条 */
.chapters-list::-webkit-scrollbar {
  width: 8px;
}

.chapters-list::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 4px;
}

.chapters-list::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

.chapters-list::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>

