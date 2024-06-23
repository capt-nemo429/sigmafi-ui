<script setup lang="ts">
import BigNumber from "bignumber.js";
import { computed, PropType } from "vue";
import { useChainStore } from "@/stories";
import { AssetInfo } from "@/types";
import { formatBigNumber } from "@/utils";

const chain = useChainStore();

const props = defineProps({
  asset: { type: Object as PropType<Readonly<AssetInfo<BigNumber>>>, default: undefined },
  customClass: { type: String, default: "" }
});

const price = computed(() => {
  if (!props.asset || !chain.priceRates[props.asset.tokenId]?.fiat) {
    return undefined;
  }

  return props.asset.amount.multipliedBy(chain.priceRates[props.asset.tokenId]?.fiat || 0);
});
</script>

<template>
  <div
    class="text-xs font-normal text-base-content opacity-60 min-w-min skeleton whitespace-nowrap"
    :class="customClass"
  >
    <span v-if="!asset" :class="customClass" class="skeleton-placeholder">loading...</span>
    <span v-else-if="!asset.metadata?.type">≈{{ formatBigNumber(price, 2) }} USD</span>
  </div>
</template>
