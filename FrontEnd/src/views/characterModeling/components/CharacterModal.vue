<template>
  <div v-if="visible" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-container">
      <div class="modal-header">
        <h2 class="modal-title">
          <div class="title-icon">
            <svg
              v-if="editingCharacter"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
              ></path>
              <path
                d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
              ></path>
            </svg>
            <svg
              v-else
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <line x1="19" y1="8" x2="19" y2="14"></line>
              <line x1="22" y1="11" x2="16" y2="11"></line>
            </svg>
          </div>
          {{ editingCharacter ? '编辑角色资产' : '创建新角色' }}
        </h2>
        <button @click="$emit('close')" class="close-button">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <form @submit.prevent="handleSubmit" class="modal-form">
        <div class="form-grid">
          <div class="form-field">
            <label class="form-label">角色名称</label>
            <input
              v-model="formData.name"
              type="text"
              class="form-input"
              placeholder="角色全称"
              required
            />
          </div>

          <div class="form-field">
            <label class="form-label">大概年龄</label>
            <input
              v-model="formData.age"
              type="text"
              class="form-input"
              placeholder="例如：21岁"
            />
          </div>

          <div class="form-field">
            <label class="form-label">性别</label>
            <select v-model="formData.gender" class="form-input">
              <option value="male">男性角色</option>
              <option value="female">女性角色</option>
              <option value="other">其他/非人类</option>
            </select>
          </div>

          <div class="form-field">
            <label class="form-label">音色倾向</label>
            <input
              v-model="formData.voiceTone"
              type="text"
              class="form-input"
              placeholder="例如：稳重、磁性"
            />
          </div>
        </div>

        <div class="form-field">
          <label class="form-label">核心人格 (逗号分隔)</label>
          <input
            v-model="personalityInput"
            type="text"
            class="form-input"
            placeholder="勇敢, 乐观, 坚毅..."
          />
        </div>

        <div class="form-field">
          <label class="form-label">外貌/绘画提示词 (Visual Prompt)</label>
          <textarea
            v-model="formData.appearance"
            class="form-textarea"
            placeholder="描述角色的体貌特征，将直接影响AI生成效果..."
            rows="4"
          ></textarea>
        </div>

        <div class="form-field">
          <label class="form-label">背景故事/身份说明</label>
          <textarea
            v-model="formData.description"
            class="form-textarea"
            placeholder="简述角色的世界观背景..."
            rows="4"
          ></textarea>
        </div>

        <div class="form-actions">
          <button
            type="button"
            @click="$emit('close')"
            class="cancel-button"
          >
            放弃修改
          </button>
          <button type="submit" class="submit-button" :disabled="loading">
            {{ loading ? '保存中...' : '同步至云端' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  editingCharacter: {
    type: Object,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'submit'])

const formData = ref({
  name: '',
  age: '',
  gender: 'male',
  description: '',
  personality: [],
  appearance: '',
  voiceTone: '',
  voiceActor: '',
  voiceSample: '',
  clothingStyle: '',
  style: ''
})

const personalityInput = ref('')

// 监听编辑角色变化，初始化表单
watch(
  () => props.editingCharacter,
  (char) => {
    if (char) {
      formData.value = {
        name: char.name || '',
        age: char.age || '',
        gender: char.gender || 'male',
        description: char.description || '',
        personality: [],
        appearance: char.appearance || '',
        voiceTone: char.voiceTone || '',
        voiceActor: char.voiceActor || '',
        voiceSample: char.voiceSample || '',
        clothingStyle: char.clothingStyle || '',
        style: char.style || ''
      }

      // 解析 personality
      if (char.personality) {
        try {
          const parsed =
            typeof char.personality === 'string'
              ? JSON.parse(char.personality)
              : char.personality
          formData.value.personality = Array.isArray(parsed) ? parsed : []
          personalityInput.value = Array.isArray(parsed)
            ? parsed.join(', ')
            : ''
        } catch {
          personalityInput.value = ''
        }
      } else {
        personalityInput.value = ''
      }
    } else {
      // 重置表单
      formData.value = {
        name: '',
        age: '',
        gender: 'male',
        description: '',
        personality: [],
        appearance: '',
        voiceTone: '',
        voiceActor: '',
        voiceSample: '',
        clothingStyle: '',
        style: ''
      }
      personalityInput.value = ''
    }
  },
  { immediate: true }
)

// 监听 visible 变化，重置表单
watch(
  () => props.visible,
  (newVal) => {
    if (!newVal) {
      personalityInput.value = ''
    }
  }
)

const handleSubmit = () => {
  // 解析 personality
  const personality = personalityInput.value
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p.length > 0)

  const submitData = {
    ...formData.value,
    personality: JSON.stringify(personality)
  }

  emit('submit', submitData)
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(4px);
}

.modal-container {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 24px;
  width: 100%;
  max-width: 640px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  animation: zoomIn 0.2s;
}

@keyframes zoomIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.modal-header {
  padding: 20px 32px;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(248, 250, 252, 0.3);
}

.modal-title {
  font-size: 20px;
  font-weight: 900;
  color: #0f172a;
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0;
}

.title-icon {
  padding: 8px;
  background: #6366f1;
  color: white;
  border-radius: 12px;
  box-shadow: 0 10px 15px -3px rgba(99, 102, 241, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
}

.title-icon svg {
  width: 18px;
  height: 18px;
}

.close-button {
  padding: 8px;
  color: #64748b;
  background: none;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-button:hover {
  background: #f1f5f9;
}

.close-button svg {
  width: 24px;
  height: 24px;
}

.modal-form {
  flex: 1;
  overflow-y: auto;
  padding: 32px;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-field.full-width {
  grid-column: 1 / -1;
}

.form-label {
  font-size: 10px;
  font-weight: 900;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 1.6px;
  padding-left: 4px;
}

.form-input,
.form-textarea {
  width: 100%;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 12px;
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
  transition: all 0.2s;
  outline: none;
  font-family: inherit;
}

.form-input:focus,
.form-textarea:focus {
  ring: 2px;
  ring-color: rgba(99, 102, 241, 0.2);
  border-color: #6366f1;
}

.form-textarea {
  min-height: 100px;
  resize: none;
}

.form-input::placeholder,
.form-textarea::placeholder {
  color: #94a3b8;
  font-weight: 400;
}

.form-actions {
  display: flex;
  gap: 16px;
  padding-top: 24px;
  margin-top: 16px;
  border-top: 1px solid #f1f5f9;
}

.cancel-button,
.submit-button {
  flex: 1;
  padding: 16px;
  border-radius: 16px;
  font-weight: 900;
  letter-spacing: -0.5px;
  transition: all 0.2s;
  border: none;
  cursor: pointer;
  font-size: 14px;
}

.cancel-button {
  background: #f1f5f9;
  color: #475569;
}

.cancel-button:hover {
  background: #e2e8f0;
}

.submit-button {
  background: #6366f1;
  color: white;
  box-shadow: 0 20px 25px -5px rgba(99, 102, 241, 0.3);
}

.submit-button:hover:not(:disabled) {
  background: #4f46e5;
}

.submit-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>

