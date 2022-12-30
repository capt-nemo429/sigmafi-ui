<script setup lang="ts">
import AppHeader from "./components/AppHeader.vue";
import AppFooter from "./components/AppFooter.vue";
import BondsMarketView from "./views/bonds/BondsMarketView.vue";
</script>

<template>
  <div class="bg-gradient-to-tr from-fuchsia-400 to-blue-400 dark:from-purple-800 dark:to-cyan-800">
    <app-header />

    <main class="py-8 px-4 md:px-8 lg:px-16">
      <bonds-market-view />
    </main>

    <app-footer />
  </div>
</template>
