<script setup lang="ts">
import { BoxIcon } from "@zhuowenli/vue-feather-icons";
import AppFooter from "./components/AppFooter.vue";
import AppHeader from "./components/AppHeader.vue";
import { useChainStore } from "./stories";

const chain = useChainStore();
</script>

<template>
  <div class="bg-gradient-to-tr from-fuchsia-400 to-blue-400 dark:from-purple-800 dark:to-cyan-800">
    <app-header />

    <main class="py-8 px-4 md:px-8 lg:px-16">
      <router-view />
    </main>

    <app-footer />
    <div
      v-if="chain.height"
      class="flex items-center gap-1 text-sm cursor-default text-primary fixed right-3 bottom-2 drop-shadow-md opacity-50 hover:opacity-100"
    >
      <box-icon /> <span>{{ chain.height.toLocaleString() }}</span>
    </div>
  </div>
</template>
