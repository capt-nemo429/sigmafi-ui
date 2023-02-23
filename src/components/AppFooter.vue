<script setup lang="ts">
import { useProgrammatic } from "@oruga-ui/oruga-next";
import { onMounted } from "vue";
import { useUIStore } from "@/stories";
import KYAView from "@/views/KYAView.vue";
const { oruga } = useProgrammatic();

const store = useUIStore();

onMounted(() => {
  if (!store.isKYAAccepted.value) {
    openKYAModal();
  }
});

function openKYAModal() {
  oruga.modal.open({
    component: KYAView,
    canCancel: store.isKYAAccepted.value
  });
}
</script>

<template>
  <footer class="footer p-10 bg-base-300 bg-opacity-50 z-10 text-base-content">
    <div>
      <img src="../assets/nautilus.svg" width="50" height="50" />
      <p>Nautilus Team</p>
      <p class="opacity-70">Ad augusta per angusta</p>
    </div>
    <div>
      <span class="footer-title">Open Source</span>
      <a
        href="https://github.com/K-Singh/Sigma-Finance"
        class="link link-hover"
        target="_blank"
        rel="noopener noreferrer"
        >Contracts</a
      >
      <a
        href="https://github.com/capt-nemo429/sigmafi-ui"
        class="link link-hover"
        target="_blank"
        rel="noopener noreferrer"
        >User Interface</a
      >
      <a
        href="https://github.com/capt-nemo429/sigmafi-ui/blob/main/src/offchain/plugins.ts"
        class="link link-hover"
        target="_blank"
        rel="noopener noreferrer"
        >Off-chain Plugins</a
      >
    </div>
    <div>
      <span class="footer-title">Social</span>
      <a
        class="link link-hover"
        target="_blank"
        rel="noopener noreferrer"
        href="https://twitter.com/nautiluswallet"
        >Twitter</a
      >
      <a
        href="https://github.com/capt-nemo429"
        class="link link-hover"
        target="_blank"
        rel="noopener noreferrer"
        >GitHub</a
      >
    </div>
    <div>
      <span class="footer-title">KYA</span>
      <a class="link link-hover" @click="openKYAModal">Know Your Assumptions</a>
    </div>
  </footer>
</template>
