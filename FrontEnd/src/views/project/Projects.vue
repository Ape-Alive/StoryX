<template>
  <div class="projects-page">
    <!-- 头部组件 -->
    <Header
      :active-tab="'dashboard'"
      @tab-change="handleTabChange"
      @search="handleSearch"
      @create="openModal('create')"
    />

    <!-- 主内容区域 -->
    <main class="main-content">
      <!-- 统计卡片区域 -->
      <div class="stats-grid">
        <div
          v-for="stat in stats"
          :key="stat.label"
          @click="filterStatus = stat.statusKey"
          :class="[
            filterStatus === stat.statusKey ? 'stat-card-active' : '',
            'stat-card',
          ]"
        >
          <div class="stat-indicator"></div>
          <div class="stat-header">
            <div :class="stat.bg" class="stat-icon">
              <svg
                v-if="stat.iconComponent === 'LayersIcon'"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                <polyline points="2 17 12 22 22 17"></polyline>
                <polyline points="2 12 12 17 22 12"></polyline>
              </svg>
              <svg
                v-else-if="stat.iconComponent === 'CpuIcon'"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect>
                <rect x="9" y="9" width="6" height="6"></rect>
                <line x1="9" y1="1" x2="9" y2="4"></line>
                <line x1="15" y1="1" x2="15" y2="4"></line>
                <line x1="9" y1="20" x2="9" y2="23"></line>
                <line x1="15" y1="20" x2="15" y2="23"></line>
                <line x1="20" y1="9" x2="23" y2="9"></line>
                <line x1="20" y1="14" x2="23" y2="14"></line>
                <line x1="1" y1="9" x2="4" y2="9"></line>
                <line x1="1" y1="14" x2="4" y2="14"></line>
              </svg>
              <svg
                v-else-if="stat.iconComponent === 'CheckIcon'"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <svg
                v-else-if="stat.iconComponent === 'AlertIcon'"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <polygon
                  points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"
                ></polygon>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
            <div v-if="stat.statusKey === 'all'" class="stat-badge">Active</div>
          </div>
          <div class="stat-content">
            <span class="stat-label">{{ stat.label }}</span>
            <div class="stat-value-wrapper">
              <span class="stat-value">{{ stat.value }}</span>
              <span class="stat-unit">项目</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 列表控制栏 -->
      <div v-if="projects.length > 0" class="list-controls">
        <div class="controls-left">
          <h2 class="controls-title">资产概览</h2>
          <span class="controls-count">
            {{ filteredProjects.length }} 项已就绪
          </span>
        </div>
        <div class="controls-right">
          <div class="view-mode-switch">
            <button
              @click="viewMode = 'grid'"
              :class="viewMode === 'grid' ? 'view-mode-active' : ''"
              class="view-mode-btn"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
              </svg>
            </button>
            <button
              @click="viewMode = 'list'"
              :class="viewMode === 'list' ? 'view-mode-active' : ''"
              class="view-mode-btn"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <line x1="8" y1="6" x2="21" y2="6"></line>
                <line x1="8" y1="12" x2="21" y2="12"></line>
                <line x1="8" y1="18" x2="21" y2="18"></line>
                <line x1="3" y1="6" x2="3.01" y2="6"></line>
                <line x1="3" y1="12" x2="3.01" y2="12"></line>
                <line x1="3" y1="18" x2="3.01" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- 核心内容展示区 -->
      <div class="content-area">
        <!-- 初始引导空状态 -->
        <div
          v-if="projects.length === 0 && !isDataLoading"
          ref="emptyStateRef"
          class="empty-state"
          :style="{ height: emptyStateMaxHeight + 'px', overflowY: 'auto' }"
        >
          <div @click="openModal('create')" class="empty-create-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </div>

          <div class="empty-content">
            <div class="empty-text">
              <h2 class="empty-title">开启您的创意之旅</h2>
              <p class="empty-description">
                StoryX Pro
                正在等待您的第一个脚本输入。只需几秒钟，即可将文字转化为令人惊叹的
                AI 动画。
              </p>
            </div>

            <div class="empty-steps">
              <div class="empty-step">
                <div class="empty-step-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M12 20h9"></path>
                    <path
                      d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"
                    ></path>
                  </svg>
                </div>
                <span class="empty-step-label">编写脚本</span>
              </div>
              <svg
                class="empty-arrow"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
              <div class="empty-step">
                <div class="empty-step-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path>
                  </svg>
                </div>
                <span class="empty-step-label">引擎处理</span>
              </div>
              <svg
                class="empty-arrow"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
              <div class="empty-step">
                <div class="empty-step-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="18" cy="5" r="3"></circle>
                    <circle cx="6" cy="12" r="3"></circle>
                    <circle cx="18" cy="19" r="3"></circle>
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                  </svg>
                </div>
                <span class="empty-step-label">预览导出</span>
              </div>
            </div>

            <button @click="openModal('create')" class="empty-action-btn">
              立即创建项目
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </div>
        </div>

        <!-- 筛选结果为空时的提示 -->
        <div
          v-else-if="
            projects.length > 0 &&
            filteredProjects.length === 0 &&
            !isDataLoading
          "
          class="filtered-empty-state"
        >
          <div class="filtered-empty-icon">
            <svg
              v-if="filterStatus === 'processing'"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect>
              <rect x="9" y="9" width="6" height="6"></rect>
              <line x1="9" y1="1" x2="9" y2="4"></line>
              <line x1="15" y1="1" x2="15" y2="4"></line>
              <line x1="9" y1="20" x2="9" y2="23"></line>
              <line x1="15" y1="20" x2="15" y2="23"></line>
              <line x1="20" y1="9" x2="23" y2="9"></line>
              <line x1="20" y1="14" x2="23" y2="14"></line>
              <line x1="1" y1="9" x2="4" y2="9"></line>
              <line x1="1" y1="14" x2="4" y2="14"></line>
            </svg>
            <svg
              v-else-if="filterStatus === 'completed'"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <svg
              v-else-if="filterStatus === 'failed'"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <polygon
                points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"
              ></polygon>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
              <polyline points="2 17 12 22 22 17"></polyline>
              <polyline points="2 12 12 17 22 12"></polyline>
            </svg>
          </div>
          <p class="filtered-empty-text">
            {{ getFilterEmptyText(filterStatus) }}无项目
          </p>
        </div>

        <!-- 网格视图 -->
        <div v-else-if="viewMode === 'grid'" class="projects-grid">
          <div
            v-for="project in filteredProjects"
            :key="project.id"
            class="project-card"
            @dblclick="handleProjectDoubleClick(project)"
          >
            <div class="project-card-actions">
              <button
                @click="openModal('edit', project)"
                class="card-action-btn"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path
                    d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
                  ></path>
                  <path
                    d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
                  ></path>
                </svg>
              </button>
              <button
                @click="confirmDelete(project)"
                class="card-action-btn card-action-btn-danger"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path
                    d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                  ></path>
                </svg>
              </button>
            </div>

            <div class="project-card-header">
              <span
                :class="getStatusStyles(project.status)"
                class="project-status"
              >
                {{ getStatusLabel(project.status) }}
              </span>
              <span class="project-mode">{{
                project.configMode || "default"
              }}</span>
            </div>

            <div class="project-card-body">
              <h3 class="project-title">{{ project.title }}</h3>
              <p class="project-description">
                {{ project.description || "无详细描述信息" }}
              </p>
            </div>

            <div v-if="isProcessing(project.status)" class="project-progress">
              <div class="progress-header">
                <span class="progress-label">Core processing</span>
                <span class="progress-value">{{ project.progress || 0 }}%</span>
              </div>
              <div class="progress-bar">
                <div
                  class="progress-fill status-shimmer"
                  :style="{ width: (project.progress || 0) + '%' }"
                ></div>
              </div>
            </div>

            <div class="project-card-footer">
              <div class="project-storage">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                  <line x1="8" y1="21" x2="16" y2="21"></line>
                  <line x1="12" y1="17" x2="12" y2="21"></line>
                </svg>
                <span class="storage-label">
                  {{ project.storageLocation || "local" }}
                </span>
              </div>
              <button
                v-if="
                  project.status === 'pending' || project.status === 'failed'
                "
                @click="startProcess(project.id)"
                class="project-start-btn"
              >
                启动执行
              </button>
              <span v-else class="project-updated">
                {{ formatDate(project.updatedAt) }}
              </span>
            </div>
          </div>
        </div>

        <!-- 表格视图 -->
        <div
          v-else-if="viewMode === 'list'"
          ref="tableWrapperRef"
          class="projects-table-wrapper"
          :style="{ maxHeight: tableMaxHeight + 'px' }"
        >
          <table class="projects-table">
            <thead>
              <tr>
                <th>项目标题</th>
                <th>状态</th>
                <th>模式</th>
                <th>描述</th>
                <th>存储位置</th>
                <th>进度</th>
                <th>更新时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="project in filteredProjects"
                :key="project.id"
                class="table-row"
                @dblclick="handleProjectDoubleClick(project)"
              >
                <td class="table-cell-title">
                  <div class="table-title-wrapper">
                    <span class="table-title">{{ project.title }}</span>
                  </div>
                </td>
                <td>
                  <span
                    :class="getStatusStyles(project.status)"
                    class="table-status"
                  >
                    {{ getStatusLabel(project.status) }}
                  </span>
                </td>
                <td>
                  <span class="table-mode">{{
                    project.configMode || "default"
                  }}</span>
                </td>
                <td class="table-cell-description">
                  <span class="table-description">
                    {{ project.description || "无详细描述信息" }}
                  </span>
                </td>
                <td>
                  <div class="table-storage">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
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
                    <span>{{ project.storageLocation || "local" }}</span>
                  </div>
                </td>
                <td>
                  <div
                    v-if="isProcessing(project.status)"
                    class="table-progress"
                  >
                    <div class="table-progress-bar">
                      <div
                        class="table-progress-fill status-shimmer"
                        :style="{ width: (project.progress || 0) + '%' }"
                      ></div>
                    </div>
                    <span class="table-progress-text">
                      {{ project.progress || 0 }}%
                    </span>
                  </div>
                  <span v-else class="table-progress-empty">-</span>
                </td>
                <td>
                  <span class="table-updated">
                    {{ formatDate(project.updatedAt) }}
                  </span>
                </td>
                <td>
                  <div class="table-actions">
                    <button
                      @click="openModal('edit', project)"
                      class="table-action-btn"
                      title="编辑"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                      >
                        <path
                          d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
                        ></path>
                        <path
                          d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
                        ></path>
                      </svg>
                    </button>
                    <button
                      v-if="
                        project.status === 'pending' ||
                        project.status === 'failed'
                      "
                      @click="startProcess(project.id)"
                      class="table-action-btn table-action-start"
                      title="启动执行"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                      >
                        <polygon points="5 3 19 12 5 21 5 3"></polygon>
                      </svg>
                    </button>
                    <button
                      @click="confirmDelete(project)"
                      class="table-action-btn table-action-danger"
                      title="删除"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                      >
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path
                          d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                        ></path>
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>

    <!-- 全局弹窗 -->
    <transition name="modal">
      <div v-if="modal.show" class="modal-overlay" @click="modal.show = false">
        <div class="modal-content" @click.stop>
          <!-- 头部 -->
          <div class="modal-header">
            <div class="modal-header-content">
              <span class="modal-subtitle">Project Workflow</span>
              <span class="modal-title">
                {{ modal.type === "create" ? "新建生产项目" : "项目参数配置" }}
              </span>
            </div>
            <button @click="modal.show = false" class="modal-close">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <!-- 表单区 -->
          <div class="modal-body">
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">
                  项目标题 <span class="form-required">*</span>
                </label>
                <input
                  v-model="form.title"
                  type="text"
                  class="form-input"
                  :class="{ 'form-input-error': formErrors.title }"
                  placeholder="起一个充满想象力的名字..."
                  @blur="validateField('title')"
                  @input="clearError('title')"
                />
              </div>
              <div class="form-group">
                <label class="form-label">存储策略</label>
                <select v-model="form.storageLocation" class="form-input">
                  <option value="local">本地文件系统 (Local)</option>
                  <option value="remote">云端对象存储 (OSS)</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">核心描述</label>
              <textarea
                v-model="form.description"
                rows="2"
                class="form-textarea"
                placeholder="该项目主要用于..."
              ></textarea>
            </div>

            <div class="form-section">
              <div class="form-section-header">
                <label class="form-label">运行脚本/小说文本</label>
                <div class="mode-switch">
                  <button
                    @click="form.configMode = 'default'"
                    :class="
                      form.configMode === 'default' ? 'mode-switch-active' : ''
                    "
                    class="mode-switch-btn"
                  >
                    标准
                  </button>
                  <button
                    @click="form.configMode = 'custom'"
                    :class="
                      form.configMode === 'custom' ? 'mode-switch-active' : ''
                    "
                    class="mode-switch-btn"
                  >
                    专家
                  </button>
                </div>
              </div>
              <textarea
                v-model="form.sourceText"
                rows="8"
                class="form-code-textarea"
                placeholder="在此粘贴脚本或文本数据内容..."
              ></textarea>
            </div>

            <!-- 专家模式配置 -->
            <div v-if="form.configMode === 'custom'" class="form-section">
              <div class="form-section-header">
                <label class="form-label">AI 模型配置</label>
              </div>

              <div class="form-grid">
                <!-- LLM 配置 -->
                <div class="form-group">
                  <label class="form-label">
                    LLM 模型 <span class="form-required">*</span>
                  </label>
                  <select
                    v-model="form.configLLM"
                    class="form-input"
                    :class="{ 'form-input-error': formErrors.configLLM }"
                    @blur="validateField('configLLM')"
                    @change="clearError('configLLM')"
                  >
                    <option value="">请选择 LLM 模型</option>
                    <option
                      v-for="model in configOptions.llm"
                      :key="model.id"
                      :value="model.id"
                    >
                      {{ model.displayName || model.name }}
                    </option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">
                    LLM API 密钥
                    <span v-if="form.configLLM" class="form-required">*</span>
                  </label>
                  <input
                    v-model="form.configLLMKey"
                    type="password"
                    class="form-input"
                    :class="{ 'form-input-error': formErrors.configLLMKey }"
                    placeholder="sk-xxxxxxxxxxxxx"
                    @blur="validateField('configLLMKey')"
                    @input="clearError('configLLMKey')"
                  />
                </div>

                <!-- 视频AI 配置 -->
                <div class="form-group">
                  <label class="form-label">
                    视频AI 模型 <span class="form-required">*</span>
                  </label>
                  <select
                    v-model="form.configVideoAI"
                    class="form-input"
                    :class="{ 'form-input-error': formErrors.configVideoAI }"
                    @blur="validateField('configVideoAI')"
                    @change="clearError('configVideoAI')"
                  >
                    <option value="">请选择视频AI模型</option>
                    <option
                      v-for="model in configOptions.video"
                      :key="model.id"
                      :value="model.id"
                    >
                      {{ model.displayName || model.name }}
                    </option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">
                    视频AI API 密钥
                    <span v-if="form.configVideoAI" class="form-required"
                      >*</span
                    >
                  </label>
                  <input
                    v-model="form.configVideoAIKey"
                    type="password"
                    class="form-input"
                    :class="{ 'form-input-error': formErrors.configVideoAIKey }"
                    placeholder="video-api-key-xxxxx"
                    @blur="validateField('configVideoAIKey')"
                    @input="clearError('configVideoAIKey')"
                  />
                </div>

                <!-- TTS 配置 -->
                <div class="form-group">
                  <label class="form-label">
                    TTS 模型 <span class="form-required">*</span>
                  </label>
                  <select
                    v-model="form.configTTS"
                    class="form-input"
                    :class="{ 'form-input-error': formErrors.configTTS }"
                    @blur="validateField('configTTS')"
                    @change="clearError('configTTS')"
                  >
                    <option value="">请选择 TTS 模型</option>
                    <option
                      v-for="model in configOptions.tts"
                      :key="model.id"
                      :value="model.id"
                    >
                      {{ model.displayName || model.name }}
                    </option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">
                    TTS API 密钥
                    <span v-if="form.configTTS" class="form-required">*</span>
                  </label>
                  <input
                    v-model="form.configTTSKey"
                    type="password"
                    class="form-input"
                    :class="{ 'form-input-error': formErrors.configTTSKey }"
                    placeholder="tts-api-key-xxxxx"
                    @blur="validateField('configTTSKey')"
                    @input="clearError('configTTSKey')"
                  />
                </div>

                <!-- 图片生成 配置 -->
                <div class="form-group">
                  <label class="form-label">
                    图片生成模型 <span class="form-required">*</span>
                  </label>
                  <select
                    v-model="form.configImageGen"
                    class="form-input"
                    :class="{ 'form-input-error': formErrors.configImageGen }"
                    @blur="validateField('configImageGen')"
                    @change="clearError('configImageGen')"
                  >
                    <option value="">请选择图片生成模型</option>
                    <option
                      v-for="model in configOptions.image"
                      :key="model.id"
                      :value="model.id"
                    >
                      {{ model.displayName || model.name }}
                    </option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">
                    图片生成 API 密钥
                    <span v-if="form.configImageGen" class="form-required"
                      >*</span
                    >
                  </label>
                  <input
                    v-model="form.configImageGenKey"
                    type="password"
                    class="form-input"
                    :class="{
                      'form-input-error': formErrors.configImageGenKey,
                    }"
                    placeholder="sd-api-key-xxxxx"
                    @blur="validateField('configImageGenKey')"
                    @input="clearError('configImageGenKey')"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- 底部操作 -->
          <div class="modal-footer">
            <button @click="modal.show = false" class="modal-cancel-btn">
              取消
            </button>
            <button @click="handleSave" class="modal-submit-btn">
              部署并开始执行
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import {
  ref,
  reactive,
  computed,
  onMounted,
  onUnmounted,
  nextTick,
  watch,
} from "vue";
import { useRouter } from "vue-router";
import { Modal, Message } from "@arco-design/web-vue";
import Header from "@/components/Header.vue";
import {
  getProjects,
  createProject,
  updateProject,
  deleteProject,
  processProject,
  getConfigOptions,
} from "@/api";
import { setLocalStorage } from "@/utils/storage";

const router = useRouter();

const projects = ref([]);
const searchQuery = ref("");
const filterStatus = ref("all");
const viewMode = ref("grid");
const isDataLoading = ref(true);
const tableWrapperRef = ref(null);
const tableMaxHeight = ref(600);
const emptyStateRef = ref(null);
const emptyStateMaxHeight = ref(600);

const stats = computed(() => {
  const all = projects.value.length;
  const proc = projects.value.filter((p) =>
    ["processing", "generating", "rendering"].includes(p.status)
  ).length;
  const comp = projects.value.filter((p) => p.status === "completed").length;
  const fail = projects.value.filter((p) => p.status === "failed").length;

  return [
    {
      label: "项目总数",
      value: all,
      iconComponent: "LayersIcon",
      bg: "stat-icon-blue",
      statusKey: "all",
    },
    {
      label: "执行中",
      value: proc,
      iconComponent: "CpuIcon",
      bg: "stat-icon-indigo",
      statusKey: "processing",
    },
    {
      label: "已完成",
      value: comp,
      iconComponent: "CheckIcon",
      bg: "stat-icon-emerald",
      statusKey: "completed",
    },
    {
      label: "异常终止",
      value: fail,
      iconComponent: "AlertIcon",
      bg: "stat-icon-rose",
      statusKey: "failed",
    },
  ];
});

const modal = reactive({
  show: false,
  type: "create",
  editingId: null,
});

const form = reactive({
  title: "",
  description: "",
  sourceText: "",
  storageLocation: "local",
  configMode: "default", // 配置模式：default使用全局配置，custom使用自定义配置
  // 专家模式配置
  configLLM: "",
  configLLMKey: "",
  configVideoAI: "",
  configVideoAIKey: "",
  configTTS: "",
  configTTSKey: "",
  configImageGen: "",
  configImageGenKey: "",
});

// AI模型配置选项
const configOptions = ref({
  llm: [],
  video: [],
  image: [],
  tts: [],
});

// 表单校验错误状态
const formErrors = reactive({
  title: false,
  description: false,
  sourceText: false,
  configLLM: false,
  configLLMKey: false,
  configVideoAI: false,
  configVideoAIKey: false,
  configTTS: false,
  configTTSKey: false,
  configImageGen: false,
  configImageGenKey: false,
});

const filteredProjects = computed(() => {
  let result = [...projects.value];

  if (filterStatus.value !== "all") {
    if (filterStatus.value === "processing") {
      result = result.filter((p) =>
        ["processing", "generating", "rendering"].includes(p.status)
      );
    } else {
      result = result.filter((p) => p.status === filterStatus.value);
    }
  }

  if (searchQuery.value) {
    result = result.filter((p) =>
      p.title.toLowerCase().includes(searchQuery.value.toLowerCase())
    );
  }

  return result.sort((a, b) => {
    return (
      new Date(b.updatedAt || b.createdAt) -
      new Date(a.updatedAt || a.createdAt)
    );
  });
});

// 加载项目列表
async function loadProjects() {
  try {
    isDataLoading.value = true;
    const params = {
      all: true,
    };
    const response = await getProjects(params);
    if (response.success && response.data) {
      projects.value = response.data.projects || [];
    }
  } catch (error) {
    console.error("加载项目列表失败:", error);
    showToast("加载项目列表失败", "error");
  } finally {
    isDataLoading.value = false;
  }
}

function getStatusLabel(status) {
  const map = {
    pending: "空闲中",
    processing: "分析中",
    reviewing: "审核中",
    generating: "图像生成",
    rendering: "视频渲染",
    completed: "已归档",
    failed: "已终止",
  };
  return map[status] || status;
}

function getFilterEmptyText(status) {
  const map = {
    all: "",
    processing: "执行中",
    completed: "已完成",
    failed: "异常终止",
  };
  return map[status] || "";
}

function getStatusStyles(status) {
  if (status === "completed") {
    return "status-emerald";
  }
  if (status === "failed") {
    return "status-rose";
  }
  if (["processing", "generating", "rendering"].includes(status)) {
    return "status-blue";
  }
  return "status-slate";
}

function isProcessing(status) {
  return ["processing", "generating", "rendering"].includes(status);
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

function handleTabChange(tab) {
  // 处理标签切换
  console.log("切换标签:", tab);
}

function handleSearch(query) {
  searchQuery.value = query;
}

function handleProjectDoubleClick(project) {
  // 使用 localStorage 存储当前项目ID
  setLocalStorage("currentProjectId", project.id);
  router.push("/project/text-source");
}

function openModal(type, project = null) {
  modal.type = type;
  // 清除错误状态
  formErrors.title = false;
  formErrors.description = false;
  formErrors.sourceText = false;
  formErrors.configLLM = false;
  formErrors.configLLMKey = false;
  formErrors.configVideoAI = false;
  formErrors.configVideoAIKey = false;
  formErrors.configTTS = false;
  formErrors.configTTSKey = false;
  formErrors.configImageGen = false;
  formErrors.configImageGenKey = false;

  if (type === "edit" && project) {
    modal.editingId = project.id;
    form.title = project.title || "";
    form.description = project.description || "";
    form.sourceText = project.sourceText || "";
    form.storageLocation = project.storageLocation || "local";
    form.configMode = project.configMode || "default";
    form.configLLM = project.configLLM || "";
    form.configLLMKey = project.configLLMKey || "";
    form.configVideoAI = project.configVideoAI || "";
    form.configVideoAIKey = project.configVideoAIKey || "";
    form.configTTS = project.configTTS || "";
    form.configTTSKey = project.configTTSKey || "";
    form.configImageGen = project.configImageGen || "";
    form.configImageGenKey = project.configImageGenKey || "";
  } else {
    form.title = "";
    form.description = "";
    form.sourceText = "";
    form.storageLocation = "local";
    form.configMode = "default";
    form.configLLM = "";
    form.configLLMKey = "";
    form.configVideoAI = "";
    form.configVideoAIKey = "";
    form.configTTS = "";
    form.configTTSKey = "";
    form.configImageGen = "";
    form.configImageGenKey = "";
  }
  modal.show = true;
}

// 清除字段错误
function clearError(field) {
  formErrors[field] = false;
}

// 校验单个字段
function validateField(field) {
  if (field === "title") {
    formErrors.title = !form.title || form.title.trim() === "";
  } else if (form.configMode === "custom") {
    // 专家模式下的校验
    if (field === "configLLM") {
      formErrors.configLLM = !form.configLLM;
    } else if (field === "configLLMKey") {
      formErrors.configLLMKey = form.configLLM && !form.configLLMKey;
    } else if (field === "configVideoAI") {
      formErrors.configVideoAI = !form.configVideoAI;
    } else if (field === "configVideoAIKey") {
      formErrors.configVideoAIKey =
        form.configVideoAI && !form.configVideoAIKey;
    } else if (field === "configTTS") {
      formErrors.configTTS = !form.configTTS;
    } else if (field === "configTTSKey") {
      formErrors.configTTSKey = form.configTTS && !form.configTTSKey;
    } else if (field === "configImageGen") {
      formErrors.configImageGen = !form.configImageGen;
    } else if (field === "configImageGenKey") {
      formErrors.configImageGenKey =
        form.configImageGen && !form.configImageGenKey;
    }
  }
  return !formErrors[field];
}

// 校验整个表单
function validateForm() {
  let isValid = true;

  // 校验标题
  if (!form.title || form.title.trim() === "") {
    formErrors.title = true;
    isValid = false;
  }

  // 专家模式下的校验
  if (form.configMode === "custom") {
    // LLM 配置校验
    if (form.configLLM && !form.configLLMKey) {
      formErrors.configLLMKey = true;
      isValid = false;
    }
    if (!form.configLLM) {
      formErrors.configLLM = true;
      isValid = false;
    }

    // 视频AI配置校验
    if (form.configVideoAI && !form.configVideoAIKey) {
      formErrors.configVideoAIKey = true;
      isValid = false;
    }
    if (!form.configVideoAI) {
      formErrors.configVideoAI = true;
      isValid = false;
    }

    // TTS配置校验
    if (form.configTTS && !form.configTTSKey) {
      formErrors.configTTSKey = true;
      isValid = false;
    }
    if (!form.configTTS) {
      formErrors.configTTS = true;
      isValid = false;
    }

    // 图片生成配置校验
    if (form.configImageGen && !form.configImageGenKey) {
      formErrors.configImageGenKey = true;
      isValid = false;
    }
    if (!form.configImageGen) {
      formErrors.configImageGen = true;
      isValid = false;
    }
  }

  return isValid;
}

async function handleSave() {
  // 表单校验
  if (!validateForm()) {
    showToast("请检查表单输入", "error");
    return;
  }

  try {
    // 准备提交的数据
    const submitData = {
      title: form.title,
      description: form.description,
      sourceText: form.sourceText,
      storageLocation: form.storageLocation,
      configMode: form.configMode,
    };

    // 专家模式下添加配置字段
    if (form.configMode === "custom") {
      submitData.configLLM = form.configLLM;
      submitData.configLLMKey = form.configLLMKey;
      submitData.configVideoAI = form.configVideoAI;
      submitData.configVideoAIKey = form.configVideoAIKey;
      submitData.configTTS = form.configTTS;
      submitData.configTTSKey = form.configTTSKey;
      submitData.configImageGen = form.configImageGen;
      submitData.configImageGenKey = form.configImageGenKey;
    }

    if (modal.type === "create") {
      const response = await createProject(submitData);
      if (response.success) {
        showToast("新生产任务已就绪");
        await loadProjects();
      }
    } else {
      const response = await updateProject(modal.editingId, submitData);
      if (response.success) {
        showToast("参数同步完成");
        await loadProjects();
      }
    }
    modal.show = false;
  } catch (error) {
    console.error("保存项目失败:", error);
    showToast(error.message || "保存项目失败", "error");
  }
}

async function confirmDelete(project) {
  Modal.confirm({
    title: "确认删除项目",
    content: `确定要删除项目 "${project.title}" 吗？此操作不可恢复。`,
    okText: "确认删除",
    cancelText: "取消",
    okButtonProps: {
      status: "danger",
    },
    onOk: async () => {
      try {
        await deleteProject(project.id);
        showToast("资产已从集群移除");
        await loadProjects();
      } catch (error) {
        console.error("删除项目失败:", error);
        showToast(error.message || "删除项目失败", "error");
      }
    },
  });
}

async function startProcess(id) {
  try {
    await processProject(id);
    showToast("正在启动 StoryX 渲染核心...");
    await loadProjects();
  } catch (error) {
    console.error("启动处理失败:", error);
    showToast(error.message || "启动处理失败", "error");
  }
}

function showToast(msg, type = "success") {
  if (type === "error") {
    Message.error(msg);
  } else {
    Message.success(msg);
  }
}

// 计算表格最大高度
function calculateTableMaxHeight() {
  nextTick(() => {
    if (tableWrapperRef.value && viewMode.value === "list") {
      const contentArea = tableWrapperRef.value.closest(".content-area");
      if (contentArea) {
        const contentAreaRect = contentArea.getBoundingClientRect();
        // 直接使用内容区域的可用高度
        const availableHeight = window.innerHeight - contentAreaRect.top - 32; // 32 是底部边距
        tableMaxHeight.value = Math.max(400, availableHeight);
      }
    }
  });
}

// 计算空状态最大高度
function calculateEmptyStateMaxHeight() {
  nextTick(() => {
    if (emptyStateRef.value) {
      const contentArea = emptyStateRef.value.closest(".content-area");
      if (contentArea) {
        const contentAreaRect = contentArea.getBoundingClientRect();
        // window.innerHeight 是浏览器窗口的可见高度（不包含工具栏、地址栏等）
        // 需要减去内容区域距离窗口顶部的高度，再减去底部边距，得到实际可用高度
        const availableHeight = window.innerHeight - contentAreaRect.top - 32; // 32 是底部边距
        emptyStateMaxHeight.value = Math.max(400, availableHeight);
      }
    }
  });
}

function handleResize() {
  calculateTableMaxHeight();
  calculateEmptyStateMaxHeight();
}

// 加载配置选项
async function loadConfigOptions() {
  try {
    const response = await getConfigOptions();
    if (response.success && response.data) {
      configOptions.value = {
        llm: response.data.llm || [],
        video: response.data.video || [],
        image: response.data.image || [],
        tts: response.data.tts || [],
      };
    }
  } catch (error) {
    console.error("加载配置选项失败:", error);
  }
}

onMounted(() => {
  loadProjects();
  loadConfigOptions();
  calculateTableMaxHeight();
  calculateEmptyStateMaxHeight();
  window.addEventListener("resize", handleResize);
});

onUnmounted(() => {
  window.removeEventListener("resize", handleResize);
});

// 监听视图模式变化，重新计算高度
watch(viewMode, () => {
  if (viewMode.value === "list") {
    calculateTableMaxHeight();
  }
});

// 监听项目列表变化，重新计算空状态高度
watch(
  () => [projects.value.length, isDataLoading.value],
  () => {
    if (projects.value.length === 0 && !isDataLoading.value) {
      // 使用 setTimeout 确保 DOM 已更新
      setTimeout(() => {
        calculateEmptyStateMaxHeight();
      }, 100);
    }
  }
);
</script>

<style scoped>
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap");

.projects-page {
  min-height: 100vh;
  /* background-color: #f4f7fa; */
  font-family: "Inter", -apple-system, "Microsoft YaHei", sans-serif;
  user-select: none;
}

.main-content {
  width: 100%;
  max-width: 1152px;
  margin: 0 auto;
  padding: 32px;
  display: flex;
  flex-direction: column;
  gap: 40px;
}

/* 统计卡片 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
}

@media (min-width: 1024px) {
  .stats-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.stat-card {
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.03);
  box-shadow: 0 4px 12px -2px rgba(0, 0, 0, 0.02);
  border-radius: 16px;
  padding: 24px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.stat-card:hover {
  border-color: rgba(37, 99, 235, 0.2);
  box-shadow: 0 12px 24px -8px rgba(37, 99, 235, 0.08);
  transform: translateY(-2px);
}

.stat-card-active {
  background: linear-gradient(180deg, white 0%, #f0f7ff 100%);
  border-color: rgba(37, 99, 235, 0.4);
  box-shadow: 0 16px 32px -12px rgba(37, 99, 235, 0.15);
}

.stat-indicator {
  position: absolute;
  bottom: 0;
  left: 50%;
  width: 0%;
  height: 3px;
  background: #2563eb;
  border-radius: 3px 3px 0 0;
  transform: translateX(-50%);
  transition: width 0.3s ease;
  box-shadow: 0 -2px 10px rgba(37, 99, 235, 0.5);
}

.stat-card-active .stat-indicator {
  width: 40%;
}

.stat-header {
  display: flex;
  width: 100%;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.stat-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid white;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  transition: transform 0.2s;
}

.stat-icon svg {
  width: 20px;
  height: 20px;
  stroke-width: 2;
}

.stat-icon-blue {
  background: #eff6ff;
  color: #2563eb;
}

.stat-icon-indigo {
  background: #eef2ff;
  color: #4f46e5;
}

.stat-icon-emerald {
  background: #ecfdf5;
  color: #10b981;
}

.stat-icon-rose {
  background: #fff1f2;
  color: #f43f5e;
}

.stat-badge {
  padding: 2px 8px;
  background: #ecfdf5;
  color: #059669;
  border-radius: 4px;
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.stat-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  font-size: 10px;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  line-height: 1;
}

.stat-value-wrapper {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.stat-empty-icons {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
}

.stat-empty-icons svg {
  width: 32px;
  height: 32px;
  color: #cbd5e1;
  opacity: 0.4;
}

.stat-value {
  font-size: 32px;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.02em;
  line-height: 1;
}

.stat-unit {
  font-size: 11px;
  font-weight: 700;
  color: #cbd5e1;
}

/* 列表控制栏 */
.list-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(226, 232, 240, 0.6);
  padding-bottom: 20px;
}

.controls-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.controls-title {
  font-size: 20px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: #0f172a;
}

.controls-count {
  font-size: 10px;
  font-weight: 800;
  color: #94a3b8;
  background: white;
  border: 1px solid #e2e8f0;
  padding: 2px 10px;
  border-radius: 9999px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.controls-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.view-mode-switch {
  display: flex;
  align-items: center;
  background: white;
  border: 1px solid #e2e8f0;
  padding: 2px;
  border-radius: 12px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.view-mode-btn {
  padding: 8px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.view-mode-btn svg {
  width: 14px;
  height: 14px;
  stroke-width: 2;
}

.view-mode-btn:hover {
  color: #475569;
}

.view-mode-active {
  background: #f1f5f9;
  color: #2563eb;
}

/* 内容区域 */
.content-area {
  flex: 1;
  position: relative;
  min-height: 440px;
}

.content-area:has(.empty-state) {
  min-height: auto;
}

/* 筛选结果为空状态 */
.filtered-empty-state {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100px 48px;
  min-height: 300px;
}

.filtered-empty-icon {
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
}

.filtered-empty-icon svg {
  width: 64px;
  height: 64px;
  color: #cbd5e1;
  stroke-width: 1.5;
  opacity: 0.5;
}

.filtered-empty-text {
  font-size: 15px;
  font-weight: 500;
  color: #94a3b8;
  text-align: center;
  letter-spacing: 0.02em;
}

/* 空状态 */
.empty-state {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 50px 48px 40px;
  background: white;
  border-radius: 40px;
  border: 1px solid #e2e8f0;
  background-image: radial-gradient(#e2e8f0 1px, transparent 1px);
  background-size: 24px 24px;
  box-shadow: 0 4px 12px -2px rgba(0, 0, 0, 0.05);
  z-index: 1;
  width: 100%;
  overflow-x: hidden;
  /* overflow-y 和 max-height 通过内联样式动态设置 */
}

.empty-create-btn {
  width: 96px;
  height: 96px;
  background: #2563eb;
  border-radius: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 32px;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 20px 40px -10px rgba(37, 99, 235, 0.4);
}

.empty-create-btn:hover {
  transform: scale(1.1);
}

.empty-create-btn:active {
  transform: scale(0.95);
}

.empty-create-btn svg {
  width: 48px;
  height: 48px;
  color: white;
  stroke-width: 2.5;
  transition: transform 0.3s;
}

.empty-create-btn:hover svg {
  transform: rotate(90deg);
}

.empty-content {
  text-align: center;
  max-width: 500px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
}

.empty-text {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.empty-title {
  font-size: 28px;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.02em;
  margin-bottom: 8px;
}

.empty-description {
  font-size: 14px;
  color: #64748b;
  line-height: 1.7;
  max-width: 480px;
}

.empty-steps {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px;
  opacity: 0.8;
  width: 100%;
  max-width: 500px;
}

.empty-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.empty-step-icon {
  width: 40px;
  height: 40px;
  border-radius: 16px;
  background: white;
  border: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.empty-step-icon svg {
  width: 20px;
  height: 20px;
  stroke-width: 2;
}

.empty-step-label {
  font-size: 10px;
  font-weight: 700;
  color: #64748b;
}

.empty-arrow {
  width: 16px;
  height: 16px;
  color: #cbd5e1;
  stroke-width: 2;
}

.empty-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #2563eb;
  color: white;
  padding: 16px 40px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 800;
  letter-spacing: -0.01em;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 10px 25px -5px rgba(37, 99, 235, 0.2);
}

.empty-action-btn:hover {
  background: #1d4ed8;
}

.empty-action-btn:active {
  transform: scale(0.97);
}

.empty-action-btn svg {
  width: 16px;
  height: 16px;
  stroke-width: 2.5;
}

/* 项目网格 */
.projects-grid {
  display: grid;
  grid-template-columns: repeat(1, 1fr);
  gap: 24px;
}

@media (min-width: 768px) {
  .projects-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .projects-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* 项目卡片 */
.project-card {
  background: white;
  border-radius: 28px;
  border: 1px solid #e2e8f0;
  padding: 24px;
  display: flex;
  flex-direction: column;
  height: 100%;
  transition: all 0.5s;
  position: relative;
  overflow: hidden;
  cursor: pointer;
}

.project-card:hover {
  border-color: #2563eb;
  box-shadow: 0 20px 50px -12px rgba(37, 99, 235, 0.05);
}

.project-card-actions {
  position: absolute;
  top: 20px;
  right: 20px;
  display: flex;
  gap: 6px;
  opacity: 0;
  transform: translateX(16px);
  transition: all 0.3s;
}

.project-card:hover .project-card-actions {
  opacity: 1;
  transform: translateX(0);
}

.card-action-btn {
  padding: 8px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.card-action-btn:hover {
  background: white;
}

.card-action-btn svg {
  width: 16px;
  height: 16px;
  color: #64748b;
  stroke-width: 2;
}

.card-action-btn-danger:hover {
  background: #fef2f2;
}

.card-action-btn-danger:hover svg {
  color: #ef4444;
}

.project-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.project-status {
  padding: 4px 12px;
  border-radius: 8px;
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border: 1px solid;
  transition: all 0.2s;
}

.status-emerald {
  background: #ecfdf5;
  color: #10b981;
  border-color: rgba(16, 185, 129, 0.5);
}

.status-rose {
  background: #fff1f2;
  color: #f43f5e;
  border-color: rgba(244, 63, 94, 0.5);
}

.status-blue {
  background: #eff6ff;
  color: #2563eb;
  border-color: rgba(37, 99, 235, 0.5);
}

.status-slate {
  background: #f8fafc;
  color: #94a3b8;
  border-color: rgba(148, 163, 184, 0.5);
}

.project-mode {
  font-size: 9px;
  font-weight: 800;
  color: #cbd5e1;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.project-card-body {
  flex: 1;
  margin-bottom: 20px;
}

.project-title {
  font-size: 16px;
  font-weight: 800;
  color: #0f172a;
  margin-bottom: 6px;
  transition: color 0.2s;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.project-card:hover .project-title {
  color: #2563eb;
}

.project-description {
  font-size: 12px;
  color: #94a3b8;
  line-height: 1.5;
  font-weight: 500;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  height: 36px;
}

/* 进度条 */
.project-progress {
  margin: 20px 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  font-weight: 800;
  margin-bottom: 4px;
}

.progress-label {
  color: #2563eb;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.progress-value {
  color: #0f172a;
}

.progress-bar {
  height: 6px;
  background: #f1f5f9;
  border-radius: 9999px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #2563eb;
  transition: width 1s;
  position: relative;
}

.status-shimmer {
  position: relative;
  overflow: hidden;
}

.status-shimmer::after {
  content: "";
  position: absolute;
  top: 0;
  left: -100%;
  width: 50%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.4),
    transparent
  );
  animation: shimmer-slide 2s infinite;
}

@keyframes shimmer-slide {
  100% {
    left: 200%;
  }
}

/* 项目卡片底部 */
.project-card-footer {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #f8fafc;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.project-storage {
  display: flex;
  align-items: center;
  gap: 8px;
}

.project-storage svg {
  width: 14px;
  height: 14px;
  color: #cbd5e1;
  stroke-width: 2;
}

.storage-label {
  font-size: 10px;
  font-weight: 800;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.project-start-btn {
  font-size: 11px;
  font-weight: 800;
  color: #2563eb;
  background: #eff6ff;
  padding: 6px 16px;
  border-radius: 12px;
  border: 1px solid rgba(37, 99, 235, 0.1);
  cursor: pointer;
  transition: all 0.2s;
}

.project-start-btn:hover {
  background: #2563eb;
  color: white;
}

.project-updated {
  font-size: 10px;
  font-weight: 700;
  color: #cbd5e1;
  font-style: italic;
}

/* 弹窗样式 */
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.modal-content {
  background: white;
  width: 100%;
  max-width: 672px;
  border-radius: 32px;
  box-shadow: 0 32px 80px -16px rgba(0, 0, 0, 0.3);
  position: relative;
  z-index: 10;
  display: flex;
  flex-direction: column;
  border: 1px solid white;
  overflow: hidden;
}

.modal-header {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px;
  border-bottom: 1px solid #f8fafc;
  background: rgba(248, 250, 252, 0.5);
}

.modal-header-content {
  display: flex;
  flex-direction: column;
}

.modal-subtitle {
  font-size: 10px;
  font-weight: 800;
  color: #2563eb;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  line-height: 1;
  margin-bottom: 4px;
}

.modal-title {
  font-size: 16px;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.01em;
}

.modal-close {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.modal-close:hover {
  background: white;
  border-color: #e2e8f0;
}

.modal-close svg {
  width: 20px;
  height: 20px;
  color: #94a3b8;
  stroke-width: 2;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 32px;
  display: flex;
  flex-direction: column;
  gap: 32px;
  max-height: 70vh;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(1, 1fr);
  gap: 32px;
}

@media (min-width: 768px) {
  .form-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label {
  font-size: 11px;
  font-weight: 800;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-left: 4px;
}

.form-required {
  color: #f43f5e;
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 16px 20px;
  background: #f1f5f9;
  border: 2px solid transparent;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 700;
  outline: none;
  transition: all 0.2s;
}

.form-input:focus,
.form-textarea:focus {
  background: white;
  border-color: rgba(37, 99, 235, 0.2);
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.05);
}

.form-input-error,
.form-textarea-error {
  background: #fef2f2;
  border-color: #f43f5e;
}

.form-input-error:focus,
.form-textarea-error:focus {
  background: white;
  border-color: #f43f5e;
  box-shadow: 0 0 0 4px rgba(244, 63, 94, 0.1);
}

.form-textarea {
  font-weight: 500;
  resize: none;
  font-family: inherit;
}

.form-code-textarea {
  width: 100%;
  padding: 20px 24px;
  background: #0f172a;
  color: #93c5fd;
  border: none;
  border-radius: 28px;
  font-family: "Monaco", "Courier New", monospace;
  font-size: 12px;
  line-height: 1.6;
  outline: none;
  resize: none;
}

.form-code-textarea:focus {
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1);
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-top: 16px;
  border-top: 1px solid #f8fafc;
}

.form-section-title {
  font-size: 12px;
  font-weight: 800;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 8px;
}

.form-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.mode-switch {
  display: flex;
  background: #f1f5f9;
  padding: 4px;
  border-radius: 8px;
  transform: scale(0.9);
}

.mode-switch-btn {
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 800;
  border: none;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.2s;
}

.mode-switch-active {
  background: white;
  color: #2563eb;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.modal-footer {
  padding: 32px;
  background: rgba(248, 250, 252, 0.5);
  border-top: 1px solid #f1f5f9;
  display: flex;
  gap: 16px;
}

.modal-cancel-btn {
  flex: 1;
  padding: 16px;
  font-size: 12px;
  font-weight: 800;
  color: #94a3b8;
  background: transparent;
  border: none;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  cursor: pointer;
  transition: color 0.2s;
}

.modal-cancel-btn:hover {
  color: #0f172a;
}

.modal-submit-btn {
  flex: 2;
  padding: 16px;
  background: #2563eb;
  color: white;
  border-radius: 22px;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 10px 25px -5px rgba(37, 99, 235, 0.2);
}

.modal-submit-btn:hover {
  background: #1d4ed8;
}

.modal-submit-btn:active {
  transform: scale(0.97);
}

/* 弹窗过渡动画 */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
  transform: scale(0.9) translateY(10px);
}

/* 表格视图 */
.projects-table-wrapper {
  width: 100%;
  background: white;
  border-radius: 24px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 12px -2px rgba(0, 0, 0, 0.02);
  overflow-y: auto;
  overflow-x: hidden;
}

.projects-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.projects-table thead {
  position: sticky;
  top: 0;
  z-index: 10;
  background: #f8fafc;
}

.projects-table thead {
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.projects-table th {
  padding: 16px 20px;
  text-align: left;
  font-size: 11px;
  font-weight: 800;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  white-space: nowrap;
}

.projects-table tbody tr {
  border-bottom: 1px solid #f1f5f9;
  transition: background 0.2s;
  cursor: pointer;
}

.projects-table tbody tr:hover {
  background: #f8fafc;
}

.projects-table tbody tr:last-child {
  border-bottom: none;
}

.projects-table td {
  padding: 20px;
  vertical-align: middle;
}

.table-cell-title {
  min-width: 200px;
}

.table-title-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
}

.table-title {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
  transition: color 0.2s;
}

.table-row:hover .table-title {
  color: #2563eb;
}

.table-status {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 8px;
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border: 1px solid;
}

.table-mode {
  font-size: 11px;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.table-cell-description {
  max-width: 300px;
}

.table-description {
  font-size: 12px;
  color: #64748b;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.table-storage {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.table-storage svg {
  width: 14px;
  height: 14px;
  color: #cbd5e1;
  stroke-width: 2;
  flex-shrink: 0;
}

.table-progress {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 120px;
}

.table-progress-bar {
  flex: 1;
  height: 6px;
  background: #f1f5f9;
  border-radius: 9999px;
  overflow: hidden;
  min-width: 80px;
}

.table-progress-fill {
  height: 100%;
  background: #2563eb;
  transition: width 1s;
  position: relative;
}

.table-progress-text {
  font-size: 11px;
  font-weight: 700;
  color: #2563eb;
  min-width: 35px;
  text-align: right;
}

.table-progress-empty {
  font-size: 12px;
  color: #cbd5e1;
}

.table-updated {
  font-size: 12px;
  color: #94a3b8;
  font-weight: 500;
  white-space: nowrap;
}

.table-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.table-action-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  padding: 0;
}

.table-action-btn:hover {
  background: white;
  border-color: #cbd5e1;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.table-action-btn svg {
  width: 14px;
  height: 14px;
  color: #64748b;
  stroke-width: 2;
}

.table-action-start:hover {
  background: #eff6ff;
  border-color: #2563eb;
}

.table-action-start:hover svg {
  color: #2563eb;
}

.table-action-danger:hover {
  background: #fef2f2;
  border-color: #f43f5e;
}

.table-action-danger:hover svg {
  color: #f43f5e;
}

/* 滚动条样式 */
::-webkit-scrollbar {
  width: 5px;
  height: 5px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 10px;
}

::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}
</style>
