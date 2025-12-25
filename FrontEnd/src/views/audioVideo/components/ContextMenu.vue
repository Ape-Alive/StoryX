<template>
  <div
    v-if="visible"
    class="context-menu"
    :style="{ top: `${position.y}px`, left: `${position.x}px` }"
    @click.stop
  >
    <div class="context-menu-header">
      <span class="context-menu-title">
        {{ type === "shot" ? item?.shotId || "SHOT" : "CLIP ACTION" }}
      </span>
      <button @click="emit('close')" class="close-btn">
        <ScissorsIcon :size="10" class="scissors-icon" />
      </button>
    </div>
    <button
      @click="handleEdit"
      class="context-menu-item context-menu-item-blue"
    >
      <IconEdit :size="14" class="item-icon item-icon-blue" /> 编辑内容描述
    </button>
    <template v-if="showInsertOptions">
      <button
        @click="handleInsertBefore"
        class="context-menu-item context-menu-item-emerald"
      >
        <IconArrowLeft :size="14" class="item-icon item-icon-emerald" />
        向前插入镜头
      </button>
      <button
        @click="handleInsertAfter"
        class="context-menu-item context-menu-item-emerald"
      >
        <IconArrowRight :size="14" class="item-icon item-icon-emerald" />
        向后插入镜头
      </button>
    </template>
    <div class="context-menu-divider"></div>
    <button
      @click="handleDelete"
      class="context-menu-item context-menu-item-red"
    >
      <IconDelete :size="14" class="item-icon item-icon-red" /> 删除此分段
    </button>
  </div>
</template>

<script setup>
import { watch, h, computed } from "vue";
import {
  IconEdit,
  IconArrowLeft,
  IconArrowRight,
  IconDelete,
} from "@arco-design/web-vue/es/icon";

// 剪刀图标 SVG
const ScissorsIcon = {
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
          h("circle", { cx: "6", cy: "6", r: "3" }),
          h("circle", { cx: "6", cy: "18", r: "3" }),
          h("line", { x1: "6", y1: "9", x2: "6", y2: "15" }),
          h("line", { x1: "20", y1: "4", x2: "8.12", y2: "15.88" }),
          h("line", { x1: "14.47", y1: "14.48", x2: "20", y2: "20" }),
          h("line", { x1: "20", y1: "8", x2: "8.12", y2: "19.88" }),
        ]
      );
  },
};

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  position: {
    type: Object,
    default: () => ({ x: 0, y: 0 }),
  },
  item: {
    type: Object,
    default: null,
  },
  type: {
    type: String,
    default: "",
  },
});

// 计算是否显示插入选项（仅对 shot 类型显示）
const showInsertOptions = computed(() => {
  return props.type === "shot";
});

const emit = defineEmits([
  "edit",
  "insert-before",
  "insert-after",
  "delete",
  "close",
]);

const handleEdit = () => {
  emit("edit", props.item);
  emit("close");
};

const handleInsertBefore = () => {
  emit("insert-before", props.item);
  emit("close");
};

const handleInsertAfter = () => {
  emit("insert-after", props.item);
  emit("close");
};

const handleDelete = () => {
  emit("delete", props.item);
  emit("close");
};

// 点击外部关闭菜单
watch(
  () => props.visible,
  (newVal) => {
    if (newVal) {
      const handleClick = (e) => {
        if (!e.target.closest(".context-menu")) {
          emit("close");
          document.removeEventListener("click", handleClick);
        }
      };
      setTimeout(() => {
        document.addEventListener("click", handleClick);
      }, 0);
    }
  }
);
</script>

<style scoped>
.context-menu {
  position: fixed;
  background-color: #ffffff;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 8px 0;
  width: 208px;
  z-index: 200;
  animation: zoomIn 0.15s ease-out;
  backdrop-filter: blur(12px);
}

.context-menu-header {
  padding: 8px 16px;
  border-bottom: 1px solid #f8fafc;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.context-menu-title {
  font-size: 9px;
  font-weight: 900;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.close-btn {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.scissors-icon {
  color: #cbd5e1;
  transition: color 0.2s;
}

.close-btn:hover .scissors-icon {
  color: #94a3b8;
}

.context-menu-item {
  width: 100%;
  padding: 10px 16px;
  text-align: left;
  font-size: 12px;
  font-weight: 700;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 12px;
  border: none;
  background: none;
  cursor: pointer;
}

.context-menu-item-blue:hover {
  background-color: #eff6ff;
  color: #1d4ed8;
}

.context-menu-item-emerald:hover {
  background-color: #ecfdf5;
  color: #059669;
}

.context-menu-item-red {
  color: #dc2626;
}

.context-menu-item-red:hover {
  background-color: #fef2f2;
  color: #b91c1c;
}

.item-icon {
  flex-shrink: 0;
}

.item-icon-blue {
  color: #3b82f6;
}

.item-icon-emerald {
  color: #10b981;
}

.item-icon-red {
  color: #dc2626;
}

.context-menu-divider {
  height: 1px;
  background-color: #f1f5f9;
  margin: 4px 8px;
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
</style>
