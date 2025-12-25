<template>
  <div class="project-detail-page">
    <Sidebar
      :active-key="activeMenuKey"
      @menu-click="handleMenuClick"
      @collapse-change="handleCollapseChange"
    />
    <div
      class="detail-content"
      :class="{ 'content-collapsed': sidebarCollapsed }"
    >
      <router-view />
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { getLocalStorage } from "@/utils/storage";
import Sidebar from "@/components/Sidebar.vue";

const route = useRoute();
const router = useRouter();

// 从 localStorage 获取当前项目ID
const projectId = computed(() => getLocalStorage("currentProjectId", ""));

// 根据当前路由计算 activeMenuKey
const activeMenuKey = computed(() => {
  const path = route.path;
  if (path.includes("text-source")) return "text-source";
  if (path.includes("script-structure")) return "script-structure";
  if (path.includes("character-modeling")) return "character-modeling";
  if (path.includes("audio-video")) return "audio-video";
  if (path.includes("project-config")) return "project-config";
  return "text-source";
});

const sidebarCollapsed = ref(false);

function handleMenuClick(item) {
  // 菜单点击已由 Sidebar 组件处理路由跳转，这里不需要额外操作
}

function handleCollapseChange(collapsed) {
  sidebarCollapsed.value = collapsed;
}
</script>

<style scoped>
.project-detail-page {
  display: flex;
  min-height: 100vh;
  background-color: #f4f7fa;
}

.detail-content {
  flex: 1;
  margin-left: 240px;
  transition: margin-left 0.3s ease;
  min-height: 100vh;
}

.content-collapsed {
  margin-left: 64px;
}
</style>
