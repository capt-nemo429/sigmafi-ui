<script setup lang="ts">
import { nextTick, onDeactivated, onMounted, reactive, ref, watch } from "vue";

// props
const props = defineProps({ menuClass: String, rootClass: String });

// refs
const root = ref<Node>();
const menu = ref<HTMLElement>();

// state
const state = reactive({
  active: false,
  position: "dropdown-bottom"
});

// watches
watch(
  () => state.active,
  () => calcPosition()
);

// functions
function toggle() {
  state.active = !state.active;
}

function closeMenu(e: Event): void {
  if (!state.active || !root.value) {
    return;
  }

  if (!root.value.contains(e.target as Node)) {
    state.active = false;
  }
}

function calcPosition() {
  if (!menu.value) {
    return;
  }

  const clientHeight = root.value?.parentElement?.clientHeight || window.innerHeight;
  nextTick(() => {
    if (!menu.value) {
      return;
    }

    const rect = menu.value.getBoundingClientRect();
    const isVerticallyInViewport = rect.top >= 0 && rect.bottom <= clientHeight;

    state.position = isVerticallyInViewport ? "dropdown-bottom" : "dropdown-top";
  });
}

// hooks
onMounted(() => {
  addEventListener("click", closeMenu);
});

onDeactivated(() => {
  removeEventListener("click", closeMenu);
});
</script>

<template>
  <div ref="root" class="dropdown" :class="[state.position, props.rootClass]" @click="toggle()">
    <slot />

    <div v-show="state.active" class="dropdown-content" :class="props.menuClass">
      <ul ref="menu" tabindex="0" class="menu p-2 mt-1 shadow bg-base-300 rounded-box">
        <div class="h-40 overflow-y-auto">
          <slot name="menu" />
        </div>
      </ul>
    </div>
  </div>
</template>
