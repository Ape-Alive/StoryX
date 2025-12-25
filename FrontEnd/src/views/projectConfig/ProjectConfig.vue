<template>
  <div class="project-child-page">
    <div class="page-header">
      <h1>项目配置</h1>
      <p>项目ID：{{ projectId }}</p>
    </div>
    <div class="page-content">
      <!-- 项目配置内容 -->
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { getLocalStorage } from "@/utils/storage";

const projectId = computed(() => getLocalStorage("currentProjectId", ""));
</script>

<style scoped>
.project-child-page {
  min-height: 100vh;
  background-color: #f4f7fa;
  padding: 32px;
}

.page-header {
  margin-bottom: 24px;
}

h1 {
  font-size: 24px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 8px;
}

p {
  color: #64748b;
  font-size: 14px;
}

.page-content {
  background: white;
  border-radius: 12px;
  padding: 24px;
}
</style>

