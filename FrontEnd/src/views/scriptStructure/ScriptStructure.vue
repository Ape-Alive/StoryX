<template>
  <div class="script-structure-page">
    <!-- 顶部导航栏 -->
    <div class="page-header">
      <div class="header-left">
        <div class="breadcrumb">
          <!-- 小说选择下拉菜单 -->
          <NovelSelector
            :value="novelId"
            :title="novelTitle"
            @change="handleNovelSelect"
          />
          <span class="separator">></span>
          <span class="current-page">剧本结构化</span>
        </div>
      </div>
      <div class="header-right">
        <div class="storage-node">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M12 1v6m0 6v6M1 12h6m6 0h6"></path>
          </svg>
          <span>存储节点:华东1-可用</span>
        </div>
        <button class="export-btn" @click="handleExport">导出结构化文档</button>
      </div>
    </div>

    <!-- 主要内容区域 -->
    <div class="main-content">
      <!-- 左侧任务中心 -->
      <aside class="task-center">
        <div class="task-center-header">
          <h3>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              class="task-icon"
            >
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
            </svg>
            任务中心
          </h3>
          <button
            class="add-task-btn"
            @click="activeStep = 'config'"
            title="新建任务"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
        </div>
        <div class="task-list" v-if="!batchesLoading">
          <div
            v-for="batch in batches"
            :key="batch.batchId"
            class="task-item"
            :class="{
              active:
                selectedBatchId === batch.batchId ||
                (activeStep === 'processing' &&
                  batch.status === 'processing') ||
                (activeStep === 'detail' && batch.batchId === selectedBatchId),
            }"
            @click="handleBatchSelect(batch)"
          >
            <div class="task-header">
              <span class="task-id">{{ batch.jobId }}</span>
              <span
                class="task-status"
                :class="{
                  completed: batch.status === 'completed',
                  processing: batch.status === 'processing',
                  pending: batch.status === 'pending',
                  failed: batch.status === 'failed',
                }"
              >
                {{ getStatusText(batch.status) }}
              </span>
            </div>
            <div class="task-name">{{ batch.taskName }}</div>
            <div class="task-progress">
              <div class="progress-info">
                <span class="progress-label">处理进度</span>
                <span class="progress-text">{{ batch.progress }}%</span>
              </div>
              <div class="progress-bar">
                <div
                  class="progress-fill"
                  :class="{
                    completed: batch.status === 'completed',
                    processing: batch.status === 'processing',
                  }"
                  :style="{ width: batch.progress + '%' }"
                ></div>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="task-loading">
          <a-spin size="small" />
        </div>
      </aside>

      <!-- 右侧工作台 -->
      <section class="content-area">
        <!-- 步骤一：配置任务 -->
        <div v-if="activeStep === 'config'" class="config-view">
          <div class="config-container">
            <div class="config-header">
              <h2>配置结构化任务</h2>
              <p>系统将基于小说内容，利用 AI 自动拆解场景、台词与镜头描述。</p>
            </div>

            <div class="config-body">
              <div class="config-left">
                <!-- 选择处理章节 -->
                <div class="config-section chapter-selection">
                  <label class="config-label">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                      <path
                        d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"
                      ></path>
                    </svg>
                    选择处理章节
                  </label>

                  <!-- 章节列表 -->
                  <div
                    class="chapter-list-container"
                    ref="chapterListContainerRef"
                  >
                    <div class="chapter-list-header">
                      <span class="selection-count"
                        >已选 {{ selectedChapterIds.length }}/{{
                          chapters.length
                        }}</span
                      >
                      <button
                        @click="handleSelectAllChapters"
                        class="select-all-btn"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2"
                        >
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        全部全选
                      </button>
                    </div>

                    <div
                      class="chapter-list"
                      ref="chapterListRef"
                      :style="{ maxHeight: chapterListMaxHeight + 'px' }"
                      v-if="!chaptersLoading"
                    >
                      <div
                        v-for="chapter in chapters"
                        :key="chapter.id || chapter.chapterId"
                        class="chapter-item"
                        @click="handleChapterToggle(chapter)"
                      >
                        <input
                          type="checkbox"
                          :checked="isChapterSelected(chapter)"
                          @change.stop="handleChapterToggle(chapter)"
                          class="chapter-checkbox"
                        />
                        <div class="chapter-info">
                          <div class="chapter-title">
                            第
                            {{ chapter.chapterNumber || chapter.number || 0 }}
                            章
                            {{ chapter.chapterTitle || "未命名章节" }}
                          </div>
                          <div class="chapter-word-count">
                            {{ chapter.wordCount || 0 }}字
                          </div>
                        </div>
                      </div>
                    </div>
                    <div v-else class="chapter-loading">
                      <a-spin size="small" />
                    </div>
                  </div>
                </div>
              </div>

              <div class="config-right">
                <div class="config-panel">
                  <label class="config-label">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <circle cx="12" cy="12" r="3"></circle>
                      <path d="M12 1v6m0 6v6M1 12h6m6 0h6"></path>
                    </svg>
                    并发策略配置
                  </label>

                  <!-- 处理模式 -->
                  <div class="panel-section">
                    <div class="section-label">处理模式</div>
                    <div class="mode-buttons">
                      <button
                        @click="config.taskType = 'by_chapters'"
                        :class="[
                          'mode-btn',
                          { active: config.taskType === 'by_chapters' },
                        ]"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2"
                        >
                          <line x1="4" y1="7" x2="20" y2="7"></line>
                          <line x1="4" y1="12" x2="20" y2="12"></line>
                          <line x1="4" y1="17" x2="20" y2="17"></line>
                        </svg>
                        按章节并发
                      </button>
                      <button
                        @click="config.taskType = 'by_words'"
                        :class="[
                          'mode-btn',
                          { active: config.taskType === 'by_words' },
                        ]"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2"
                        >
                          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                          <path
                            d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"
                          ></path>
                        </svg>
                        按字数并发
                      </button>
                    </div>
                  </div>

                  <div class="panel-divider"></div>

                  <!-- 并发节点数 -->
                  <div class="panel-section">
                    <div class="section-header">
                      <span class="section-label">并发节点数</span>
                      <span class="section-value"
                        >{{ config.concurrency }} Nodes</span
                      >
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="16"
                      step="1"
                      v-model.number="config.concurrency"
                      class="concurrency-slider"
                    />
                  </div>

                  <div class="panel-divider"></div>

                  <!-- 并发阈值 -->
                  <div class="panel-section">
                    <div class="section-label">
                      {{
                        config.taskType === "by_chapters"
                          ? "单次处理章节数"
                          : "单次处理字数"
                      }}
                    </div>
                    <input
                      type="number"
                      class="setting-input"
                      :value="
                        config.taskType === 'by_chapters'
                          ? config.chaptersPerTask
                          : config.wordsPerTask
                      "
                      @input="
                        (e) => {
                          const value = parseInt(e.target.value) || 1;
                          if (config.taskType === 'by_chapters') {
                            config.chaptersPerTask = value;
                          } else {
                            config.wordsPerTask = value;
                          }
                        }
                      "
                      :min="1"
                    />
                  </div>

                  <div class="panel-divider"></div>

                  <!-- 跳过重叠任务 -->
                  <div class="panel-section">
                    <div class="switch-setting">
                      <div class="switch-label-group">
                        <span class="section-label">跳过重叠任务</span>
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2"
                          class="info-icon"
                        >
                          <circle cx="12" cy="12" r="10"></circle>
                          <line x1="12" y1="16" x2="12" y2="12"></line>
                          <line x1="12" y1="8" x2="12.01" y2="8"></line>
                        </svg>
                      </div>
                      <label class="switch">
                        <input
                          type="checkbox"
                          v-model="config.skipOverlapping"
                        />
                        <span class="slider"></span>
                      </label>
                    </div>
                  </div>

                  <!-- 信息提示 -->
                  <div class="panel-info">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="16" x2="12" y2="12"></line>
                      <line x1="12" y1="8" x2="12.01" y2="8"></line>
                    </svg>
                    <span
                      >已选章节预计消耗 {{ estimatedTokenUnits }} 个 Token
                      单元。系统将自动分配至并发节点。</span
                    >
                  </div>
                </div>
              </div>
            </div>

            <div class="config-footer">
              <div class="footer-status">
                <span class="status-item">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <polygon
                      points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"
                    ></polygon>
                  </svg>
                  高性能引擎已就绪
                </span>
                <span class="status-item">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  内容解析无误
                </span>
              </div>
              <button
                @click="handleStartTask"
                :disabled="isStarting || !novelId"
                class="start-btn"
              >
                <svg
                  v-if="!isStarting"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
                <a-spin v-else size="small" />
                开始结构化处理
              </button>
            </div>
          </div>
        </div>

        <!-- 步骤二：并发监控 -->
        <div v-if="activeStep === 'processing'" class="processing-view">
          <header class="processing-header">
            <div>
              <h2>任务执行监控</h2>
              <p>
                正在并行处理 {{ novelTitle }}
                {{
                  processingRange ||
                  (selectedBatch ? selectedBatch.taskName : "")
                }}
              </p>
            </div>
            <div class="processing-stats">
              <div class="stat-item">
                <div class="stat-label">总体进度</div>
                <div class="stat-value">{{ overallProgress }}%</div>
              </div>
              <div class="stat-item">
                <div class="stat-label">预估剩余</div>
                <div class="stat-value">{{ estimatedTime }}</div>
              </div>
            </div>
          </header>

          <!-- 并发节点看板 -->
          <div class="nodes-grid">
            <div
              v-for="(node, index) in processingNodes"
              :key="index"
              class="node-card"
            >
              <div class="node-header">
                <div class="node-status">
                  <div
                    :class="[
                      'status-dot',
                      {
                        completed: node.status === 'completed',
                        processing: node.status === 'processing',
                        waiting: node.status === 'waiting',
                      },
                    ]"
                  ></div>
                  <span class="node-id"
                    >NODE-{{ String(index + 1).padStart(2, "0") }}</span
                  >
                </div>
                <span class="node-state">{{
                  getNodeStateText(node.status)
                }}</span>
              </div>
              <div class="node-title">{{ node.title }}</div>
              <div class="node-progress-bar">
                <div
                  :class="[
                    'node-progress-fill',
                    {
                      completed: node.status === 'completed',
                      processing: node.status === 'processing',
                    },
                  ]"
                  :style="{ width: node.progress + '%' }"
                ></div>
              </div>
            </div>
          </div>

          <!-- 实时产出流 -->
          <div class="output-stream">
            <div class="stream-header">
              <h4>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <path d="M4 4h16v16H4z"></path>
                </svg>
                实时产出流 (Output Stream)
              </h4>
              <button class="stream-control">暂停滚动</button>
            </div>
            <div class="stream-content">
              <div
                v-for="(log, index) in outputLogs"
                :key="index"
                :class="['stream-line', log.type]"
              >
                {{ log.message }}
              </div>
            </div>
          </div>
        </div>

        <!-- 步骤三：产出预览 -->
        <div v-if="activeStep === 'detail'" class="detail-view">
          <!-- 状态横幅 -->
          <div
            v-if="selectedBatch && selectedBatch.status === 'completed'"
            class="status-banner completed"
          >
            <div class="status-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <div class="status-info">
              <div class="status-title">{{ novelTitle }} 结构化已完成</div>
              <div class="status-details">
                解析深度:{{ analysisDepth }}% | 共生成{{
                  totalScenes
                }}个独立场景
              </div>
            </div>
            <div class="status-actions">
              <button class="action-btn secondary" @click="handleDataAnalysis">
                数据分析
              </button>
              <button
                class="action-btn primary"
                @click="handleEnterCharacterModeling"
              >
                进入角色建模
              </button>
            </div>
          </div>

          <!-- 场景卡片网格 -->
          <div v-if="scenes.length > 0" class="scenes-grid">
            <div
              v-for="scene in scenes"
              :key="scene.sceneId"
              class="scene-card"
              @click="handleSceneClick(scene)"
            >
              <div class="scene-header">
                <span class="scene-number">{{ scene.sceneNumber }}</span>
                <div class="scene-menu">
                  <span class="menu-dot"></span>
                  <span class="menu-dot"></span>
                  <span class="menu-dot"></span>
                </div>
              </div>
              <div class="scene-body">
                <h5 class="scene-title">{{ scene.title }}</h5>
                <p class="scene-description">{{ scene.description }}</p>
                <div class="scene-footer">
                  <div class="scene-info">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    <span>{{ scene.duration }}s</span>
                  </div>
                  <div class="scene-info">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <rect
                        x="2"
                        y="3"
                        width="20"
                        height="14"
                        rx="2"
                        ry="2"
                      ></rect>
                      <line x1="8" y1="21" x2="16" y2="21"></line>
                      <line x1="12" y1="17" x2="12" y2="21"></line>
                    </svg>
                    <span>{{ scene.shotsCount }} 镜头</span>
                  </div>
                  <span class="dialogue-count"
                    >台词: {{ scene.dialogueCount }}</span
                  >
                </div>
              </div>
            </div>
          </div>

          <!-- 空状态 -->
          <div
            v-else-if="!batchDetailLoading && selectedBatch"
            class="empty-state"
          >
            <p>暂无场景数据</p>
          </div>

          <!-- 加载状态 -->
          <div v-if="batchDetailLoading" class="loading-state">
            <a-spin size="large" />
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from "vue";
import { useRouter } from "vue-router";
import { Spin, Message } from "@arco-design/web-vue";
import { getLocalStorage } from "@/utils/storage";
import {
  getScriptBatches,
  getBatchDetail,
  getNovel,
  getNovelChapters,
  generateScript,
} from "@/api";
import NovelSelector from "@/components/NovelSelector.vue";

const router = useRouter();

const projectId = computed(() => getLocalStorage("currentProjectId", ""));
const novelId = ref("");
const novelTitle = ref("");
const activeStep = ref("config"); // config, processing, detail
const batches = ref([]);
const batchesLoading = ref(false);
const selectedBatchId = ref("");
const selectedBatch = ref(null);
const batchDetail = ref(null);
const batchDetailLoading = ref(false);
const scenes = ref([]);
const analysisDepth = ref(95);
const totalScenes = ref(0);
const totalChapters = ref(0);
const isStarting = ref(false);
const processingRange = ref("");
const chapters = ref([]);
const chaptersLoading = ref(false);
const selectedChapterIds = ref([]);
const chapterListRef = ref(null);
const chapterListContainerRef = ref(null);
const chapterListMaxHeight = ref(400);
let resizeObserver = null;

// 配置项
const config = ref({
  taskType: "by_chapters", // by_chapters, by_words
  concurrency: 6,
  chaptersPerTask: 5,
  wordsPerTask: 4000,
  skipOverlapping: false,
});

// 监控相关
const processingNodes = ref([]);
const overallProgress = ref(0);
const estimatedTime = ref("03:45");
const outputLogs = ref([]);

// 计算预计Token单元
const estimatedTokenUnits = computed(() => {
  if (selectedChapterIds.value.length === 0) return 0;
  // 简单估算：每个章节约消耗一定Token，这里可以根据实际情况调整
  return selectedChapterIds.value.length * 100;
});

// 选择小说
async function selectNovel(novel) {
  novelId.value = novel.id || novel.novelId;
  novelTitle.value = novel.title || novel.novelTitle || "未知小说";

  // 加载小说详情获取完整标题
  if (novelId.value) {
    try {
      const novelRes = await getNovel(novelId.value);
      if (novelRes.success && novelRes.data) {
        novelTitle.value = novelRes.data.title || novelTitle.value;
      }

      // 加载章节列表
      await loadChapters();
    } catch (error) {
      console.error("加载小说详情失败:", error);
    }
  }

  // 重置到配置页面
  activeStep.value = "config";

  // 加载批次列表
  await loadBatches();
}

// 刷新当前小说信息
async function refreshCurrentNovel() {
  if (!novelId.value) return;

  try {
    const novelRes = await getNovel(novelId.value);
    if (novelRes.success && novelRes.data) {
      novelTitle.value = novelRes.data.title || novelTitle.value;
    }

    // 加载章节列表
    await loadChapters();
  } catch (error) {
    console.error("刷新小说信息失败:", error);
  }
}

// 处理小说选择
function handleNovelSelect(novel) {
  selectNovel(novel);
}

// 加载批次列表
async function loadBatches() {
  if (!novelId.value) return;

  batchesLoading.value = true;
  try {
    const response = await getScriptBatches(novelId.value);
    if (response.success && response.data) {
      batches.value = response.data;

      // 如果有进行中的批次，切换到监控视图
      const processingBatch = batches.value.find(
        (b) => b.status === "processing"
      );
      if (processingBatch && activeStep.value !== "config") {
        selectedBatchId.value = processingBatch.batchId;
        activeStep.value = "processing";
        await loadBatchDetail(processingBatch.batchId);
      } else if (activeStep.value !== "config") {
        // 自动选择第一个已完成的批次
        const completedBatch = batches.value.find(
          (b) => b.status === "completed"
        );
        if (completedBatch) {
          selectedBatchId.value = completedBatch.batchId;
          activeStep.value = "detail";
          await loadBatchDetail(completedBatch.batchId);
        }
      }
    }
  } catch (error) {
    console.error("加载批次列表失败:", error);
    Message.error("加载批次列表失败");
  } finally {
    batchesLoading.value = false;
  }
}

// 加载批次详情
async function loadBatchDetail(batchId) {
  if (!batchId) return;

  batchDetailLoading.value = true;
  try {
    const response = await getBatchDetail(batchId);
    if (response.success && response.data) {
      batchDetail.value = response.data;
      selectedBatch.value = response.data;

      // 如果是进行中状态，更新监控数据
      if (
        response.data.status === "processing" &&
        activeStep.value === "processing"
      ) {
        updateProcessingView(response.data);
      }

      // 提取场景信息
      if (response.data.tasks && response.data.tasks.length > 0) {
        const allScenes = [];
        response.data.tasks.forEach((task) => {
          if (task.statistics && task.statistics.scenes) {
            allScenes.push(...task.statistics.scenes);
          }
        });
        scenes.value = allScenes;
        totalScenes.value = allScenes.length;
      }
    }
  } catch (error) {
    console.error("加载批次详情失败:", error);
    Message.error("加载批次详情失败");
  } finally {
    batchDetailLoading.value = false;
  }
}

// 更新监控视图
function updateProcessingView(batchData) {
  overallProgress.value = batchData.progress || 0;

  if (batchData.tasks && batchData.tasks.length > 0) {
    processingNodes.value = batchData.tasks.map((task, index) => ({
      status:
        task.status === "completed"
          ? "completed"
          : task.status === "processing"
          ? "processing"
          : task.status === "pending"
          ? "waiting"
          : "waiting",
      title: task.chapterRange || `第 ${index * 5 + 1} - ${(index + 1) * 5} 章`,
      progress: task.progress || 0,
    }));

    // 生成模拟输出日志
    generateOutputLogs(batchData);
  }
}

// 生成输出日志
function generateOutputLogs(batchData) {
  if (!batchData.tasks) {
    // 如果没有任务数据，添加默认日志
    outputLogs.value = [
      {
        type: "info",
        message: '{ "status": "initializing", "message": "正在初始化任务..." }',
      },
    ];
    return;
  }

  const logs = [];
  batchData.tasks.forEach((task) => {
    if (
      task.statistics &&
      task.statistics.scenes &&
      task.statistics.scenes.length > 0
    ) {
      task.statistics.scenes.slice(0, 3).forEach((scene) => {
        const sceneId = scene.sceneId || "";
        logs.push({
          type: "success",
          message: `{ "scene_id": "${sceneId.slice(
            0,
            8
          )}...", "status": "extracted", "title": "${
            scene.title || "未知场景"
          }" }`,
        });
      });
    }
  });

  // 添加处理中的日志
  const processingTasks = batchData.tasks.filter(
    (t) => t.status === "processing"
  );
  if (processingTasks.length > 0) {
    logs.push({
      type: "info",
      message: `{ "node_id": "NODE-${String(
        processingTasks[0].taskId || "01"
      ).slice(-2)}", "action": "Analyzing Chapter..." }`,
    });
  }

  // 如果没有日志，添加默认日志
  if (logs.length === 0) {
    logs.push({
      type: "processing",
      message: '{ "status": "processing", "message": "任务处理中，请稍候..." }',
    });
  }

  outputLogs.value = logs.slice(-10); // 只显示最后10条
}

// 选择批次
async function handleBatchSelect(batch) {
  selectedBatchId.value = batch.batchId;

  if (batch.status === "processing") {
    activeStep.value = "processing";
    await loadBatchDetail(batch.batchId);
  } else if (batch.status === "completed") {
    activeStep.value = "detail";
    await loadBatchDetail(batch.batchId);
  } else {
    await loadBatchDetail(batch.batchId);
  }
}

// 加载章节列表
async function loadChapters() {
  if (!novelId.value) return;

  chaptersLoading.value = true;
  try {
    const response = await getNovelChapters(novelId.value);
    if (response.success && response.data) {
      chapters.value = response.data || [];
      totalChapters.value = chapters.value.length;
      // 默认不选择任何章节
      selectedChapterIds.value = [];

      // 等待 DOM 更新后重新计算高度
      nextTick(() => {
        setTimeout(() => {
          calculateChapterListMaxHeight();
        }, 200);
      });
    }
  } catch (error) {
    console.error("加载章节列表失败:", error);
    Message.error("加载章节列表失败");
  } finally {
    chaptersLoading.value = false;
  }
}

// 检查章节是否被选中
function isChapterSelected(chapter) {
  const chapterId = chapter.id || chapter.chapterId;
  return selectedChapterIds.value.includes(chapterId);
}

// 切换章节选择
function handleChapterToggle(chapter) {
  const chapterId = chapter.id || chapter.chapterId;
  const index = selectedChapterIds.value.indexOf(chapterId);
  if (index > -1) {
    selectedChapterIds.value.splice(index, 1);
  } else {
    selectedChapterIds.value.push(chapterId);
  }
}

// 全选/取消全选
function handleSelectAllChapters() {
  if (selectedChapterIds.value.length === chapters.value.length) {
    selectedChapterIds.value = [];
  } else {
    selectedChapterIds.value = chapters.value.map(
      (ch) => ch.id || ch.chapterId
    );
  }
}

// 启动任务
async function handleStartTask() {
  if (!novelId.value || !projectId.value) {
    Message.warning("请先选择小说");
    return;
  }

  if (selectedChapterIds.value.length === 0) {
    Message.warning("请至少选择一个章节");
    return;
  }

  isStarting.value = true;
  try {
    const requestData = {
      projectId: projectId.value,
      selectedChapterIds: selectedChapterIds.value,
      taskType: config.value.taskType,
      chaptersPerTask: config.value.chaptersPerTask,
      wordsPerTask: config.value.wordsPerTask,
      skipOverlapping: config.value.skipOverlapping,
    };

    const response = await generateScript(novelId.value, requestData);
    if (response.success && response.data) {
      Message.success("任务已启动");

      // 切换到监控视图
      activeStep.value = "processing";

      // 设置处理范围文本
      const selectedCount = selectedChapterIds.value.length;
      if (selectedCount === chapters.value.length) {
        processingRange.value = "全本";
      } else {
        processingRange.value = `已选 ${selectedCount} 章`;
      }

      // 重新加载批次列表
      await loadBatches();
    }
  } catch (error) {
    console.error("启动任务失败:", error);
    Message.error(error.message || "启动任务失败");
  } finally {
    isStarting.value = false;
  }
}

// 获取状态文本
function getStatusText(status) {
  const statusMap = {
    pending: "待处理",
    processing: "进行中",
    completed: "已完成",
    failed: "失败",
  };
  return statusMap[status] || status;
}

// 获取节点状态文本
function getNodeStateText(status) {
  const statusMap = {
    completed: "Completed",
    processing: "Processing",
    waiting: "Waiting",
  };
  return statusMap[status] || status;
}

// 导出结构化文档
function handleExport() {
  Message.info("导出功能开发中...");
}

// 数据分析
function handleDataAnalysis() {
  Message.info("数据分析功能开发中...");
}

// 进入角色建模
function handleEnterCharacterModeling() {
  router.push("/project/character-modeling");
}

// 点击场景卡片
function handleSceneClick(scene) {
  console.log("点击场景:", scene);
}

// 点击外部关闭下拉菜单

// 计算章节列表的最大高度
function calculateChapterListMaxHeight() {
  const container = chapterListContainerRef.value;
  if (!container) return;

  const header = container.querySelector(".chapter-list-header");
  if (!header) return;

  // 获取容器高度和头部高度
  const containerHeight = container.clientHeight;
  const headerHeight = header.offsetHeight;

  // 计算可用高度（容器高度 - 头部高度）
  const availableHeight = containerHeight - headerHeight;

  if (availableHeight > 0) {
    chapterListMaxHeight.value = availableHeight;
  }
}

// 窗口 resize 处理函数
function handleWindowResize() {
  calculateChapterListMaxHeight();
}

onMounted(() => {
  // 使用 ResizeObserver 监听容器大小变化
  nextTick(() => {
    setupResizeObserver();
    // 初始计算
    setTimeout(() => {
      calculateChapterListMaxHeight();
    }, 300);
  });

  // 也监听窗口大小变化
  window.addEventListener("resize", handleWindowResize);
});

// 设置 ResizeObserver
function setupResizeObserver() {
  // 清理旧的 observer
  if (resizeObserver && chapterListContainerRef.value) {
    resizeObserver.unobserve(chapterListContainerRef.value);
    resizeObserver.disconnect();
  }

  if (chapterListContainerRef.value) {
    resizeObserver = new ResizeObserver(() => {
      calculateChapterListMaxHeight();
    });
    resizeObserver.observe(chapterListContainerRef.value);
  }
}

onUnmounted(() => {
  window.removeEventListener("resize", handleWindowResize);
  if (resizeObserver) {
    if (chapterListContainerRef.value) {
      resizeObserver.unobserve(chapterListContainerRef.value);
    }
    resizeObserver.disconnect();
  }
});

// 监听配置视图的显示，重新计算高度
watch(
  () => activeStep.value,
  (newStep) => {
    if (newStep === "config") {
      nextTick(() => {
        setupResizeObserver();
        setTimeout(() => {
          calculateChapterListMaxHeight();
        }, 200);
      });
    }
  }
);

// 定期刷新进行中的批次
let refreshTimer = null;
watch(
  () => [batches.value, activeStep.value],
  ([newBatches, step]) => {
    const hasProcessing = newBatches.some((b) => b.status === "processing");

    if (hasProcessing && !refreshTimer) {
      refreshTimer = setInterval(() => {
        loadBatches();
      }, 5000);
    } else if (!hasProcessing && refreshTimer) {
      clearInterval(refreshTimer);
      refreshTimer = null;
    }
  },
  { immediate: true }
);

// 清理定时器
onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer);
  }
});
</script>

<style scoped>
.script-structure-page {
  min-height: 100vh;
  background-color: #fff;
  display: flex;
  flex-direction: column;
}

/* 顶部导航栏 */
.page-header {
  /* position: fixed;
  top: 0;
  left: 0;
  right: 0; */
  height: 78px;
  background: white;
  border-bottom: 1px solid #e2e8f0;
  padding: 0 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 30;
}

.header-left {
  flex: 1;
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

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.storage-node {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #64748b;
  padding-right: 16px;
  border-right: 1px solid #e2e8f0;
}

.storage-node svg {
  width: 14px;
  height: 14px;
}

.export-btn {
  background: #0f172a;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.export-btn:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* 主要内容区域 */
.main-content {
  flex: 1;
  display: flex;
  gap: 14px;
  padding: 24px;
  /* margin-top: 56px; */
  overflow: hidden;
}

/* 左侧任务中心 */
.task-center {
  width: 320px;
  background: white;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;
}

.task-center-header {
  padding: 16px;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.task-center-header h3 {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.task-icon {
  width: 16px;
  height: 16px;
  color: #2563eb;
}

.add-task-btn {
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.add-task-btn:hover {
  background: #f1f5f9;
  color: #2563eb;
}

.add-task-btn svg {
  width: 16px;
  height: 16px;
}

.task-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.task-item {
  padding: 16px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  background: white;
}

.task-item:hover {
  border-color: #2563eb;
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.1);
}

.task-item.active {
  border-color: #2563eb;
  background: #eff6ff;
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.task-id {
  font-size: 10px;
  font-weight: 600;
  font-family: monospace;
  color: #64748b;
}

.task-status {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

.task-status.completed {
  background: #dcfce7;
  color: #16a34a;
}

.task-status.processing {
  background: #dbeafe;
  color: #2563eb;
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.task-status.pending {
  background: #f3f4f6;
  color: #6b7280;
}

.task-status.failed {
  background: #fee2e2;
  color: #dc2626;
}

.task-name {
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-progress {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: #64748b;
}

.progress-label {
  font-weight: 500;
}

.progress-text {
  font-weight: 700;
}

.progress-bar {
  width: 100%;
  height: 6px;
  background: #f1f5f9;
  border-radius: 999px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.5s;
}

.progress-fill.completed {
  background: #16a34a;
}

.progress-fill.processing {
  background: #2563eb;
}

.task-loading {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px;
}

/* 右侧工作台 */
.content-area {
  flex: 1;
  overflow-y: auto;
  background: #fff;
}

/* 配置视图 */
.config-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  /* padding: 24px; */
}

.config-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: white;
  border-radius: 24px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1),
    0 10px 10px -5px rgba(0, 0, 0, 0.04);
  overflow: hidden;
}

.config-header {
  flex-shrink: 0;
  padding: 32px;
  border-bottom: 1px solid #f1f5f9;
  background: #f8fafc;
}

.config-header h2 {
  font-size: 24px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 8px 0;
  letter-spacing: -0.025em;
}

.config-header p {
  font-size: 14px;
  color: #64748b;
  margin: 0;
}

.config-body {
  flex: 1;
  min-height: 0;
  padding: 32px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 40px;
  overflow: hidden;
  align-items: stretch;
}

.config-body > * {
  min-height: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.config-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
  height: 100%;
}

/* 章节选择区域 */
.chapter-selection {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
}

.chapter-list-container {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 500px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: white;
  overflow: hidden;
}

.chapter-list-header {
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #f1f5f9;
  background: #fff;
}

.selection-count {
  font-size: 12px;
  font-weight: 600;
  color: #475569;
}

.select-all-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border: none;
  background: #2563eb;
  color: white;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.select-all-btn:hover {
  background: #1d4ed8;
}

.select-all-btn svg {
  width: 12px;
  height: 12px;
}

.chapter-list {
  overflow-y: auto;
  overflow-x: hidden;
  padding: 8px;
}

.chapter-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.chapter-item:hover {
  background: #f8fafc;
}

.chapter-checkbox {
  width: 18px;
  height: 18px;
  margin-top: 2px;
  cursor: pointer;
  accent-color: #2563eb;
}

.chapter-info {
  flex: 1;
  min-width: 0;
}

.chapter-title {
  font-size: 14px;
  font-weight: 500;
  color: #0f172a;
  margin-bottom: 4px;
  line-height: 1.4;
}

.chapter-word-count {
  font-size: 12px;
  color: #64748b;
}

.chapter-loading {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px;
}

/* 章节列表滚动条 */
.chapter-list::-webkit-scrollbar {
  width: 6px;
}

.chapter-list::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 3px;
}

.chapter-list::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.chapter-list::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

.config-label {
  font-size: 14px;
  font-weight: 700;
  color: #475569;
  display: flex;
  align-items: center;
  gap: 8px;
}

.config-label svg {
  width: 16px;
  height: 16px;
}

.config-select {
  width: 100%;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 12px 16px;
  font-size: 14px;
  color: #0f172a;
  outline: none;
  transition: all 0.2s;
}

.config-select:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.custom-range {
  margin-top: 8px;
}

.range-inputs {
  display: flex;
  align-items: center;
  gap: 12px;
}

.range-input-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.range-input-group label {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
}

.range-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
}

.range-separator {
  margin-top: 20px;
  color: #64748b;
  font-weight: 600;
}

.strategy-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.strategy-btn {
  padding: 16px;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  background: white;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s;
}

.strategy-btn:hover {
  border-color: #cbd5e1;
}

.strategy-btn.active {
  border-color: #2563eb;
  background: #eff6ff;
  box-shadow: 0 0 0 1px rgba(37, 99, 235, 0.2);
}

.strategy-title {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 4px;
}

.strategy-desc {
  font-size: 10px;
  color: #64748b;
  line-height: 1.4;
}

.config-panel {
  background: #fff;
  padding: 24px;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
  min-height: 0;
}

.panel-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-label {
  font-size: 14px;
  font-weight: 600;
  color: #475569;
}

.section-value {
  font-size: 14px;
  font-weight: 700;
  color: #2563eb;
}

/* 模式按钮 */
.mode-buttons {
  display: flex;
  gap: 12px;
}

.mode-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
  font-weight: 600;
  color: #475569;
}

.mode-btn:hover {
  border-color: #cbd5e1;
}

.mode-btn.active {
  border-color: #2563eb;
  background: #eff6ff;
  color: #2563eb;
}

.mode-btn svg {
  width: 16px;
  height: 16px;
}

/* 开关设置 */
.switch-setting {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.switch-label-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.info-icon {
  width: 14px;
  height: 14px;
  color: #94a3b8;
  cursor: help;
}

/* 开关样式 */
.switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #cbd5e1;
  transition: 0.3s;
  border-radius: 24px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: #2563eb;
}

input:checked + .slider:before {
  transform: translateX(20px);
}

/* 信息提示 */
.panel-info {
  display: flex;
  gap: 12px;
  padding: 12px;
  background: #fff7ed;
  border: 1px solid #fed7aa;
  border-radius: 8px;
  font-size: 12px;
  color: #9a3412;
  line-height: 1.5;
}

.panel-info svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  margin-top: 2px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.panel-label {
  font-size: 14px;
  font-weight: 600;
  color: #475569;
}

.panel-value {
  font-size: 14px;
  font-weight: 700;
  color: #2563eb;
}

.concurrency-slider {
  width: 100%;
  height: 6px;
  background: #e2e8f0;
  border-radius: 999px;
  outline: none;
  -webkit-appearance: none;
  appearance: none;
}

.concurrency-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  background: #2563eb;
  border-radius: 50%;
  cursor: pointer;
}

.concurrency-slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  background: #2563eb;
  border-radius: 50%;
  cursor: pointer;
  border: none;
}

.panel-divider {
  margin: 16px 0;
  border-top: 1px solid #e2e8f0;
}

.panel-setting {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.setting-label {
  font-size: 12px;
  color: #64748b;
}

.setting-input {
  width: 80px;
  padding: 8px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 12px;
  text-align: right;
  outline: none;
}

.panel-warning {
  display: flex;
  gap: 12px;
  padding: 12px;
  background: #fef3c7;
  border: 1px solid #fde68a;
  border-radius: 8px;
  font-size: 11px;
  color: #92400e;
  line-height: 1.5;
}

.panel-warning svg {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  margin-top: 2px;
}

.config-footer {
  flex-shrink: 0;
  padding: 32px;
  background: #fff;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 1px solid #e2e8f0;
}

.footer-status {
  display: flex;
  gap: 24px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #0f172a;
}

.status-item svg {
  width: 14px;
  height: 14px;
}

.status-item:first-child svg {
  color: #fbbf24;
}

.status-item:last-child svg {
  color: #10b981;
}

.start-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 40px;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}

.start-btn:hover:not(:disabled) {
  background: #1d4ed8;
  transform: scale(1.05);
}

.start-btn:active:not(:disabled) {
  transform: scale(0.95);
}

.start-btn:disabled {
  background: #475569;
  cursor: not-allowed;
}

.start-btn svg {
  width: 18px;
  height: 18px;
}

/* 监控视图 */
.processing-view {
  padding: 32px;
}

.processing-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 32px;
}

.processing-header h2 {
  font-size: 24px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 4px 0;
}

.processing-header p {
  font-size: 14px;
  color: #64748b;
  margin: 0;
}

.processing-stats {
  display: flex;
  gap: 32px;
}

.stat-item {
  text-align: right;
}

.stat-label {
  font-size: 10px;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  font-family: monospace;
  color: #2563eb;
  margin-top: 4px;
}

.nodes-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 32px;
}

.node-card {
  background: white;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  padding: 16px;
  position: relative;
  overflow: hidden;
  transition: all 0.2s;
}

.node-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.node-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.node-status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-dot.completed {
  background: #10b981;
  box-shadow: 0 0 8px rgba(16, 185, 129, 0.5);
}

.status-dot.processing {
  background: #2563eb;
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.status-dot.waiting {
  background: #e2e8f0;
}

.node-id {
  font-size: 11px;
  font-weight: 700;
  font-family: monospace;
  font-style: italic;
  color: #475569;
}

.node-state {
  font-size: 10px;
  color: #64748b;
  font-weight: 500;
}

.node-title {
  font-size: 13px;
  font-weight: 600;
  color: #475569;
  margin-bottom: 16px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.node-progress-bar {
  width: 100%;
  height: 6px;
  background: #f1f5f9;
  border-radius: 999px;
  overflow: hidden;
}

.node-progress-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 1s;
}

.node-progress-fill.completed {
  background: #10b981;
}

.node-progress-fill.processing {
  background: #2563eb;
}

.output-stream {
  background: #0f172a;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.stream-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.stream-header h4 {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 700;
  color: white;
  margin: 0;
}

.stream-header svg {
  width: 16px;
  height: 16px;
  color: #60a5fa;
}

.stream-control {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.4);
  background: none;
  border: none;
  cursor: pointer;
  transition: color 0.2s;
}

.stream-control:hover {
  color: white;
}

.stream-content {
  font-family: monospace;
  font-size: 11px;
  line-height: 1.8;
}

.stream-line {
  margin-bottom: 4px;
}

.stream-line.success {
  color: #10b981;
}

.stream-line.info {
  color: #60a5fa;
}

.stream-line.processing {
  color: #64748b;
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

/* 详情视图 */
.detail-view {
  padding: 20px;
}

.status-banner {
  background: #fafafa;
  border-radius: 12px;
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  border-left: 4px solid #16a34a;
}

.status-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: #dcfce7;
  color: #16a34a;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.status-icon svg {
  width: 24px;
  height: 24px;
}

.status-info {
  flex: 1;
}

.status-title {
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 4px;
}

.status-details {
  font-size: 14px;
  color: #64748b;
}

.status-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  padding: 8px 16px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.action-btn.primary {
  background: #2563eb;
  color: white;
}

.action-btn.primary:hover {
  background: #1d4ed8;
}

.action-btn.secondary {
  background: #f1f5f9;
  color: #475569;
  border: 1px solid #e2e8f0;
}

.action-btn.secondary:hover {
  background: #e2e8f0;
}

.scenes-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

.scene-card {
  background: white;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s;
}

.scene-card:hover {
  border-color: #2563eb;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.1);
  transform: translateY(-2px);
}

.scene-header {
  padding: 16px;
  border-bottom: 1px solid #f1f5f9;
  background: #f8fafc;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.scene-number {
  font-size: 10px;
  font-weight: 700;
  color: #2563eb;
}

.scene-menu {
  display: flex;
  gap: 4px;
}

.menu-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.menu-dot:nth-child(1) {
  background: #60a5fa;
}

.menu-dot:nth-child(2) {
  background: #a78bfa;
}

.menu-dot:nth-child(3) {
  background: #10b981;
}

.scene-body {
  padding: 20px;
}

.scene-title {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 12px;
  transition: color 0.2s;
}

.scene-card:hover .scene-title {
  color: #2563eb;
}

.scene-description {
  font-size: 12px;
  color: #64748b;
  line-height: 1.6;
  margin-bottom: 16px;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.scene-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 16px;
  border-top: 1px solid #f1f5f9;
}

.scene-info {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  color: #64748b;
}

.scene-info svg {
  width: 10px;
  height: 10px;
}

.dialogue-count {
  font-size: 10px;
  font-weight: 700;
  color: #0f172a;
  padding: 4px 8px;
  background: #f1f5f9;
  border-radius: 4px;
}

.empty-state,
.loading-state {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 80px;
  background: white;
  border-radius: 12px;
  color: #64748b;
}

/* 滚动条样式 */
.task-list::-webkit-scrollbar,
.content-area::-webkit-scrollbar {
  width: 6px;
}

.task-list::-webkit-scrollbar-track,
.content-area::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 3px;
}

.task-list::-webkit-scrollbar-thumb,
.content-area::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.task-list::-webkit-scrollbar-thumb:hover,
.content-area::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* 动画 */
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
