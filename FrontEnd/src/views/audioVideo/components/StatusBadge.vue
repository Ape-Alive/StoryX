<template>
  <div :class="['status-badge', `status-badge-${status}`]">
    <component
      :is="config.icon"
      :size="10"
      :class="{ 'status-icon-spin': status === 'processing' }"
    />
    {{ config.label }}
  </div>
</template>

<script setup>
import { computed, h } from "vue";
import { IconCheckCircle, IconLoading } from "@arco-design/web-vue/es/icon";

const props = defineProps({
  status: {
    type: String,
    default: "pending",
    validator: (value) =>
      ["completed", "processing", "pending"].includes(value),
  },
  progress: {
    type: Number,
    default: 0,
  },
});

// 时钟图标组件（SVG）
const ClockIcon = {
  setup(props, { attrs }) {
    return () =>
      h(
        "svg",
        {
          ...attrs,
          viewBox: "0 0 24 24",
          fill: "none",
          stroke: "currentColor",
          "stroke-width": "2",
          "stroke-linecap": "round",
          "stroke-linejoin": "round",
          style: { width: attrs.size || "10px", height: attrs.size || "10px" },
        },
        [
          h("circle", { cx: "12", cy: "12", r: "10" }),
          h("polyline", { points: "12 6 12 12 16 14" }),
        ]
      );
  },
};

const config = computed(() => {
  const configs = {
    completed: {
      icon: IconCheckCircle,
      label: "已就绪",
    },
    processing: {
      icon: IconLoading,
      label: `${props.progress}%`,
    },
    pending: {
      icon: ClockIcon,
      label: "等待中",
    },
  };
  return configs[props.status] || configs.pending;
});
</script>

<style scoped>
.status-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 10px;
  border-radius: 9999px;
  border: 1px solid;
  font-weight: 700;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.status-badge-completed {
  background-color: #ecfdf5;
  color: #059669;
  border-color: #d1fae5;
}

.status-badge-processing {
  background-color: #eff6ff;
  color: #2563eb;
  border-color: #bfdbfe;
}

.status-badge-pending {
  background-color: #f8fafc;
  color: #64748b;
  border-color: #f1f5f9;
}

.status-icon-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
