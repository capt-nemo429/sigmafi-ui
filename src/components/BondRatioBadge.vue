<script setup lang="ts">
import { AlertTriangleIcon, CheckCircleIcon } from "@zhuowenli/vue-feather-icons";
import BigNumber from "bignumber.js";
import { PropType } from "vue";
import SigTooltip from "./SigTooltip.vue";
import { useChainStore } from "@/stories";
import { formatBigNumber } from "@/utils";

const chain = useChainStore();
defineProps({
  ratio: { type: Object as PropType<BigNumber>, default: undefined }
});
</script>

<template>
  <sig-tooltip v-if="ratio && !chain.loading" tip="Collateral/Loan ratio" class="tooltip-left">
    <span
      :class="{
        'badge-error': ratio.lt(100),
        'badge-warning': ratio.lt(150),
        'badge-success': ratio.gt(150)
      }"
      class="badge gap-1"
    >
      <alert-triangle-icon v-if="ratio.lt(100)" class="h-3" />
      <check-circle-icon v-else-if="ratio.gte(200)" class="h-3" />
      {{ formatBigNumber(ratio, 2) }}%</span
    >
  </sig-tooltip>
</template>
