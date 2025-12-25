<template>
  <div class="novel-selector" ref="selectorRef">
    <button
      @click="isDropdownOpen = !isDropdownOpen"
      :class="['novel-select-btn', { active: isDropdownOpen }]"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        class="book-icon"
      >
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
        <path
          d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"
        ></path>
      </svg>
      <span class="novel-name">{{ displayTitle || "加载中..." }}</span>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        class="chevron-icon"
        :class="{ rotated: isDropdownOpen }"
      >
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    </button>

    <!-- 下拉菜单 -->
    <transition name="dropdown">
      <div v-if="isDropdownOpen" class="novel-dropdown" @click.stop>
        <!-- 点击外部关闭 -->
        <div class="dropdown-overlay" @click="isDropdownOpen = false"></div>
        <div class="dropdown-content">
          <!-- 搜索框 -->
          <div class="dropdown-search">
            <div class="search-wrapper">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                class="search-icon"
              >
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
              <input
                v-model="searchQuery"
                type="text"
                placeholder="搜索书籍项目..."
                class="search-input"
                @focus.stop
              />
            </div>
          </div>

          <!-- 标题 -->
          <div class="dropdown-label">切换项目</div>

          <!-- 加载状态 -->
          <div v-if="loading" class="loading-state">
            <a-spin size="small" />
            <span>加载中...</span>
          </div>

          <!-- 小说列表 -->
          <div v-else-if="filteredNovels.length > 0" class="novel-list">
            <button
              v-for="novel in filteredNovels"
              :key="novel.id || novel.novelId"
              @click="handleSelect(novel)"
              :class="[
                'novel-item',
                {
                  active:
                    (novel.id || novel.novelId) === currentNovelId,
                },
              ]"
            >
              <span class="novel-item-name">{{
                novel.title || novel.novelTitle || "未知小说"
              }}</span>
              <svg
                v-if="(novel.id || novel.novelId) === currentNovelId"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                class="check-icon"
              >
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </button>
          </div>

          <!-- 空状态 -->
          <div v-else class="empty-state">
            <p>暂无小说</p>
          </div>

          <!-- 底部操作 -->
          <div class="dropdown-footer">
            <button class="manage-btn" @click="handleManage">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              管理所有书籍库
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import { Message } from "@arco-design/web-vue";
import { getProjectNovels, getNovel } from "@/api";
import { getLocalStorage } from "@/utils/storage";

const props = defineProps({
  // 项目ID，如果不传则从 localStorage 获取
  projectId: {
    type: String,
    default: "",
  },
  // 当前选中的小说ID
  value: {
    type: String,
    default: "",
  },
  // 显示的小说标题（如果不传则自动加载）
  title: {
    type: String,
    default: "",
  },
});

const emit = defineEmits(["change", "update:value"]);

const selectorRef = ref(null);
const isDropdownOpen = ref(false);
const novels = ref([]);
const searchQuery = ref("");
const loading = ref(false);
const displayTitle = ref(props.title || "加载中...");

// 当前选中的小说ID
const currentNovelId = computed(() => props.value);

// 过滤小说列表
const filteredNovels = computed(() => {
  if (!searchQuery.value) {
    return novels.value;
  }
  const query = searchQuery.value.toLowerCase();
  return novels.value.filter((novel) =>
    (novel.title || novel.novelTitle || "").toLowerCase().includes(query)
  );
});

// 获取项目ID
const getProjectId = () => {
  return props.projectId || getLocalStorage("currentProjectId", "");
};

// 加载项目的小说列表
async function loadNovels() {
  const projectId = getProjectId();
  if (!projectId) {
    console.warn("项目ID不存在，无法加载小说列表");
    return;
  }

  loading.value = true;
  try {
    const response = await getProjectNovels(projectId);
    if (response.success && response.data) {
      novels.value = response.data || [];

      // 如果没有选中的小说且有数据，默认选择第一个
      if (!currentNovelId.value && novels.value.length > 0) {
        const firstNovel = novels.value[0];
        await handleSelect(firstNovel);
      }
    }
  } catch (error) {
    console.error("加载小说列表失败:", error);
    Message.error("加载小说列表失败");
  } finally {
    loading.value = false;
  }
}

// 加载当前小说的标题
async function loadCurrentNovelTitle() {
  if (!currentNovelId.value) {
    displayTitle.value = "请选择小说";
    return;
  }

  try {
    const response = await getNovel(currentNovelId.value);
    if (response.success && response.data) {
      displayTitle.value = response.data.title || "未知小说";
    }
  } catch (error) {
    console.error("加载小说详情失败:", error);
    displayTitle.value = "未知小说";
  }
}

// 选择小说
async function handleSelect(novel) {
  const selectedId = novel.id || novel.novelId;
  const selectedTitle = novel.title || novel.novelTitle || "未知小说";

  // 如果选中的小说与当前相同，则关闭下拉菜单
  if (selectedId === currentNovelId.value) {
    isDropdownOpen.value = false;
    return;
  }

  // 更新显示标题
  displayTitle.value = selectedTitle;

  // 尝试加载完整标题
  if (selectedId) {
    try {
      const response = await getNovel(selectedId);
      if (response.success && response.data) {
        displayTitle.value = response.data.title || selectedTitle;
      }
    } catch (error) {
      console.error("加载小说详情失败:", error);
    }
  }

  // 关闭下拉菜单
  isDropdownOpen.value = false;

  // 触发事件
  emit("update:value", selectedId);
  emit("change", novel);
}

// 管理书籍库
function handleManage() {
  Message.info("管理书籍库功能开发中...");
  isDropdownOpen.value = false;
}

// 点击外部关闭下拉菜单
function handleClickOutside(event) {
  if (isDropdownOpen.value && selectorRef.value) {
    if (!selectorRef.value.contains(event.target)) {
      isDropdownOpen.value = false;
    }
  }
}

// 监听 value 变化，更新标题
watch(
  () => props.value,
  (newValue) => {
    if (newValue) {
      loadCurrentNovelTitle();
    } else {
      displayTitle.value = "请选择小说";
    }
  },
  { immediate: true }
);

// 监听 title prop 变化
watch(
  () => props.title,
  (newTitle) => {
    if (newTitle) {
      displayTitle.value = newTitle;
    }
  }
);

onMounted(() => {
  loadNovels();
  document.addEventListener("click", handleClickOutside);

  // 如果已有选中的小说ID，加载标题
  if (currentNovelId.value) {
    loadCurrentNovelTitle();
  }
});

onUnmounted(() => {
  document.removeEventListener("click", handleClickOutside);
});
</script>

<style scoped>
.novel-selector {
  position: relative;
}

.novel-select-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 600;
  font-size: 15px;
  color: #0f172a;
  line-height: 1.5;
}

.novel-select-btn:hover {
  background: #f1f5f9;
}

.novel-select-btn.active {
  background: #eff6ff;
  color: #2563eb;
}

.book-icon {
  width: 16px;
  height: 16px;
  color: #2563eb;
  flex-shrink: 0;
}

.novel-name {
  color: inherit;
  font-weight: 600;
  font-size: 15px;
  white-space: nowrap;
}

.chevron-icon {
  width: 16px;
  height: 16px;
  color: #94a3b8;
  transition: transform 0.2s;
  margin-left: 4px;
  flex-shrink: 0;
}

.chevron-icon.rotated {
  transform: rotate(180deg);
}

/* 下拉菜单 */
.novel-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  z-index: 50;
}

.dropdown-overlay {
  position: fixed;
  inset: 0;
  z-index: 40;
}

.dropdown-content {
  position: relative;
  width: 280px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1),
    0 10px 10px -5px rgba(0, 0, 0, 0.04);
  z-index: 50;
  overflow: hidden;
}

.dropdown-enter-active {
  animation: dropdown-in 0.2s ease-out;
}

.dropdown-leave-active {
  animation: dropdown-out 0.15s ease-in;
}

@keyframes dropdown-in {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes dropdown-out {
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(-8px);
  }
}

/* 搜索框 */
.dropdown-search {
  padding: 8px 12px;
  margin-bottom: 4px;
}

.search-wrapper {
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
  transition: color 0.2s;
}

.search-wrapper:focus-within .search-icon {
  color: #2563eb;
}

.search-input {
  width: 100%;
  padding: 8px 12px 8px 36px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  transition: all 0.2s;
}

.search-input:focus {
  background: white;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.search-input::placeholder {
  color: #94a3b8;
}

/* 标签 */
.dropdown-label {
  padding: 8px 12px;
  font-size: 11px;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

/* 加载状态 */
.loading-state {
  padding: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #64748b;
  font-size: 12px;
}

/* 小说列表 */
.novel-list {
  max-height: 240px;
  overflow-y: auto;
  padding: 4px 0;
}

.novel-list::-webkit-scrollbar {
  width: 6px;
}

.novel-list::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 3px;
}

.novel-list::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.novel-list::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

.novel-item {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border: none;
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 15px;
  font-weight: 500;
  color: #475569;
}

.novel-item:hover {
  background: #eff6ff;
  color: #2563eb;
}

.novel-item.active {
  color: #2563eb;
  background: #eff6ff;
  font-weight: 600;
}

.novel-item-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.check-icon {
  width: 16px;
  height: 16px;
  color: #2563eb;
  flex-shrink: 0;
  margin-left: 8px;
}

/* 空状态 */
.empty-state {
  padding: 24px;
  text-align: center;
  color: #94a3b8;
  font-size: 12px;
}

/* 底部操作 */
.dropdown-footer {
  border-top: 1px solid #f1f5f9;
  margin-top: 8px;
  padding: 8px;
}

.manage-btn {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border: none;
  background: transparent;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s;
}

.manage-btn:hover {
  background: #f8fafc;
  color: #0f172a;
}

.manage-btn svg {
  width: 16px;
  height: 16px;
}
</style>

