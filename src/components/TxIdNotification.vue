<script setup lang="ts">
import { EXPLORER_URL } from "@/constants";

defineProps({ txId: { type: String, required: true } });
</script>

<template>
  <div class="toast toast-top toast-center min-w-max">
    <div class="alert alert-success gap-8">
      Transaction submitted!
      <a
        class="btn btn-ghost hover:bg-opacity-50"
        :href="`${EXPLORER_URL}en/transactions/${txId}`"
        target="_blank"
        >View on Explorer</a
      >
    </div>
  </div>
</template>
