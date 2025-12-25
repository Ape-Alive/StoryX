<template>
  <aside class="sidebar" :class="{ 'sidebar-collapsed': isCollapsed }">
    <div class="sidebar-content">
      <!-- Logo区域 -->
      <div class="sidebar-logo" @click="toggleCollapse">
        <div class="logo-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="9" y1="3" x2="9" y2="21"></line>
          </svg>
        </div>
        <span v-if="!isCollapsed" class="logo-text">StoryX</span>
      </div>

      <!-- 菜单区域 -->
      <nav class="sidebar-nav">
        <!-- 创作流程 -->
        <div class="nav-section">
          <div v-if="!isCollapsed" class="nav-section-title">创作流程</div>
          <div class="nav-items">
            <Tooltip
              v-for="item in creationMenu"
              :key="item.key"
              :content="item.label"
              position="right"
              :disabled="!isCollapsed"
            >
              <a
                :href="item.path || '#'"
                @click.prevent="handleMenuClick(item)"
                class="nav-item"
                :class="{ 'nav-item-active': activeKey === item.key }"
              >
                <div class="nav-item-icon">
                  <svg
                    v-if="item.icon === 'file-text'"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    <path
                      d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                    ></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10 9 9 9 8 9"></polyline>
                  </svg>
                  <svg
                    v-else-if="item.icon === 'grid'"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    <rect x="3" y="3" width="7" height="7"></rect>
                    <rect x="14" y="3" width="7" height="7"></rect>
                    <rect x="14" y="14" width="7" height="7"></rect>
                    <rect x="3" y="14" width="7" height="7"></rect>
                  </svg>
                  <svg
                    v-else-if="item.icon === 'users'"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                  <svg
                    v-else-if="item.icon === 'video'"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    <polygon points="23 7 16 12 23 17 23 7"></polygon>
                    <rect
                      x="1"
                      y="5"
                      width="15"
                      height="14"
                      rx="2"
                      ry="2"
                    ></rect>
                  </svg>
                  <svg
                    v-else
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    <circle cx="12" cy="12" r="10"></circle>
                  </svg>
                </div>
                <span v-if="!isCollapsed" class="nav-item-label">{{
                  item.label
                }}</span>
                <span
                  v-if="!isCollapsed && activeKey === item.key"
                  class="nav-item-dot"
                ></span>
              </a>
            </Tooltip>
          </div>
        </div>

        <!-- 项目管理 -->
        <div class="nav-section">
          <div v-if="!isCollapsed" class="nav-section-title">项目管理</div>
          <div class="nav-items">
            <Tooltip
              v-for="item in projectMenu"
              :key="item.key"
              :content="item.label"
              position="right"
              :disabled="!isCollapsed"
            >
              <a
                :href="item.path || '#'"
                @click.prevent="handleMenuClick(item)"
                class="nav-item"
                :class="{ 'nav-item-active': activeKey === item.key }"
              >
                <div class="nav-item-icon">
                  <svg
                    v-if="item.icon === 'settings'"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    <circle cx="12" cy="12" r="3"></circle>
                    <path
                      d="M12 1v6m0 6v6m9-9h-6m-6 0H3m15.364 6.364l-4.243-4.243m-4.242 0L5.636 17.364m12.728 0l-4.243-4.243m-4.242 0L5.636 6.636"
                    ></path>
                  </svg>
                  <svg
                    v-else
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    <circle cx="12" cy="12" r="10"></circle>
                  </svg>
                </div>
                <span v-if="!isCollapsed" class="nav-item-label">{{
                  item.label
                }}</span>
                <span
                  v-if="!isCollapsed && activeKey === item.key"
                  class="nav-item-dot"
                ></span>
              </a>
            </Tooltip>
          </div>
        </div>
      </nav>

      <!-- 用户信息区域 -->
      <div class="sidebar-user">
        <div class="user-info">
          <!-- 展开状态 -->
          <template v-if="!isCollapsed">
            <div class="user-avatar">
              <span v-if="!userAvatar">
                {{ userInitial }}
              </span>
              <img v-else :src="userAvatar" :alt="userName" />
            </div>
            <div class="user-details">
              <div class="user-name">{{ userName }}</div>
              <div class="user-plan">{{ userPlan }}</div>
            </div>
            <div class="user-actions">
              <Tooltip content="个人中心" position="top">
                <button class="user-action-btn" @click="handleProfile">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                </button>
              </Tooltip>
              <Tooltip content="退出登录" position="top">
                <button
                  class="user-action-btn user-action-btn-danger"
                  @click="handleLogout"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                </button>
              </Tooltip>
            </div>
          </template>
          <!-- 折叠状态 - 使用 Popover -->
          <Popover
            v-else
            position="rt"
            trigger="hover"
            :popup-offset="8"
            class="user-popover"
          >
            <template #content>
              <div class="user-popover-content">
                <button class="user-popover-item" @click="handleProfile">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  <span>个人中心</span>
                </button>
                <button
                  class="user-popover-item user-popover-item-danger"
                  @click="handleLogout"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                  <span>退出登录</span>
                </button>
              </div>
            </template>
            <div class="user-avatar">
              <span v-if="!userAvatar">
                {{ userInitial }}
              </span>
              <img v-else :src="userAvatar" :alt="userName" />
            </div>
          </Popover>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { Tooltip, Popover } from "@arco-design/web-vue";
import { useUserStore } from "@/stores";

const props = defineProps({
  activeKey: {
    type: String,
    default: "",
  },
});

const emit = defineEmits(["menu-click", "collapse-change"]);

const router = useRouter();
const userStore = useUserStore();
const isCollapsed = ref(false);

// 用户信息
const userInfo = computed(() => userStore.userInfo || {});
const userName = computed(
  () => userInfo.value.name || userInfo.value.email || "User"
);
const userAvatar = computed(() => userInfo.value.avatar);
const userPlan = computed(() => userInfo.value.plan || "Pro Plan");
const userInitial = computed(() => {
  const name = userName.value;
  if (name && name.length > 0) {
    return name.charAt(0).toUpperCase();
  }
  return "U";
});

// 创作流程菜单
const creationMenu = [
  {
    key: "text-source",
    label: "文本来源",
    icon: "file-text",
    path: "/project/text-source",
  },
  {
    key: "script-structure",
    label: "剧本结构化",
    icon: "grid",
    path: "/project/script-structure",
  },
  {
    key: "character-modeling",
    label: "角色建模",
    icon: "users",
    path: "/project/character-modeling",
  },
  {
    key: "audio-video",
    label: "音视频生成",
    icon: "video",
    path: "/project/audio-video",
  },
];

// 项目管理菜单
const projectMenu = [
  {
    key: "project-config",
    label: "项目配置",
    icon: "settings",
    path: "/project/project-config",
  },
];

function toggleCollapse() {
  isCollapsed.value = !isCollapsed.value;
  emit("collapse-change", isCollapsed.value);
}

function handleMenuClick(item) {
  emit("menu-click", item);
  // 如果菜单项有 path，则跳转到对应路由
  if (item.path) {
    router.push(item.path);
  }
}

function handleProfile() {
  router.push("/profile");
}

function handleLogout() {
  userStore.logout();
  router.push("/login");
}
</script>

<style scoped>
.sidebar {
  width: 240px;
  height: 100vh;
  background: white;
  border-right: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
  position: fixed;
  left: 0;
  top: 0;
  z-index: 30;
  overflow: hidden;
}

.sidebar-collapsed {
  width: 64px;
}

.sidebar-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 20px 0 0;
}

/* Logo区域 */
.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 20px 24px;
  cursor: pointer;
  transition: padding 0.3s ease;
  border-bottom: 1px solid #f1f5f9;
  margin-bottom: 24px;
}

.sidebar-collapsed .sidebar-logo {
  padding: 0 20px 24px;
  justify-content: center;
}

.logo-icon {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.logo-icon svg {
  width: 18px;
  height: 18px;
  color: white;
  stroke-width: 2.5;
}

.logo-text {
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.02em;
  white-space: nowrap;
}

/* 菜单导航 */
.sidebar-nav {
  flex: 1;
  overflow-y: auto;
  padding: 0 12px;
  margin-bottom: auto;
}

.nav-section {
  margin-bottom: 32px;
}

.nav-section-title {
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0 12px;
  margin-bottom: 12px;
  transition: opacity 0.3s ease;
}

.sidebar-collapsed .nav-section-title {
  opacity: 0;
  height: 0;
  margin: 0;
  padding: 0;
  overflow: hidden;
}

.nav-items {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 10px;
  color: #475569;
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
  position: relative;
  cursor: pointer;
}

.sidebar-collapsed .nav-item {
  justify-content: center;
  padding: 12px;
}

.nav-item:hover {
  background: #f8fafc;
  color: #0f172a;
}

.nav-item-active {
  background: rgba(102, 126, 234, 0.1);
  color: #667eea;
  font-weight: 600;
}

.nav-item-icon {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.nav-item-icon svg {
  width: 20px;
  height: 20px;
  stroke-width: 2;
}

.nav-item-label {
  flex: 1;
  white-space: nowrap;
  transition: opacity 0.3s ease;
}

.sidebar-collapsed .nav-item-label {
  opacity: 0;
  width: 0;
  overflow: hidden;
}

.nav-item-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #667eea;
  flex-shrink: 0;
}

.sidebar-collapsed .nav-item-dot {
  position: absolute;
  right: 8px;
}

/* 滚动条样式 */
.sidebar-nav::-webkit-scrollbar {
  width: 4px;
}

.sidebar-nav::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar-nav::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 2px;
}

.sidebar-nav::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* 用户信息区域 */
.sidebar-user {
  padding: 12px;
  border-top: 1px solid #e2e8f0;
  background: white;
  margin-top: auto;
  flex-shrink: 0;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
  position: relative;
  padding: 4px;
  border-radius: 8px;
  transition: background 0.2s;
}

.sidebar-collapsed .user-info {
  justify-content: center;
}

.user-info:hover {
  background: #f8fafc;
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: white;
  font-size: 16px;
  font-weight: 700;
  overflow: hidden;
}

.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-details {
  flex: 1;
  min-width: 0;
  margin-right: 8px;
}

.user-name {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-plan {
  font-size: 12px;
  color: #64748b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-start;
  opacity: 0;
  transform: translateX(8px);
  transition: all 0.2s;
  margin-left: auto;
}

.user-info:hover .user-actions {
  opacity: 1;
  transform: translateX(0);
}

.user-action-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  color: #475569;
  cursor: pointer;
  transition: all 0.2s;
  padding: 0;
}

.user-action-btn:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
  color: #0f172a;
}

.user-action-btn-danger {
  color: #dc2626;
}

.user-action-btn-danger:hover {
  background: #fef2f2;
  border-color: #fecaca;
  color: #dc2626;
}

.user-action-btn svg {
  width: 16px;
  height: 16px;
  stroke-width: 2;
}

/* Popover 内容样式 */
.user-popover-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 4px;
  min-width: 140px;
}

.user-popover-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border: none;
  background: transparent;
  color: #475569;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s;
  text-align: left;
  width: 100%;
}

.user-popover-item:hover {
  background: #f8fafc;
  color: #0f172a;
}

.user-popover-item-danger {
  color: #dc2626;
}

.user-popover-item-danger:hover {
  background: #fef2f2;
  color: #dc2626;
}

.user-popover-item svg {
  width: 16px;
  height: 16px;
  stroke-width: 2;
  flex-shrink: 0;
}
</style>
