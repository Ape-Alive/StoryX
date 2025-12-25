<template>
  <div id="app">
    <router-view />
  </div>
</template>

<script setup>
// App 组件现在只负责路由视图
</script>

<style>
#app {
  min-height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.main-content {
  text-align: center;
  color: #2c3e50;
  padding: 60px 20px;
}

.main-content h1 {
  margin-bottom: 16px;
}

.logout-btn {
  margin-top: 20px;
  padding: 10px 20px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s ease;
}

.logout-btn:hover {
  background: #5568d3;
}
</style>

