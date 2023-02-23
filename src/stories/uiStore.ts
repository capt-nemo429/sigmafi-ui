import { acceptHMRUpdate, defineStore } from "pinia";
import { computed, onMounted, ref } from "vue";
import { getCurrentTheme, setTheme } from "@/utils";

export const useUIStore = defineStore("ui", () => {
  // state
  const currentTheme = ref<"dark" | "light">(getCurrentTheme());
  const _isKyaAccepted = ref(false);

  onMounted(() => {
    _isKyaAccepted.value = localStorage.getItem("KYAAccepted") === "true";
  });

  // computed
  const theme = computed(() => currentTheme);
  const isDark = computed(() => currentTheme.value === "dark");
  const isKYAAccepted = computed(() => _isKyaAccepted);

  // actions
  function setAcceptedKYA() {
    localStorage.setItem("KYAAccepted", "true");
    _isKyaAccepted.value = true;
  }

  function toggleTheme() {
    if (currentTheme.value === "dark") {
      currentTheme.value = "light";
    } else {
      currentTheme.value = "dark";
    }

    setTheme(currentTheme.value);
  }

  return { theme, isDark, isKYAAccepted, toggleTheme, setAcceptedKYA };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useUIStore, import.meta.hot));
}
