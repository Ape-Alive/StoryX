<template>
  <div class="login-wrapper">
    <!-- 动态网格背景 -->
    <div class="background-layer">
      <div class="grid-pattern"></div>
      <div class="blob blob-1"></div>
      <div class="blob blob-2"></div>
    </div>

    <div class="login-container" :class="{ mounted: isMounted }">
      <!-- 登录主体卡片 -->
      <div class="login-card">
        <!-- 装饰线条 -->
        <div class="decorative-line"></div>

        <!-- 品牌头部 -->
        <div class="brand-header">
          <div class="brand-logo-group">
            <div class="brand-logo">
              <svg
                class="icon-shield"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                <path d="M9 12l2 2 4-4"></path>
              </svg>
            </div>
            <span class="brand-name">Enterprise OS</span>
          </div>
          <h2 class="page-title">登录</h2>
          <p class="page-subtitle">请输入您的身份凭证以访问受保护的资源。</p>
        </div>

        <form @submit.prevent="handleLogin" class="login-form">
          <!-- 账号输入组 -->
          <div class="input-group">
            <label class="input-label">账号</label>
            <div class="input-wrapper group-focus">
              <div class="input-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </div>
              <input
                v-model="formData.email"
                type="email"
                required
                class="form-input"
                :class="{ error: errors.email }"
                placeholder="邮箱或员工ID"
                @blur="validateEmail"
                @focus="clearError('email')"
              />
            </div>
            <div class="error-message-container">
              <span v-if="errors.email" class="error-message">{{
                errors.email
              }}</span>
            </div>
          </div>

          <!-- 密码输入组 -->
          <div class="input-group">
            <div class="input-label-row">
              <label class="input-label">密码</label>
              <button type="button" class="forgot-password">找回密码</button>
            </div>
            <div class="input-wrapper group-focus">
              <div class="input-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <rect
                    x="3"
                    y="11"
                    width="18"
                    height="11"
                    rx="2"
                    ry="2"
                  ></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
              </div>
              <input
                v-model="formData.password"
                :type="showPassword ? 'text' : 'password'"
                required
                class="form-input"
                :class="{ error: errors.password }"
                placeholder="请输入您的安全密码"
                @blur="validatePassword"
                @focus="clearError('password')"
                @keyup.enter="handleLogin"
              />
              <button
                type="button"
                class="password-toggle"
                @click="showPassword = !showPassword"
              >
                <svg
                  v-if="showPassword"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <path
                    d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
                  ></path>
                  <line x1="1" y1="1" x2="23" y2="23"></line>
                </svg>
                <svg
                  v-else
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              </button>
            </div>
            <div class="error-message-container">
              <span v-if="errors.password" class="error-message">{{
                errors.password
              }}</span>
            </div>
          </div>

          <!-- 登录错误提示 -->
          <div v-if="loginError" class="error-alert">
            {{ loginError }}
          </div>

          <!-- 登录按钮 -->
          <div class="submit-wrapper">
            <button type="submit" :disabled="isLoading" class="login-button">
              <div class="button-shimmer"></div>
              <span v-if="isLoading" class="button-content">
                <svg class="spinner-icon" viewBox="0 0 24 24" fill="none">
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    stroke-width="4"
                    opacity="0.25"
                  ></circle>
                  <path
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    opacity="0.75"
                  ></path>
                </svg>
              </span>
              <span v-else class="button-content">
                进入控制台
                <svg
                  class="arrow-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </span>
            </button>
          </div>
        </form>

        <!-- 辅助操作 -->
        <div class="footer-actions">
          <span class="footer-text">没有访问权限？</span>
          <button class="footer-link">申请账号</button>
        </div>
      </div>

      <!-- 页脚信息 -->
      <div class="page-footer">
        <div class="footer-links">
          <a href="#" class="footer-link-item">隐私合规</a>
          <a href="#" class="footer-link-item">运行状态</a>
          <a href="#" class="footer-link-item">联系支持</a>
        </div>
        <p class="footer-copyright">
          © 2025 Global Infrastructure Services Inc.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from "vue";
import { useRouter } from "vue-router";
// 方式一：从统一导出入口导入（推荐）
import { login } from "@/api";
// 方式二：从具体模块导入（也可以这样用）
// import { login } from '@/api/user'
import { useUserStore } from "@/stores";
import { validateEmail as validateEmailFormat } from "@/utils/common";

const router = useRouter();

const userStore = useUserStore();

// 状态管理
const isMounted = ref(false);
const showPassword = ref(false);
const isLoading = ref(false);
const loginError = ref("");

// 表单数据
const formData = reactive({
  email: "",
  password: "",
});

// 表单验证错误
const errors = reactive({
  email: "",
  password: "",
});

// 入场动画
onMounted(() => {
  setTimeout(() => {
    isMounted.value = true;
  }, 10);
});

// 清除错误
function clearError(field) {
  errors[field] = "";
  loginError.value = "";
}

// 验证邮箱
function validateEmail() {
  errors.email = "";
  if (!formData.email) {
    errors.email = "请输入邮箱地址";
    return false;
  }
  if (!validateEmailFormat(formData.email)) {
    errors.email = "请输入有效的邮箱地址";
    return false;
  }
  return true;
}

// 验证密码
function validatePassword() {
  errors.password = "";
  if (!formData.password) {
    errors.password = "请输入密码";
    return false;
  }
  if (formData.password.length < 6) {
    errors.password = "密码长度不能少于6位";
    return false;
  }
  return true;
}

// 处理登录
async function handleLogin() {
  loginError.value = "";

  const isEmailValid = validateEmail();
  const isPasswordValid = validatePassword();

  if (!isEmailValid || !isPasswordValid) {
    return;
  }

  isLoading.value = true;

  try {
    const response = await login({
      email: formData.email,
      password: formData.password,
    });

    if (response.success && response.data) {
      const { token, user } = response.data;
      userStore.login(token, user);

      // 登录成功，跳转到项目看板
      router.push("/");
    } else {
      loginError.value = response.message || "登录失败，请重试";
    }
  } catch (error) {
    console.error("登录错误:", error);
    loginError.value = error.message || "登录失败，请检查网络连接";
  } finally {
    isLoading.value = false;
  }
}
</script>

<style scoped>
.login-wrapper {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    "Helvetica Neue", Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
  color: #111827;
  background: #fafafa;
  position: relative;
  overflow: hidden;
}

/* 动态网格背景 */
.background-layer {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

.grid-pattern {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(#e5e7eb 1px, transparent 1px);
  background-size: 32px 32px;
  mask-image: radial-gradient(
    ellipse 50% 50% at 50% 50%,
    #000 70%,
    transparent 100%
  );
  opacity: 0.3;
}

.blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(128px);
  mix-blend-mode: multiply;
  opacity: 0.2;
  width: 384px;
  height: 384px;
  animation: blob 7s infinite;
}

.blob-1 {
  top: 0;
  left: -16px;
  background: #60a5fa;
}

.blob-2 {
  bottom: 0;
  right: -16px;
  background: #818cf8;
  animation-delay: 2s;
}

@keyframes blob {
  0% {
    transform: translate(0px, 0px) scale(1);
  }
  33% {
    transform: translate(30px, -50px) scale(1.1);
  }
  66% {
    transform: translate(-20px, 20px) scale(0.9);
  }
  100% {
    transform: translate(0px, 0px) scale(1);
  }
}

/* 登录容器 */
.login-container {
  width: 100%;
  max-width: 440px;
  z-index: 10;
  transition: all 1s ease;
  transform: translateY(48px);
  opacity: 0;
}

.login-container.mounted {
  transform: translateY(0);
  opacity: 1;
}

/* 登录卡片 */
.login-card {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border-radius: 24px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.5);
  padding: 40px;
  position: relative;
  overflow: hidden;
}

.decorative-line {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 4px;
  background: linear-gradient(to right, transparent, #3b82f6, transparent);
  opacity: 0.5;
}

/* 品牌头部 */
.brand-header {
  margin-bottom: 48px;
}

.brand-logo-group {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}

.brand-logo {
  width: 40px;
  height: 40px;
  background: #2563eb;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 16px rgba(37, 99, 235, 0.3);
}

.icon-shield {
  width: 24px;
  height: 24px;
  color: white;
  stroke-width: 2;
}

.brand-name {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.025em;
  background: linear-gradient(to right, #111827, #4b5563);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.page-title {
  font-size: 30px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 12px 0;
}

.page-subtitle {
  color: #6b7280;
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
}

/* 表单 */
.login-form {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.input-group {
  display: flex;
  flex-direction: column;
}

.input-label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.input-label {
  font-size: 13px;
  font-weight: 600;
  color: #4b5563;
  margin-left: 4px;
  transition: color 0.2s;
}

.group-focus:focus-within .input-label {
  color: #2563eb;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 16px;
  display: flex;
  align-items: center;
  pointer-events: none;
  color: #9ca3af;
  transition: color 0.2s;
}

.input-icon svg {
  width: 18px;
  height: 18px;
  stroke-width: 2;
}

.group-focus:focus-within .input-icon {
  color: #2563eb;
}

.form-input {
  width: 100%;
  padding: 14px 16px 14px 44px;
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  font-size: 14px;
  color: #111827;
  outline: none;
  transition: all 0.2s;
  box-sizing: border-box;
}

.form-input::placeholder {
  color: #9ca3af;
}

.form-input:focus {
  background: white;
  border-color: #2563eb;
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.05);
}

.form-input.error {
  border-color: #ef4444;
  background: white;
}

.password-toggle {
  position: absolute;
  right: 16px;
  display: flex;
  align-items: center;
  background: none;
  border: none;
  cursor: pointer;
  color: #9ca3af;
  padding: 4px;
  transition: color 0.2s;
}

.password-toggle:hover {
  color: #374151;
}

.password-toggle svg {
  width: 18px;
  height: 18px;
  stroke-width: 2;
}

.error-message-container {
  min-height: 17px;
  margin-top: 6px;
  margin-left: 4px;
  transition: opacity 0.2s ease;
}

.error-message {
  font-size: 12px;
  color: #ef4444;
  line-height: 1.4;
  display: block;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.error-alert {
  padding: 12px 16px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: #dc2626;
  font-size: 14px;
  text-align: center;
  animation: shake 0.4s ease-out;
}

@keyframes shake {
  0%,
  100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-10px);
  }
  75% {
    transform: translateX(10px);
  }
}

.forgot-password {
  font-size: 12px;
  color: #9ca3af;
  background: none;
  border: none;
  cursor: pointer;
  font-weight: 500;
  transition: color 0.2s;
  padding: 0;
}

.forgot-password:hover {
  color: #2563eb;
}

/* 登录按钮 */
.submit-wrapper {
  padding-top: 8px;
}

.login-button {
  position: relative;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: #111827;
  color: white;
  border: none;
  border-radius: 16px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s;
  overflow: hidden;
  box-shadow: 0 10px 25px rgba(17, 24, 39, 0.2);
}

.login-button:hover:not(:disabled) {
  background: #000;
  transform: translateY(-1px);
  box-shadow: 0 12px 30px rgba(17, 24, 39, 0.3);
}

.login-button:active:not(:disabled) {
  transform: scale(0.97);
}

.login-button:disabled {
  opacity: 0.8;
  cursor: wait;
}

.button-shimmer {
  position: absolute;
  inset: 0;
  width: 50%;
  height: 100%;
  background: linear-gradient(
    to right,
    transparent,
    rgba(255, 255, 255, 0.1),
    transparent
  );
  transform: translateX(-150%) skewX(-20deg);
  transition: transform 1.5s;
  pointer-events: none;
}

.login-button:hover .button-shimmer {
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  from {
    transform: translateX(-150%) skewX(-20deg);
  }
  to {
    transform: translateX(250%) skewX(-20deg);
  }
}

.button-content {
  display: flex;
  align-items: center;
  gap: 8px;
  position: relative;
  z-index: 1;
}

.arrow-icon {
  width: 16px;
  height: 16px;
  stroke-width: 2.5;
  transition: transform 0.2s;
}

.login-button:hover:not(:disabled) .arrow-icon {
  transform: translateX(4px);
}

.spinner-icon {
  width: 20px;
  height: 20px;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* 页脚操作 */
.footer-actions {
  margin-top: 40px;
  padding-top: 32px;
  border-top: 1px solid #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
}

.footer-text {
  color: #9ca3af;
}

.footer-link {
  color: #2563eb;
  font-weight: 600;
  background: none;
  border: none;
  cursor: pointer;
  text-decoration: none;
  transition: color 0.2s;
  padding: 0;
  text-underline-offset: 4px;
}

.footer-link:hover {
  color: #1d4ed8;
  text-decoration: underline;
}

/* 页面页脚 */
.page-footer {
  margin-top: 40px;
  text-align: center;
}

.footer-links {
  display: flex;
  justify-content: center;
  gap: 32px;
  font-size: 12px;
  font-weight: 500;
  margin-bottom: 24px;
}

.footer-link-item {
  color: #9ca3af;
  text-decoration: none;
  transition: color 0.2s;
}

.footer-link-item:hover {
  color: #111827;
}

.footer-copyright {
  font-size: 11px;
  color: #d1d5db;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-weight: 700;
  margin: 0;
}

/* 响应式设计 */
@media (max-width: 480px) {
  .login-card {
    padding: 32px 24px;
  }

  .page-title {
    font-size: 26px;
  }

  .brand-name {
    font-size: 18px;
  }

  .footer-links {
    flex-direction: column;
    gap: 16px;
  }
}
</style>
