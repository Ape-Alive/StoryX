<template>
  <div class="profile-page">
    <Header :active-tab="'dashboard'" @tab-change="handleTabChange" />
    <main class="profile-content">
      <h1>个人中心</h1>
      <p>个人中心页面开发中...</p>
    </main>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import Header from '@/components/Header.vue'

const router = useRouter()

function handleTabChange(tab) {
  if (tab === 'dashboard') {
    router.push('/')
  }
}
</script>

<style scoped>
.profile-page {
  min-height: 100vh;
  background-color: #f4f7fa;
}

.profile-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px;
}

h1 {
  font-size: 24px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 16px;
}

p {
  color: #64748b;
}
</style>

