<template>
  <div class="novel-detail-page">
    <!-- 顶部标题栏 -->
    <div class="detail-header">
      <div class="header-left">
        <button class="back-btn" @click="handleBack">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <div class="header-title">
          <h1 class="novel-name">{{ novelDetail?.title || "加载中..." }}</h1>
          <p class="header-subtitle">正在进行文本结构解析预览</p>
        </div>
      </div>
      <button class="confirm-btn" @click="handleConfirm">确认解析结果</button>
    </div>

    <!-- 主要内容区域 -->
    <div class="detail-content">
      <!-- 左侧目录树 -->
      <div class="sidebar">
        <div class="sidebar-header">
          <h2 class="sidebar-title">目录树</h2>
          <button class="add-btn" title="添加章节">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
        </div>
        <div
          ref="chaptersListRef"
          class="chapters-list"
          v-if="!chaptersLoading"
          :style="{ maxHeight: chaptersListMaxHeight + 'px' }"
        >
          <div
            v-for="chapter in chapters"
            :key="chapter.chapterId"
            class="chapter-item"
            :class="{ active: selectedChapterId === chapter.chapterId }"
            @click="handleChapterSelect(chapter)"
          >
            <span class="chapter-dot"></span>
            <span class="chapter-text">
              第{{ chapter.order }}章 {{ chapter.chapterTitle }}
            </span>
          </div>
        </div>
        <div v-else class="chapters-loading">
          <a-spin size="small" />
        </div>
      </div>

      <!-- 右侧内容区域 -->
      <div
        ref="mainContentRef"
        class="main-content"
        :style="{ maxHeight: mainContentMaxHeight + 'px' }"
      >
        <div v-if="contentLoading" class="content-loading">
          <a-spin size="large" />
        </div>
        <div v-else-if="selectedChapter" class="chapter-content">
          <h2 class="chapter-title">{{ selectedChapter.title }}</h2>
          <div class="chapter-text-content">
            <p
              v-for="(paragraph, index) in chapterParagraphs"
              :key="index"
              class="paragraph"
            >
              {{ paragraph }}
            </p>
          </div>
        </div>
        <div v-else class="content-empty">
          <p>请从左侧选择章节查看内容</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Spin, Message } from "@arco-design/web-vue";
import { getNovel, getNovelChapters, getChapter } from "@/api";

const route = useRoute();
const router = useRouter();

const novelDetail = ref(null);
const chapters = ref([]);
const selectedChapterId = ref("");
const selectedChapter = ref(null);
const chaptersLoading = ref(false);
const contentLoading = ref(false);
const chaptersListRef = ref(null);
const chaptersListMaxHeight = ref(0);
const mainContentRef = ref(null);
const mainContentMaxHeight = ref(0);

const novelId = computed(() => route.params.id);

// 将章节内容按段落分割
const chapterParagraphs = computed(() => {
  if (!selectedChapter.value?.content) return [];
  return selectedChapter.value.content
    .split(/\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
});

// 返回
function handleBack() {
  router.back();
}

// 确认解析结果
function handleConfirm() {
  Message.success("解析结果已确认");
  // TODO: 实现确认解析结果的逻辑
}

// 选择章节
async function handleChapterSelect(chapter) {
  selectedChapterId.value = chapter.chapterId;
  contentLoading.value = true;
  try {
    const res = await getChapter(chapter.chapterId);
    if (res.success) {
      selectedChapter.value = res.data;
    } else {
      Message.error(res.message || "获取章节内容失败");
    }
  } catch (error) {
    console.error("获取章节内容失败:", error);
    Message.error(error.message || "获取章节内容失败");
  } finally {
    contentLoading.value = false;
  }
}

// 加载小说详情
async function loadNovelDetail() {
  if (!novelId.value) return;

  try {
    const res = await getNovel(novelId.value);
    if (res.success) {
      novelDetail.value = res.data;
    } else {
      Message.error(res.message || "获取小说详情失败");
    }
  } catch (error) {
    console.error("获取小说详情失败:", error);
    Message.error(error.message || "获取小说详情失败");
  }
}

// 计算章节列表的最大高度
function calculateChaptersListMaxHeight() {
  nextTick(() => {
    if (!chaptersListRef.value) return;

    const sidebar = chaptersListRef.value.closest(".sidebar");
    if (!sidebar) return;

    const sidebarHeader = sidebar.querySelector(".sidebar-header");
    if (!sidebarHeader) return;

    const headerHeight = sidebarHeader.getBoundingClientRect().height;
    const availableHeight =
      window.innerHeight - sidebar.getBoundingClientRect().top - headerHeight;
    chaptersListMaxHeight.value = Math.max(200, availableHeight - 16); // 减去一些 padding
  });
}

// 计算主内容区域的最大高度
function calculateMainContentMaxHeight() {
  nextTick(() => {
    if (!mainContentRef.value) return;

    const detailContent = mainContentRef.value.closest(".detail-content");
    if (!detailContent) return;

    const detailHeader = document.querySelector(".detail-header");
    if (!detailHeader) return;

    const headerHeight = detailHeader.getBoundingClientRect().height;
    const availableHeight =
      window.innerHeight - detailContent.getBoundingClientRect().top;
    mainContentMaxHeight.value = Math.max(400, availableHeight); // 减去一些 padding
  });
}

// 处理窗口大小变化
function handleResize() {
  calculateChaptersListMaxHeight();
  calculateMainContentMaxHeight();
}

// 加载章节列表
async function loadChapters() {
  if (!novelId.value) return;

  chaptersLoading.value = true;
  try {
    const res = await getNovelChapters(novelId.value);
    if (res.success) {
      chapters.value = res.data || [];
      // 默认选择第一章
      if (chapters.value.length > 0) {
        handleChapterSelect(chapters.value[0]);
      }
      // 计算章节列表高度和主内容高度
      calculateChaptersListMaxHeight();
      calculateMainContentMaxHeight();
    } else {
      Message.error(res.message || "获取章节列表失败");
    }
  } catch (error) {
    console.error("获取章节列表失败:", error);
    Message.error(error.message || "获取章节列表失败");
  } finally {
    chaptersLoading.value = false;
  }
}

onMounted(() => {
  loadNovelDetail();
  loadChapters();
  calculateChaptersListMaxHeight();
  calculateMainContentMaxHeight();
  window.addEventListener("resize", handleResize);
});

onUnmounted(() => {
  window.removeEventListener("resize", handleResize);
});
</script>

<style scoped>
.novel-detail-page {
  min-height: 100vh;
  background-color: #f4f7fa;
  display: flex;
  flex-direction: column;
}

/* 顶部标题栏 */
.detail-header {
  background: white;
  border-bottom: 1px solid #e2e8f0;
  padding: 16px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.back-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
  color: #64748b;
}

.back-btn:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
  color: #0f172a;
}

.back-btn svg {
  width: 20px;
  height: 20px;
  stroke-width: 2.5;
}

.header-title {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.novel-name {
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
}

.header-subtitle {
  font-size: 13px;
  color: #64748b;
  margin: 0;
}

.confirm-btn {
  padding: 10px 24px;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.confirm-btn:hover {
  background: #1d4ed8;
}

.confirm-btn:active {
  transform: scale(0.98);
}

/* 主要内容区域 */
.detail-content {
  flex: 1;
  display: flex;
  overflow: hidden;
  min-height: 0;
}

/* 左侧目录树 */
.sidebar {
  width: 280px;
  background: white;
  border-right: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}

.sidebar-header {
  padding: 20px 16px;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sidebar-title {
  font-size: 16px;
  font-weight: 600;
  color: #0f172a;
  margin: 0;
}

.add-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  cursor: pointer;
  color: #64748b;
  transition: all 0.2s;
  border-radius: 4px;
}

.add-btn:hover {
  background: #f8fafc;
  color: #2563eb;
}

.add-btn svg {
  width: 16px;
  height: 16px;
  stroke-width: 2.5;
}

.chapters-list {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 8px;
  min-height: 0;
  /* max-height 通过内联样式动态设置 */
}

.chapters-loading {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.chapter-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 4px;
}

.chapter-item:hover {
  background: #f8fafc;
}

.chapter-item.active {
  background: #eff6ff;
  color: #2563eb;
}

.chapter-item.active .chapter-dot {
  background: #2563eb;
}

.chapter-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #cbd5e1;
  flex-shrink: 0;
  transition: background 0.2s;
}

.chapter-text {
  font-size: 14px;
  color: #475569;
  line-height: 1.5;
}

.chapter-item.active .chapter-text {
  color: #2563eb;
  font-weight: 500;
}

/* 右侧内容区域 */
.main-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  background: white;
  padding: 40px;
  min-height: 0;
  /* max-height 通过内联样式动态设置 */
}

.content-loading,
.content-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  color: #64748b;
}

.chapter-content {
  max-width: 800px;
  margin: 0 auto;
}

.chapter-title {
  font-size: 32px;
  font-weight: 700;
  color: #0f172a;
  text-align: center;
  margin: 0 0 40px 0;
}

.chapter-text-content {
  line-height: 1.8;
  color: #1e293b;
  font-size: 16px;
}

.paragraph {
  margin: 0 0 20px 0;
  text-align: left;
}

.paragraph:last-child {
  margin-bottom: 0;
}

/* 滚动条样式 */
.chapters-list::-webkit-scrollbar,
.main-content::-webkit-scrollbar {
  width: 8px;
}

.chapters-list::-webkit-scrollbar-track,
.main-content::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 4px;
}

.chapters-list::-webkit-scrollbar-thumb,
.main-content::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

.chapters-list::-webkit-scrollbar-thumb:hover,
.main-content::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>
