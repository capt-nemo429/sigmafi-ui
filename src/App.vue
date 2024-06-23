<script setup lang="ts">
import { BoxIcon } from "@zhuowenli/vue-feather-icons";
import AppFooter from "./components/AppFooter.vue";
import AppHeader from "./components/AppHeader.vue";
import { useChainStore } from "./stories";

const chain = useChainStore();
</script>

<template>
  <div
    class="min-h-screen flex flex-col justify-between bg-gradient-to-tl from-slate-300 to-slate-200 dark:from-slate-700 dark:to-slate-600"
  >
    <app-header />

    <main class="flex-grow py-8 px-4 md:px-8 lg:px-16">
      <router-view />
    </main>

    <app-footer />

    <div
      v-if="chain.height"
      class="flex items-center gap-1 z-50 text-sm cursor-default text-accent-content fixed right-3 bottom-2 drop-shadow-md opacity-40 hover:opacity-100"
    >
      <box-icon /> <span>{{ chain.height.toLocaleString() }}</span>
    </div>
  </div>
</template>
