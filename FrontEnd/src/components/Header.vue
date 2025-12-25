<template>
  <header class="app-header">
    <div class="header-left">
      <div class="window-controls">
        <span class="window-control bg-red-500"></span>
        <span class="window-control bg-yellow-500"></span>
        <span class="window-control bg-green-500"></span>
      </div>
      <div class="brand">
        <div class="brand-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path
              d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </div>
        <span class="brand-name"
          >StoryX <span class="brand-name-accent">Pro</span></span
        >
      </div>
      <nav class="nav-tabs">
        <button
          :class="['nav-tab', { 'nav-tab-active': activeTab === 'dashboard' }]"
          @click="handleTabClick('dashboard')"
        >
          项目看板
        </button>
        <button
          :class="['nav-tab', { 'nav-tab-active': activeTab === 'assets' }]"
          @click="handleTabClick('assets')"
        >
          素材库
        </button>
        <button
          :class="['nav-tab', { 'nav-tab-active': activeTab === 'workflow' }]"
          @click="handleTabClick('workflow')"
        >
          工作流
        </button>
      </nav>
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
          placeholder="全局检索..."
          class="search-input"
          @input="handleSearch"
        />
      </div>
      <div class="divider"></div>
      <button class="btn-new" @click="handleCreate">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        新建
      </button>
      <div class="user-menu-wrapper">
        <div
          class="user-avatar"
          :class="{ 'user-avatar-active': showUserMenu }"
          @click="toggleUserMenu"
        >
          <svg
            v-if="!userInfo?.avatar"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          <img v-else :src="userInfo.avatar" :alt="userInfo.name || 'User'" />
        </div>
        <transition name="dropdown">
          <div v-if="showUserMenu" class="user-menu-dropdown">
            <div class="user-menu-header">
              <div class="user-menu-avatar">
                <svg
                  v-if="!userInfo?.avatar"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <img
                  v-else
                  :src="userInfo.avatar"
                  :alt="userInfo.name || 'User'"
                />
              </div>
              <div class="user-menu-info">
                <div class="user-menu-name">
                  {{ userInfo?.name || userInfo?.email || "用户" }}
                </div>
                <div class="user-menu-email">{{ userInfo?.email || "" }}</div>
              </div>
            </div>
            <div class="user-menu-divider"></div>
            <div class="user-menu-items">
              <button class="user-menu-item" @click="handleProfile">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                个人中心
              </button>
              <button
                class="user-menu-item user-menu-item-danger"
                @click="handleLogout"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
                退出登录
              </button>
            </div>
          </div>
        </transition>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { useUserStore } from "@/stores";

const props = defineProps({
  activeTab: {
    type: String,
    default: "dashboard",
  },
});

const emit = defineEmits(["tab-change", "search", "create"]);

const router = useRouter();
const userStore = useUserStore();
const searchQuery = ref("");
const showUserMenu = ref(false);

const userInfo = computed(() => userStore.userInfo);

function handleTabClick(tab) {
  emit("tab-change", tab);
}

function handleSearch() {
  emit("search", searchQuery.value);
}

function handleCreate() {
  emit("create");
}

function toggleUserMenu() {
  showUserMenu.value = !showUserMenu.value;
}

function handleProfile() {
  showUserMenu.value = false;
  router.push("/profile");
}

function handleLogout() {
  showUserMenu.value = false;
  userStore.logout();
  router.push("/login");
}

// 点击外部关闭菜单
function handleClickOutside(event) {
  const wrapper = event.target.closest(".user-menu-wrapper");
  if (!wrapper) {
    showUserMenu.value = false;
  }
}

onMounted(() => {
  document.addEventListener("click", handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener("click", handleClickOutside);
});
</script>

<style scoped>
.app-header {
  height: 56px;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(30px);
  -webkit-backdrop-filter: blur(30px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.01);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  position: sticky;
  top: 0;
  z-index: 40;
  -webkit-app-region: drag;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 24px;
  -webkit-app-region: no-drag;
}

.window-controls {
  display: flex;
  gap: 8px;
  margin-right: 8px;
}

.window-control {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  display: inline-block;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand-icon {
  width: 28px;
  height: 28px;
  background: #2563eb;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 16px rgba(37, 99, 235, 0.3);
}

.brand-icon svg {
  width: 16px;
  height: 16px;
  color: white;
  stroke-width: 2.5;
}

.brand-name {
  font-size: 13px;
  font-weight: 800;
  letter-spacing: -0.025em;
  text-transform: uppercase;
  color: #111827;
}

.brand-name-accent {
  color: #2563eb;
}

.nav-tabs {
  display: flex;
  align-items: center;
  background: rgba(226, 232, 240, 0.5);
  padding: 4px;
  border-radius: 12px;
  margin-left: 16px;
}

.nav-tab {
  padding: 6px 16px;
  font-size: 11px;
  font-weight: 500;
  color: #64748b;
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  -webkit-app-region: no-drag;
}

.nav-tab:hover {
  color: #1e293b;
}

.nav-tab-active {
  background: white;
  color: #2563eb;
  font-weight: 700;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
  -webkit-app-region: no-drag;
}

.search-box {
  position: relative;
}

.search-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  width: 14px;
  height: 14px;
  color: #94a3b8;
  pointer-events: none;
}

.search-input {
  width: 192px;
  background: rgba(241, 245, 249, 0.8);
  border: none;
  border-radius: 8px;
  padding: 8px 12px 8px 36px;
  font-size: 11px;
  outline: none;
  transition: all 0.2s;
}

.search-input:focus {
  background: white;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
}

.search-input::placeholder {
  color: #94a3b8;
}

.divider {
  height: 20px;
  width: 1px;
  background: #e2e8f0;
}

.btn-new {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #111827;
  color: white;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 700;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.btn-new:hover {
  background: #000;
}

.btn-new:active {
  transform: scale(0.97);
}

.btn-new svg {
  width: 14px;
  height: 14px;
  stroke-width: 2.5;
}

/* 用户菜单 */
.user-menu-wrapper {
  position: relative;
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
  overflow: hidden;
}

.user-avatar:hover {
  border-color: rgba(37, 99, 235, 0.3);
  transform: scale(1.05);
}

.user-avatar-active {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.user-avatar svg {
  width: 18px;
  height: 18px;
  color: white;
  stroke-width: 2;
}

.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-menu-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  border: 1px solid #e2e8f0;
  min-width: 240px;
  overflow: hidden;
  z-index: 100;
}

.user-menu-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #f8fafc;
}

.user-menu-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
}

.user-menu-avatar svg {
  width: 22px;
  height: 22px;
  color: white;
  stroke-width: 2;
}

.user-menu-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-menu-info {
  flex: 1;
  min-width: 0;
}

.user-menu-name {
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-menu-email {
  font-size: 11px;
  color: #64748b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-menu-divider {
  height: 1px;
  background: #e2e8f0;
  margin: 4px 0;
}

.user-menu-items {
  padding: 4px;
}

.user-menu-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: transparent;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #475569;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.user-menu-item:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.user-menu-item svg {
  width: 16px;
  height: 16px;
  stroke-width: 2;
  flex-shrink: 0;
}

.user-menu-item-danger {
  color: #dc2626;
}

.user-menu-item-danger:hover {
  background: #fef2f2;
  color: #dc2626;
}

/* 下拉菜单动画 */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
}

.dropdown-enter-from {
  opacity: 0;
  transform: translateY(-8px) scale(0.95);
}

.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.95);
}
</style>
