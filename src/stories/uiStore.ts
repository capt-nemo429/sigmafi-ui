import { defineStore, acceptHMRUpdate } from "pinia";
import { computed, ref } from "vue";
import { getCurrentTheme, setTheme } from "@/utils";

export const useUIStore = defineStore("ui", () => {
  // state
  const currentTheme = ref<"dark" | "light">(getCurrentTheme());

  // computed
  const theme = computed(() => currentTheme);

  // actions
  function toggleTheme() {
    if (currentTheme.value === "dark") {
      currentTheme.value = "light";
    } else {
      currentTheme.value = "dark";
    }

    setTheme(currentTheme.value);
  }

  return { theme, toggleTheme };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useUIStore, import.meta.hot));
}
