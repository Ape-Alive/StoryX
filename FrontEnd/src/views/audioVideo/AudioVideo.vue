<template>
  <div class="audio-video-container">
    <!-- 顶部控制条 -->
    <header class="header-bar">
      <div class="header-left">
        <!-- <div class="logo-group">
          <div class="logo-icon">
            <IconVideoCamera :size="20" />
          </div>
          <div class="logo-text">
            <h1 class="logo-title">STORYX LAB</h1>
            <p class="logo-subtitle">Light Media Editor</p>
          </div>
        </div>
        <div class="divider"></div> -->
        <NovelSelector
          :value="novelId"
          :title="novelTitle"
          @change="handleNovelSelect"
        />
      </div>

      <div class="header-right">
        <button class="batch-generate-btn" @click="handleBatchGenerate">
          <ThunderboltIcon :size="14" /> 批量生成
        </button>
        <button class="settings-btn">
          <IconSettings :size="18" />
        </button>
      </div>
    </header>

    <!-- 中部主工作区 -->
    <main class="main-content">
      <div v-if="loading" class="loading-container">
        <a-spin :size="24" />
      </div>
      <div v-else-if="!novelId" class="empty-container">
        <div class="empty-content">
          <p>请先选择小说</p>
        </div>
      </div>
      <div
        v-else
        class="content-wrapper"
        :style="{ width: contentWidth + 'px' }"
      >
        <div class="toolbar">
          <div class="toolbar-left">
            <label class="checkbox-label">
              <input
                type="checkbox"
                :checked="isAllSelected"
                @change="handleSelectAll"
                class="checkbox-input"
              />
              <span class="checkbox-text">全选所有场景</span>
            </label>
            <div class="toolbar-divider"></div>
            <button class="export-btn" @click="handleExportProject">
              <IconDownload :size="14" /> 导出项目包
            </button>
          </div>
          <div class="toolbar-tip">
            <span>操作提示: 在时间轴区域使用鼠标滚轮可横向滑动</span>
            <span v-if="acts.length === 0" class="tip-warning">
              暂无剧幕数据,请先完成剧本结构化
            </span>
          </div>
        </div>

        <div v-for="act in acts" :key="act.id" class="act-section">
          <div class="act-header">
            <div class="act-header-left">
              <div class="act-badge">{{ act.actName }}</div>
              <div class="act-actions">
                <button
                  class="preview-btn preview-video"
                  @click="handlePreviewAct(act, 'video')"
                >
                  <DesktopIcon :size="12" /> 预览整幕视频
                </button>
                <button
                  class="preview-btn preview-audio"
                  @click="handlePreviewAct(act, 'audio')"
                >
                  <IconSound :size="12" /> 预览整幕音频
                </button>
              </div>
            </div>
            <div class="act-divider"></div>
          </div>

          <SceneCard
            v-for="scene in getAllScenes(act)"
            :key="scene.id"
            :scene="scene"
            :is-selected="selectedScenes.has(scene.id)"
            :selected-clip-id="selectedPreview?.id"
            @toggle-select="handleToggleScene"
            @generate-scene="handleGenerateScene"
            @select-clip="handleSelectClip"
            @context-menu="handleContextMenu"
          />
        </div>

        <div v-if="acts.length === 0" class="empty-state">
          <p>暂无剧幕数据，请先完成剧本结构化</p>
        </div>
      </div>
    </main>

    <!-- 底部播放器 -->
    <MediaPlayer
      :selected-preview="selectedPreview"
      :sync-logs="syncLogs"
      @play="handlePlay"
      @export="handleExport"
    />

    <!-- 右键菜单 -->
    <ContextMenu
      :visible="contextMenu !== null"
      :position="
        contextMenu ? { x: contextMenu.x, y: contextMenu.y } : { x: 0, y: 0 }
      "
      :item="contextMenu?.item"
      :type="contextMenu?.type"
      @edit="handleEditClip"
      @insert-before="handleInsertShot"
      @insert-after="handleInsertShot"
      @delete="handleDeleteClip"
      @close="contextMenu = null"
    />

    <!-- 批量生成配置弹窗 -->
    <BatchGenerateModal
      :visible="showBatchModal"
      :selected-count="selectedScenes.size"
      @confirm="handleBatchGenerateConfirm"
      @cancel="showBatchModal = false"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { Message } from "@arco-design/web-vue";
import { getTaskProgress } from "@/api/media";
import { readFileInfo } from "@/api/materials";
import env from "@/config/env";
import {
  IconVideoCamera,
  IconSettings,
  IconDownload,
  IconSound,
} from "@arco-design/web-vue/es/icon";
import { h } from "vue";
import { getLocalStorage } from "@/utils/storage";
import {
  getActs,
  generateShotsByActs,
  previewVideo,
  exportActs,
} from "@/api/media";
import { getNovel } from "@/api/novel";
import NovelSelector from "@/components/NovelSelector.vue";
import SceneCard from "./components/SceneCard.vue";
import MediaPlayer from "./components/MediaPlayer.vue";
import ContextMenu from "./components/ContextMenu.vue";
import BatchGenerateModal from "./components/BatchGenerateModal.vue";

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
          style: { width: attrs.size || "14px", height: attrs.size || "14px" },
        },
        [h("polygon", { points: "13 2 3 14 12 14 11 22 21 10 12 10 13 2" })]
      );
  },
};

// 桌面图标 SVG
const DesktopIcon = {
  setup(props, { attrs }) {
    return () =>
      h(
        "svg",
        {
          ...attrs,
          viewBox: "0 0 24 24",
          fill: "none",
          stroke: "currentColor",
          "stroke-width": "1.5",
          "stroke-linecap": "round",
          "stroke-linejoin": "round",
          style: { width: attrs.size || "12px", height: attrs.size || "12px" },
        },
        [
          h("rect", {
            x: "2",
            y: "3",
            width: "20",
            height: "14",
            rx: "2",
            ry: "2",
          }),
          h("line", { x1: "8", y1: "21", x2: "16", y2: "21" }),
          h("line", { x1: "12", y1: "17", x2: "12", y2: "21" }),
        ]
      );
  },
};

const projectId = computed(() => getLocalStorage("currentProjectId", ""));
const projectName = ref("");
const novelId = ref("");
const novelTitle = ref("");
const acts = ref([]);
const loading = ref(false);
const contentWidth = ref(0);
const selectedScenes = ref(new Set());
const selectedPreview = ref(null);
const contextMenu = ref(null);
const syncLogs = ref([{ time: "11:18", message: "场景渲染队列加载完成" }]);
const showBatchModal = ref(false);
// 任务信息映射：taskId -> { taskId, shotIds, shotVideoName, status, progress }
const taskMap = ref(new Map());
// 轮询定时器
const pollingIntervals = ref(new Map());

const isAllSelected = computed(() => {
  const allSceneIds = new Set();
  acts.value.forEach((act) => {
    getAllScenes(act).forEach((scene) => {
      allSceneIds.add(scene.id);
    });
  });
  return allSceneIds.size > 0 && allSceneIds.size === selectedScenes.value.size;
});

// 获取所有场景（包括直接关联到剧幕的场景和镜头）
function getAllScenes(act) {
  const scenes = [];

  // 添加有场景的场景
  if (act.scenes && act.scenes.length > 0) {
    scenes.push(...act.scenes);
  }

  // 如果有直接关联到剧幕的镜头，创建一个虚拟场景
  if (act.directShots && act.directShots.length > 0) {
    scenes.push({
      id: `direct-${act.id}`,
      address: "直接镜头",
      sceneDescription: "直接关联到剧幕的镜头",
      sceneImage: null,
      isGenerating: false,
      overallProgress: 100,
      shots: act.directShots,
      videoAssets: [],
      audioAssets: [],
    });
  }

  return scenes;
}

// 处理小说选择
async function handleNovelSelect(novel) {
  novelId.value = novel.id || novel.novelId;
  novelTitle.value = novel.title || novel.novelTitle || "未知小说";

  // 加载小说详情获取完整标题
  if (novelId.value) {
    try {
      const novelRes = await getNovel(novelId.value);
      if (novelRes.success && novelRes.data) {
        novelTitle.value = novelRes.data.title || novelTitle.value;
      }
    } catch (error) {
      console.error("加载小说详情失败:", error);
    }
  }

  // 加载剧幕数据
  await loadActs();
}

// 加载剧幕数据
async function loadActs() {
  if (!projectId.value || !novelId.value) return;

  loading.value = true;
  try {
    const response = await getActs(projectId.value, novelId.value);
    if (response.success && response.data) {
      // 处理数据，添加 videoAssets 和 audioAssets
      acts.value = response.data.map((act) => {
        const scenes = (act.scenes || []).map((scene) => {
          const shots = scene.shots || [];
          const completedShots = shots.filter((shot) => shot.videoUrl);
          const totalShots = shots.length;

          // 处理 videoAssets - 支持合并镜头的情况
          const videoAssets = [];
          const processedShotIds = new Set(); // 记录已处理的镜头ID

          // 1. 先处理任务中的视频（根据 taskMap 中的任务信息）
          taskMap.value.forEach((taskInfo, taskId) => {
            // 检查这个任务的 shotIds 是否属于当前场景
            const taskShots = shots.filter((shot) =>
              taskInfo.shotIds.includes(shot.id)
            );
            if (taskShots.length > 0) {
              // 计算合并后的总时长
              const totalDuration = taskShots.reduce(
                (sum, shot) => sum + (shot.duration || 0),
                0
              );

              // 检查是否已经有对应的视频（可能任务已完成）
              const hasVideo = taskShots.some((shot) => shot.videoUrl);
              const videoUrl = hasVideo
                ? taskShots.find((s) => s.videoUrl)?.videoUrl
                : null;

              videoAssets.push({
                id: taskId, // 使用 taskId 作为唯一标识
                duration: totalDuration,
                label:
                  taskInfo.shotVideoName || `${taskShots.length}个镜头合并`,
                shotIds: taskInfo.shotIds,
                taskId: taskId,
                status: hasVideo ? "completed" : taskInfo.status || "pending",
                progress: taskInfo.progress || 0,
                videoUrl: videoUrl,
              });

              // 标记这些镜头已处理
              taskInfo.shotIds.forEach((shotId) => {
                processedShotIds.add(shotId);
              });
            }
          });

          // 2. 处理已完成的视频，按 videoUrl 分组合并
          // 将相同 videoUrl 的镜头合并为一个视频块
          const videoUrlGroups = new Map(); // videoUrl -> { shotIds: [], duration: 0, label: '', videoPath: '' }

          completedShots.forEach((shot) => {
            // 跳过已经在任务中处理的镜头
            if (processedShotIds.has(shot.id)) {
              return;
            }

            if (shot.videoUrl) {
              if (!videoUrlGroups.has(shot.videoUrl)) {
                videoUrlGroups.set(shot.videoUrl, {
                  shotIds: [],
                  duration: 0,
                  label: "",
                  videoUrl: shot.videoUrl,
                  videoPath: shot.videoPath || null, // 保留 videoPath
                });
              }

              const group = videoUrlGroups.get(shot.videoUrl);
              group.shotIds.push(shot.id);
              group.duration += shot.duration || 0;
              // 如果当前 shot 有 videoPath 但 group 没有，则更新
              if (shot.videoPath && !group.videoPath) {
                group.videoPath = shot.videoPath;
              }

              // 使用第一个镜头的 shotId 作为标签，如果有多个则显示合并信息
              if (group.shotIds.length === 1) {
                group.label = shot.shotId
                  ? `${shot.shotId}.mp4`
                  : `Shot_${shot.id}.mp4`;
              } else {
                // 多个镜头共享同一个视频，显示合并信息
                const firstShot = shots.find((s) => s.id === group.shotIds[0]);
                const firstShotLabel = firstShot?.shotId
                  ? `${firstShot.shotId}`
                  : `Shot_${group.shotIds[0]}`;
                group.label = `${firstShotLabel}_合并${group.shotIds.length}个镜头`;
              }
            }
          });

          // 将分组后的视频添加到 videoAssets
          videoUrlGroups.forEach((group, videoUrl) => {
            if (group.shotIds.length === 1) {
              // 单个镜头
              const shot = shots.find((s) => s.id === group.shotIds[0]);
              videoAssets.push({
                id: group.shotIds[0],
                duration: group.duration,
                label: shot?.shotId
                  ? `${shot.shotId}.mp4`
                  : `Shot_${group.shotIds[0]}.mp4`,
                shotIds: group.shotIds,
                status: "completed",
                videoUrl: videoUrl,
                videoPath: group.videoPath, // 保留 videoPath
                type: "video", // 添加类型标识
              });
            } else {
              // 多个镜头合并
              videoAssets.push({
                id: `merged_${group.shotIds.join("_")}`, // 使用合并的shotIds作为ID
                duration: group.duration,
                label: group.label,
                shotIds: group.shotIds,
                status: "completed",
                videoUrl: videoUrl,
                videoPath: group.videoPath, // 保留 videoPath
                type: "video", // 添加类型标识
              });
            }
          });

          // 按时间顺序排序 videoAssets（根据第一个 shot 的位置）
          videoAssets.sort((a, b) => {
            const aFirstShotIndex = shots.findIndex((s) =>
              a.shotIds.includes(s.id)
            );
            const bFirstShotIndex = shots.findIndex((s) =>
              b.shotIds.includes(s.id)
            );
            return aFirstShotIndex - bFirstShotIndex;
          });

          // 处理 audioAssets - 从镜头的对话中提取
          const audioAssets = [];
          shots.forEach((shot) => {
            if (shot.dialogue && shot.dialogue.length > 0) {
              shot.dialogue.forEach((dialogue, index) => {
                if (dialogue.audioUrl) {
                  audioAssets.push({
                    id: `${shot.id}_dialogue_${index}`,
                    duration: shot.duration || 0,
                    label: dialogue.text || `Audio_${shot.shotId || shot.id}`,
                    shotIds: [shot.id],
                    status: "completed",
                  });
                }
              });
            }
          });

          return {
            ...scene,
            shots: shots.map((shot) => ({
              ...shot,
              status: shot.videoUrl ? "completed" : "pending",
            })),
            videoAssets,
            audioAssets,
            isGenerating:
              completedShots.length < totalShots && completedShots.length > 0,
            overallProgress:
              totalShots > 0
                ? Math.round((completedShots.length / totalShots) * 100)
                : 0,
          };
        });

        return {
          ...act,
          scenes,
        };
      });
    }
  } catch (error) {
    console.error("加载剧幕数据失败:", error);
    Message.error("加载剧幕数据失败");
  } finally {
    loading.value = false;
  }
}

// 全选/取消全选
function handleSelectAll(e) {
  const allSceneIds = new Set();
  acts.value.forEach((act) => {
    getAllScenes(act).forEach((scene) => {
      allSceneIds.add(scene.id);
    });
  });

  if (e.target.checked) {
    selectedScenes.value = new Set(allSceneIds);
  } else {
    selectedScenes.value = new Set();
  }
}

// 切换场景选择
function handleToggleScene(sceneId) {
  const newSelection = new Set(selectedScenes.value);
  if (newSelection.has(sceneId)) {
    newSelection.delete(sceneId);
  } else {
    newSelection.add(sceneId);
  }
  selectedScenes.value = newSelection;
}

// 生成场景
async function handleGenerateScene(sceneId) {
  if (!projectId.value || !novelId.value) {
    Message.warning("请先选择项目和小说");
    return;
  }

  // 找到场景所属的剧幕
  let targetActId = null;
  for (const act of acts.value) {
    const scene = getAllScenes(act).find((s) => s.id === sceneId);
    if (scene) {
      targetActId = act.id;
      break;
    }
  }

  if (!targetActId) {
    Message.warning("未找到对应的剧幕");
    return;
  }

  try {
    const response = await generateShotsByActs(projectId.value, novelId.value, {
      actIds: [targetActId],
      concurrency: 3,
    });

    if (response.success && response.data) {
      Message.success("生成任务已启动");

      // 保存任务信息到 taskMap
      if (response.data.acts && Array.isArray(response.data.acts)) {
        response.data.acts.forEach((act) => {
          if (act.taskIds && Array.isArray(act.taskIds)) {
            act.taskIds.forEach((taskInfo) => {
              if (taskInfo.taskId && taskInfo.shotIds) {
                taskMap.value.set(taskInfo.taskId, {
                  taskId: taskInfo.taskId,
                  shotIds: taskInfo.shotIds,
                  shotVideoName: taskInfo.shotVideoName || null,
                  status: "pending",
                  progress: 0,
                });

                // 开始轮询这个任务
                startPollingTask(taskInfo.taskId);
              }
            });
          }
        });
      }

      // 刷新数据
      await loadActs();
    }
  } catch (error) {
    console.error("生成失败:", error);
    Message.error("生成失败: " + (error.message || "未知错误"));
  }
}

// 批量生成 - 显示配置弹窗
function handleBatchGenerate() {
  if (!projectId.value || !novelId.value) {
    Message.warning("请先选择项目和小说");
    return;
  }

  if (selectedScenes.value.size === 0 && acts.value.length === 0) {
    Message.warning("请先选择要生成的场景或确保有剧幕数据");
    return;
  }

  showBatchModal.value = true;
}

// 批量生成确认 - 执行生成
async function handleBatchGenerateConfirm(config) {
  if (!projectId.value || !novelId.value) {
    Message.warning("请先选择项目和小说");
    return;
  }

  showBatchModal.value = false;

  try {
    // 构建请求参数
    const requestData = {
      featurePromptId: config.featurePromptId,
      concurrency: config.concurrency,
      storageMode: config.storageMode,
      allowOverwrite: config.allowOverwrite,
    };

    // 根据选择的范围设置 sceneIds 或 actIds
    if (config.scope === "selected") {
      // 仅选定场景
      const selectedSceneIds = Array.from(selectedScenes.value);
      if (selectedSceneIds.length === 0) {
        Message.warning("请先选择要生成的场景");
        return;
      }
      requestData.sceneIds = selectedSceneIds;
    } else {
      // 全部剧幕内容
      const allActIds = acts.value.map((act) => act.id);
      if (allActIds.length === 0) {
        Message.warning("暂无剧幕数据");
        return;
      }
      requestData.actIds = allActIds;
    }

    // 如果启用合并模式
    if (config.mergeShots) {
      requestData.mergeShots = true;
      requestData.maxDuration = config.maxDuration;
      requestData.toleranceSec = config.toleranceSec;
    }

    const response = await generateShotsByActs(
      projectId.value,
      novelId.value,
      requestData
    );

    if (response.success && response.data) {
      Message.success("批量生成任务已启动");

      // 保存任务信息到 taskMap
      if (response.data.acts && Array.isArray(response.data.acts)) {
        response.data.acts.forEach((act) => {
          if (act.taskIds && Array.isArray(act.taskIds)) {
            act.taskIds.forEach((taskInfo) => {
              if (taskInfo.taskId && taskInfo.shotIds) {
                taskMap.value.set(taskInfo.taskId, {
                  taskId: taskInfo.taskId,
                  shotIds: taskInfo.shotIds,
                  shotVideoName: taskInfo.shotVideoName || null,
                  status: "pending",
                  progress: 0,
                });

                // 开始轮询这个任务
                startPollingTask(taskInfo.taskId);
              }
            });
          }
        });
      }

      await loadActs();
    }
  } catch (error) {
    console.error("批量生成失败:", error);
    Message.error("批量生成失败: " + (error.message || "未知错误"));
  }
}

// 预览整幕
async function handlePreviewAct(act, type) {
  if (!projectId.value) {
    Message.warning("请先选择项目");
    return;
  }

  try {
    const response = await previewVideo(projectId.value, {
      type: "act",
      actId: act.id,
    });

    if (response.success) {
      selectedPreview.value = {
        id: act.id,
        label: act.actName,
        duration:
          act.scenes?.reduce((acc, scene) => {
            return (
              acc +
              (scene.shots?.reduce((sAcc, s) => sAcc + (s.duration || 0), 0) ||
                0)
            );
          }, 0) || 0,
        type: type === "video" ? "act-video" : "act-audio",
        status: "completed",
      };
    }
  } catch (error) {
    console.error("预览失败:", error);
    Message.error("预览失败");
  }
}

// 选择片段
async function handleSelectClip(item) {
  // 如果是视频类型，需要处理 videoPath 或 videoUrl
  if (item.type === "video" && item.videoUrl) {
    let finalVideoUrl = item.videoUrl;

    // 如果有 videoPath，调用接口获取 accessUrl
    if (item.videoPath) {
      try {
        const response = await readFileInfo(item.videoPath);
        console.log("读取文件信息响应:", response);
        if (response.success && response.data && response.data.accessUrl) {
          let accessUrl = response.data.accessUrl;
          // 如果是相对路径，需要拼接完整的后端服务地址
          if (accessUrl.startsWith("/")) {
            // 使用 env 配置获取正确的后端地址
            const baseUrl = env.apiBaseUrl.replace(/\/api$/, "");
            finalVideoUrl = `${baseUrl}${accessUrl}`;
          } else if (
            !accessUrl.startsWith("http://") &&
            !accessUrl.startsWith("https://")
          ) {
            // 如果不是绝对路径也不是 http/https，也当作相对路径处理
            const baseUrl = env.apiBaseUrl.replace(/\/api$/, "");
            finalVideoUrl = `${baseUrl}/${accessUrl}`;
          } else {
            finalVideoUrl = accessUrl;
          }
          console.log("最终视频URL:", finalVideoUrl);
        } else {
          console.warn("读取文件信息响应中没有 accessUrl:", response);
        }
      } catch (error) {
        console.error("读取文件信息失败:", error);
        // 如果接口失败，仍然使用 videoUrl
      }
    }

    // 设置预览信息，包含最终的视频URL
    selectedPreview.value = {
      ...item,
      videoUrl: finalVideoUrl,
      autoPlay: true, // 标记需要自动播放
    };
    console.log("设置预览信息:", selectedPreview.value);
  } else {
    // 其他类型直接设置
    selectedPreview.value = item;
  }
}

// 右键菜单
function handleContextMenu(e, item, type) {
  e.preventDefault();
  contextMenu.value = {
    x: e.clientX,
    y: e.clientY,
    item,
    type,
  };
}

// 编辑片段
function handleEditClip(item) {
  Message.info("编辑功能开发中...");
}

// 插入镜头
function handleInsertShot(item) {
  Message.info("插入镜头功能开发中...");
}

// 删除片段
async function handleDeleteClip(item) {
  Message.info("删除功能开发中...");
}

// 播放
function handlePlay() {
  Message.info("播放功能开发中...");
}

// 开始轮询任务进度
function startPollingTask(taskId) {
  // 如果已经在轮询，先停止
  if (pollingIntervals.value.has(taskId)) {
    stopPollingTask(taskId);
  }

  // 立即查询一次
  pollTaskProgress(taskId);

  // 每30秒轮询一次
  const interval = setInterval(() => {
    pollTaskProgress(taskId);
  }, 30000); // 30秒

  pollingIntervals.value.set(taskId, interval);
}

// 停止轮询任务
function stopPollingTask(taskId) {
  const interval = pollingIntervals.value.get(taskId);
  if (interval) {
    clearInterval(interval);
    pollingIntervals.value.delete(taskId);
  }
}

// 查询任务进度
async function pollTaskProgress(taskId) {
  try {
    const response = await getTaskProgress(taskId);
    if (response.success && response.data) {
      const taskData = response.data;
      const taskInfo = taskMap.value.get(taskId);

      if (taskInfo) {
        // 更新任务状态和进度
        taskInfo.status = taskData.status || taskInfo.status;
        taskInfo.progress = taskData.progress || taskInfo.progress;

        // 如果任务完成或失败，停止轮询
        if (taskData.status === "completed" || taskData.status === "failed") {
          stopPollingTask(taskId);

          // 如果完成，刷新数据以获取视频URL
          if (taskData.status === "completed") {
            await loadActs();
          }
        }

        // 更新 taskMap
        taskMap.value.set(taskId, taskInfo);
      }
    }
  } catch (error) {
    console.error(`查询任务 ${taskId} 进度失败:`, error);
    // 如果任务不存在或已删除，停止轮询
    if (error.response?.status === 404) {
      stopPollingTask(taskId);
      taskMap.value.delete(taskId);
    }
  }
}

// 初始化时检查并开始轮询未完成的任务
function initTaskPolling() {
  // 从 taskMap 中找出所有未完成的任务并开始轮询
  taskMap.value.forEach((taskInfo, taskId) => {
    if (taskInfo.status !== "completed" && taskInfo.status !== "failed") {
      startPollingTask(taskId);
    }
  });
}

// 导出
async function handleExport() {
  if (!projectId.value) {
    Message.warning("请先选择项目");
    return;
  }

  try {
    const response = await exportActs(projectId.value, {
      actIds: Array.from(selectedScenes.value),
    });

    if (response.success) {
      Message.success("导出任务已启动");
    }
  } catch (error) {
    console.error("导出失败:", error);
    Message.error("导出失败");
  }
}

// 导出项目包
function handleExportProject() {
  Message.info("导出项目包功能开发中...");
}

// 监听项目ID变化
watch(
  () => projectId.value,
  (newId) => {
    if (newId && novelId.value) {
      loadActs();
    }
  }
);

onMounted(() => {
  const updateWidth = () => {
    // 预留左右内边距 80px，避免贴边
    const gutter = 80;
    const sidebarWidth = 200;
    const minWidth = 660;
    contentWidth.value = Math.max(
      window.innerWidth - gutter * 2 - sidebarWidth,
      minWidth
    );
  };
  updateWidth();
  window.addEventListener("resize", updateWidth);

  // 尝试从 localStorage 获取当前小说ID
  const savedNovelId = getLocalStorage("currentNovelId", "");
  if (savedNovelId) {
    novelId.value = savedNovelId;
    // 加载小说标题
    getNovel(savedNovelId)
      .then((res) => {
        if (res.success && res.data) {
          novelTitle.value = res.data.title || "未知小说";
          loadActs();
        }
      })
      .catch(() => {
        // 忽略错误
      });
  }

  // 初始化任务轮询
  initTaskPolling();

  // 保存 updateWidth 函数以便清理
  const cleanupResize = () => {
    window.removeEventListener("resize", updateWidth);
  };

  onUnmounted(cleanupResize);
});

onUnmounted(() => {
  // 清理所有轮询定时器
  pollingIntervals.value.forEach((interval) => {
    clearInterval(interval);
  });
  pollingIntervals.value.clear();
});

onUnmounted(() => {
  // 清理所有轮询定时器
  pollingIntervals.value.forEach((interval, taskId) => {
    clearInterval(interval);
  });
  pollingIntervals.value.clear();

  onUnmounted(() => {
    window.removeEventListener("resize", updateWidth);
  });
});
</script>

<style scoped>
.audio-video-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #ffffff;
  color: #0f172a;
  overflow: hidden;
  user-select: none;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

/* 顶部控制条 */
.header-bar {
  height: 64px;
  border-bottom: 1px solid #e2e8f0;
  background-color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px;
  z-index: 50;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 24px;
}

.logo-group {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}

.logo-icon {
  width: 36px;
  height: 36px;
  background-color: #0f172a;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  transition: background-color 0.2s;
}

.logo-group:hover .logo-icon {
  background-color: #2563eb;
}

.logo-text {
  display: flex;
  flex-direction: column;
}

.logo-title {
  font-weight: 900;
  font-size: 18px;
  letter-spacing: -0.025em;
  line-height: 1;
  color: #0f172a;
  font-style: italic;
  margin: 0;
}

.logo-subtitle {
  font-size: 9px;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  margin-top: 4px;
  margin: 0;
}

.divider {
  height: 32px;
  width: 1px;
  background-color: #e2e8f0;
}

.project-label {
  font-size: 9px;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.project-name {
  font-size: 12px;
  font-weight: 700;
  color: #334155;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.batch-generate-btn {
  padding: 10px 20px;
  background-color: #0f172a;
  color: #ffffff;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.025em;
  display: flex;
  align-items: center;
  gap: 8px;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

.batch-generate-btn:hover {
  background-color: #1e293b;
}

.batch-generate-btn:active {
  transform: scale(0.95);
}

.settings-btn {
  padding: 10px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: transparent;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.settings-btn:hover {
  background-color: #f1f5f9;
}

/* 中部主工作区 */
.main-content {
  flex: 1;
  overflow-y: auto;
  background-color: rgba(248, 250, 252, 0.5);
  padding: 32px 48px;
  padding-bottom: 224px;
}

.loading-container,
.empty-container {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.empty-content {
  text-align: center;
}

.empty-content p {
  color: #94a3b8;
  margin-bottom: 16px;
}

.content-wrapper {
  width: 100%;
}

.content-wrapper > * + * {
  margin-top: 48px;
}

/* 工具栏 */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  background-color: #ffffff;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 24px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox-input {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  border: 1px solid #cbd5e1;
  accent-color: #2563eb;
}

.checkbox-text {
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  transition: color 0.2s;
}

.checkbox-label:hover .checkbox-text {
  color: #0f172a;
}

.toolbar-divider {
  height: 16px;
  width: 1px;
  background-color: #e2e8f0;
}

.export-btn {
  font-size: 10px;
  font-weight: 900;
  color: #94a3b8;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: color 0.2s;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: none;
  border: none;
  cursor: pointer;
}

.export-btn:hover {
  color: #2563eb;
}

.toolbar-tip {
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: #f1f5f9;
  padding: 4px 12px;
  border-radius: 9999px;
}

.toolbar-tip span {
  font-size: 10px;
  font-weight: 700;
  color: #94a3b8;
}

.tip-warning {
  margin-left: 8px;
  color: #64748b !important;
}

/* 剧幕区域 */
.act-section {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.act-section > * + * {
  margin-top: 24px;
}

.act-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.act-header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.act-badge {
  padding: 6px 16px;
  background-color: #e2e8f0;
  color: #475569;
  border-radius: 9999px;
  font-size: 10px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

.act-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.preview-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  transition: all 0.2s;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  cursor: pointer;
}

.preview-video {
  color: #2563eb;
}

.preview-video:hover {
  background-color: #eff6ff;
}

.preview-audio {
  color: #10b981;
}

.preview-audio:hover {
  background-color: #ecfdf5;
}

.act-divider {
  height: 1px;
  flex: 1;
  background-color: #e2e8f0;
}

.empty-state {
  text-align: center;
  padding: 48px 0;
}

.empty-state p {
  color: #64748b;
  font-size: 14px;
}

/* 滚动条样式 */
:deep(::-webkit-scrollbar) {
  width: 4px;
  height: 6px;
}

:deep(::-webkit-scrollbar-track) {
  background: transparent;
}

:deep(::-webkit-scrollbar-thumb) {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 10px;
}

:deep(::-webkit-scrollbar-thumb:hover) {
  background: rgba(0, 0, 0, 0.1);
}

:deep(.arco-icon) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
</style>
