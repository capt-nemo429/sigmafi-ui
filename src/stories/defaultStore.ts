import { defineStore, acceptHMRUpdate } from "pinia";
import { computed, ref } from "vue";
import { getCurrentTheme, setTheme } from "../utils";

export const useDefaultStore = defineStore("default", () => {
  // state
  const currentTheme = ref<"dark" | "light">(getCurrentTheme());
  const walletContext = ref<typeof ergo>();

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
  import.meta.hot.accept(acceptHMRUpdate(useDefaultStore, import.meta.hot));
}
