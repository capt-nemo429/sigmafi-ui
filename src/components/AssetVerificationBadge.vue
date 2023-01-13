<script setup lang="ts">
import SigTooltip from "./SigTooltip.vue";
import { verifiedToken } from "@/utils";
import { isDefined } from "@fleet-sdk/common";
import { AlertTriangleIcon } from "@zhuowenli/vue-feather-icons";

defineProps({ tokenId: String, badgeClass: String });
</script>

<template>
  <sig-tooltip v-if="isDefined(tokenId) && !verifiedToken(tokenId)" tip="Unverified token">
    <alert-triangle-icon :class="badgeClass" class="text-orange-400 dark:text-yellow-500" />
  </sig-tooltip>
</template>
